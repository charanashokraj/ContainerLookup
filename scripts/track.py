"""
Automated Container Tracking Script
Reads data/containers.json → queries carrier APIs IN PARALLEL → writes public/auto-tracking.json.

Rate-limit strategy (4-hour polling):
  - Containers checked in the last 3h are SKIPPED (unless FORCE_ALL=true)
  - Completed containers are always skipped
  - All carrier API calls run in parallel (ThreadPoolExecutor)

API support:
  Carrier               | Secret(s)
  ----------------------|------------------------------------------
  Maersk / ANL          | MAERSK_CLIENT_ID + MAERSK_CLIENT_SECRET
  CMA CGM / ANL         | CMACGM_API_KEY
  Hapag-Lloyd           | HLAG_CLIENT_ID + HLAG_CLIENT_SECRET
  MSC                   | MSC_API_KEY
  ALL others (170+)     | SINAY_API_KEY  (one key covers everything)
"""

import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta
from pathlib import Path
import requests

# ── Config ─────────────────────────────────────────────────────────────────────
SKIP_IF_CHECKED_WITHIN_HOURS = 3      # skip containers checked less than 3h ago
MAX_PARALLEL_WORKERS = 10             # parallel API calls
REQUEST_TIMEOUT = 30

# ── DCSA event code tables ─────────────────────────────────────────────────────
DISCHARGE_CODES  = {"DISC"}
RELEASE_CODES    = {"GOUT"}
EMPTY_CODES      = {"GTIN"}

DISCHARGE_KW  = ["discharged", "import discharged", "discharged at pod",
                  "unloaded", "vessel discharged", "arrival at pod", "disc"]
RELEASE_KW    = ["gate out", "full container gate out", "picked up",
                  "import release", "container released", "full out", "gout"]
EMPTY_KW      = ["empty return", "empty returned", "empty container returned",
                  "gate in empty", "empty in", "return empty", "gtin"]
AMBIGUOUS_KW  = ["available for delivery", "available", "customs cleared"]


def normalize_events(events: list) -> dict:
    result = {
        "dischargeDate": None, "releaseDate": None, "emptyReturnDate": None,
        "currentStatus": None, "lastEventDescription": None,
        "lastEventDate": None, "eta": None,
    }
    for ev in events:
        desc = (ev.get("description") or ev.get("eventName") or
                ev.get("equipmentEventTypeCode") or "").lower()
        code = (ev.get("equipmentEventTypeCode") or "").upper()
        raw  = ev.get("eventDateTime") or ev.get("date") or ev.get("eventDate") or ""
        date = raw[:10] if raw else ""

        if any(a in desc for a in AMBIGUOUS_KW):
            continue
        if (code in DISCHARGE_CODES or any(k in desc for k in DISCHARGE_KW)) and not result["dischargeDate"]:
            result["dischargeDate"] = date
        if (code in RELEASE_CODES or any(k in desc for k in RELEASE_KW)) and not result["releaseDate"]:
            result["releaseDate"] = date
        if (code in EMPTY_CODES or any(k in desc for k in EMPTY_KW)) and not result["emptyReturnDate"]:
            result["emptyReturnDate"] = date

    if events:
        last = events[-1]
        desc = (last.get("description") or last.get("eventName") or
                last.get("equipmentEventTypeCode") or "")
        raw  = last.get("eventDateTime") or last.get("date") or last.get("eventDate") or ""
        result["lastEventDescription"] = desc
        result["lastEventDate"]        = raw[:10] if raw else ""
        result["currentStatus"]        = desc
    return result


# ── Maersk ─────────────────────────────────────────────────────────────────────

def _maersk_token(cid, secret):
    try:
        r = requests.post(
            "https://api.maersk.com/oauth2/access_token",
            data={"grant_type": "client_credentials", "client_id": cid, "client_secret": secret},
            timeout=REQUEST_TIMEOUT)
        return r.json().get("access_token") if r.ok else None
    except Exception as e:
        print(f"  [Maersk] token error: {e}", file=sys.stderr)
        return None

def _track_maersk(booking, container, token):
    hdrs = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    for k, v in [("bookingReference", booking), ("containerNumber", container)]:
        if not v: continue
        try:
            r = requests.get("https://api.maersk.com/track/v2/shipments",
                             headers=hdrs, params={k: v}, timeout=REQUEST_TIMEOUT)
            if r.ok:
                ships = r.json().get("shipments", [r.json()])
                events, eta = [], None
                for s in ships:
                    events += s.get("transportEvents", s.get("events", []))
                    for f in ("estimatedTimeOfArrival", "eta", "estimatedArrival"):
                        if s.get(f) and not eta: eta = s[f][:10]
                norm = normalize_events(events)
                if eta: norm["eta"] = eta
                return norm
        except Exception as e:
            print(f"  [Maersk] {e}", file=sys.stderr)
    return None


# ── CMA CGM / ANL ──────────────────────────────────────────────────────────────

def _track_cmacgm(booking, container, api_key):
    hdrs = {"Ocp-Apim-Subscription-Key": api_key, "Accept": "application/json"}
    for k, v in [("carrierBookingReference", booking), ("equipmentReference", container)]:
        if not v: continue
        try:
            r = requests.get("https://apis.cma-cgm.net/visibility/v2/events",
                             headers=hdrs, params={k: v, "limit": 100}, timeout=REQUEST_TIMEOUT)
            if r.ok:
                events = r.json().get("events", [])
                norm = normalize_events(events)
                for ev in events:
                    if ev.get("transportEventTypeCode") == "ARRI":
                        raw = ev.get("eventDateTime", "")
                        if raw and not norm["eta"]: norm["eta"] = raw[:10]
                return norm
        except Exception as e:
            print(f"  [CMA CGM] {e}", file=sys.stderr)
    return None


# ── Hapag-Lloyd ────────────────────────────────────────────────────────────────

def _hlag_token(cid, secret):
    try:
        r = requests.post(
            "https://api.hlag.com/hlag/auth/v1/token",
            data={"grant_type": "client_credentials", "client_id": cid, "client_secret": secret},
            timeout=REQUEST_TIMEOUT)
        return r.json().get("access_token") if r.ok else None
    except Exception as e:
        print(f"  [HL] token error: {e}", file=sys.stderr)
        return None

def _track_hlag(booking, container, token):
    hdrs = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    for k, v in [("carrierBookingReference", booking), ("equipmentReference", container)]:
        if not v: continue
        try:
            r = requests.get("https://api.hlag.com/hlag/v2/events",
                             headers=hdrs, params={k: v, "limit": 100}, timeout=REQUEST_TIMEOUT)
            if r.ok:
                events = r.json().get("events", [])
                norm = normalize_events(events)
                for ev in events:
                    if (ev.get("transportEventTypeCode") == "ARRI" and
                            ev.get("eventClassifierCode") == "EST"):
                        raw = ev.get("eventDateTime", "")
                        if raw and not norm["eta"]: norm["eta"] = raw[:10]
                return norm
        except Exception as e:
            print(f"  [HL] {e}", file=sys.stderr)
    return None


# ── MSC ────────────────────────────────────────────────────────────────────────

def _track_msc(booking, container, api_key):
    hdrs = {"Ocp-Apim-Subscription-Key": api_key, "Accept": "application/json"}
    for k, v in [("carrierBookingReference", booking), ("equipmentReference", container)]:
        if not v: continue
        try:
            r = requests.get("https://api.msc.com/dpo/v2/events",
                             headers=hdrs, params={k: v, "limit": 100}, timeout=REQUEST_TIMEOUT)
            if r.ok:
                return normalize_events(r.json().get("events", []))
        except Exception as e:
            print(f"  [MSC] {e}", file=sys.stderr)
    return None


# ── Sinay (universal, 170+ carriers) ──────────────────────────────────────────

def _track_sinay(booking, container, api_key):
    hdrs = {"API_KEY": api_key, "Accept": "application/json"}
    for stype, val in [("CT", container), ("BL", booking)]:
        if not val: continue
        try:
            r = requests.get("https://api-dev.sinay.ai/container-tracking/api/v2/shipment",
                             headers=hdrs, params={"shipmentType": stype, "number": val},
                             timeout=REQUEST_TIMEOUT)
            if r.ok:
                data = r.json()
                locs = data.get("locations", data.get("events", []))
                events = [{"description": l.get("status") or l.get("eventName") or "",
                           "eventDateTime": l.get("date") or l.get("eventDate") or ""}
                          for l in locs]
                norm = normalize_events(events)
                for f in ("eta", "estimatedArrival", "estimatedTimeOfArrival"):
                    if data.get(f) and not norm["eta"]:
                        norm["eta"] = str(data[f])[:10]
                return norm
        except Exception as e:
            print(f"  [Sinay] {e}", file=sys.stderr)
    return None


# ── Carrier router ─────────────────────────────────────────────────────────────

def carrier_group(carrier: str) -> str:
    c = carrier.lower()
    if any(k in c for k in ("maersk",)):                    return "maersk"
    if any(k in c for k in ("anl",)):                       return "anl"
    if any(k in c for k in ("cma", "cma-cgm", "cmacgm")):  return "cmacgm"
    if any(k in c for k in ("hapag", "hlag", "hlcl")):      return "hlag"
    if any(k in c for k in ("msc", "mediterranean")):       return "msc"
    return "other"


# ── Per-container tracking function (called in parallel) ──────────────────────

def track_one(c: dict, creds: dict, tokens: dict, force_all: bool,
              existing_results: dict) -> tuple[str, dict]:
    """Returns (container_id, result_dict)."""
    cid       = c.get("id", "")
    carrier   = c.get("carrier", "")
    booking   = c.get("bookingNumber", "")
    container = c.get("containerNumber", "")
    status    = c.get("reviewStatus", "")
    label     = container or booking or cid[:8]

    # Skip completed
    if status == "Completed":
        return cid, {"autoTracked": False, "skipped": True, "reason": "Completed",
                     "checkedAt": _now(), "error": None}

    # Skip recently checked (unless force_all)
    if not force_all:
        prev = existing_results.get(cid, {})
        prev_time = prev.get("checkedAt")
        if prev_time and prev.get("autoTracked"):
            try:
                checked = datetime.fromisoformat(prev_time.rstrip("Z")).replace(tzinfo=timezone.utc)
                age_h   = (datetime.now(timezone.utc) - checked).total_seconds() / 3600
                if age_h < SKIP_IF_CHECKED_WITHIN_HOURS:
                    return cid, {**prev, "skipped": True,
                                 "reason": f"Checked {age_h:.1f}h ago (< {SKIP_IF_CHECKED_WITHIN_HOURS}h)"}
            except Exception:
                pass

    group = carrier_group(carrier)
    data, source, error = None, None, None

    # Native carrier APIs first
    if group == "maersk" and tokens.get("maersk"):
        data, source = _track_maersk(booking, container, tokens["maersk"]), "Maersk API"
    elif group in ("cmacgm", "anl") and creds.get("cmacgm_key"):
        data, source = _track_cmacgm(booking, container, creds["cmacgm_key"]), "CMA CGM API"
    elif group == "hlag" and tokens.get("hlag"):
        data, source = _track_hlag(booking, container, tokens["hlag"]), "Hapag-Lloyd API"
    elif group == "msc" and creds.get("msc_key"):
        data, source = _track_msc(booking, container, creds["msc_key"]), "MSC API"

    # Universal Sinay fallback
    if data is None and creds.get("sinay_key"):
        data, source = _track_sinay(booking, container, creds["sinay_key"]), "Sinay API"

    if data is None:
        error = ("No API credentials configured — add SINAY_API_KEY to repo secrets"
                 if not any(creds.values())
                 else f"Not found via available APIs for carrier '{carrier}'")

    if data:
        print(f"  ✓ {label} [{source}] {data.get('currentStatus') or ''}")
        return cid, {**data, "checkedAt": _now(), "source": source,
                     "autoTracked": True, "skipped": False, "error": None}
    else:
        print(f"  ✗ {label} {error}")
        return cid, {"autoTracked": False, "skipped": False, "checkedAt": _now(), "error": error}


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    Path("public").mkdir(exist_ok=True)
    force_all = os.environ.get("FORCE_ALL", "false").lower() == "true"

    containers_path = Path("data/containers.json")
    if not containers_path.exists():
        print("No data/containers.json — sync from the app first (⚡ Auto-Track → Step 1).")
        _write_results({}, 0, 0, 0)
        return

    containers = json.loads(containers_path.read_text(encoding="utf-8"))
    print(f"Loaded {len(containers)} containers (force_all={force_all})")

    # Load previous results to support skip logic
    prev_path = Path("public/auto-tracking.json")
    existing_results = {}
    if prev_path.exists():
        try:
            existing_results = json.loads(prev_path.read_text())["results"]
        except Exception:
            pass

    # Credentials
    creds = {
        "maersk_id":     os.environ.get("MAERSK_CLIENT_ID", "").strip(),
        "maersk_secret": os.environ.get("MAERSK_CLIENT_SECRET", "").strip(),
        "cmacgm_key":    os.environ.get("CMACGM_API_KEY", "").strip(),
        "hlag_id":       os.environ.get("HLAG_CLIENT_ID", "").strip(),
        "hlag_secret":   os.environ.get("HLAG_CLIENT_SECRET", "").strip(),
        "msc_key":       os.environ.get("MSC_API_KEY", "").strip(),
        "sinay_key":     os.environ.get("SINAY_API_KEY", "").strip(),
    }

    # OAuth2 tokens (sequential, then parallel tracking)
    tokens = {}
    if creds["maersk_id"] and creds["maersk_secret"]:
        print("Getting Maersk token...")
        tokens["maersk"] = _maersk_token(creds["maersk_id"], creds["maersk_secret"])
        print("  ✓" if tokens["maersk"] else "  ✗ failed")

    if creds["hlag_id"] and creds["hlag_secret"]:
        print("Getting Hapag-Lloyd token...")
        tokens["hlag"] = _hlag_token(creds["hlag_id"], creds["hlag_secret"])
        print("  ✓" if tokens["hlag"] else "  ✗ failed")

    active_apis = [k for k, v in {
        "Maersk": tokens.get("maersk"),
        "CMA CGM": creds.get("cmacgm_key"),
        "Hapag-Lloyd": tokens.get("hlag"),
        "MSC": creds.get("msc_key"),
        "Sinay (universal)": creds.get("sinay_key"),
    }.items() if v]
    print(f"Active APIs: {', '.join(active_apis) or 'NONE'}")
    print(f"Running {min(MAX_PARALLEL_WORKERS, len(containers))} parallel workers...\n")

    # ── Parallel tracking ──────────────────────────────────────────────────────
    results = {}
    tracked_count = 0
    skipped_count = 0

    with ThreadPoolExecutor(max_workers=MAX_PARALLEL_WORKERS) as executor:
        futures = {
            executor.submit(track_one, c, creds, tokens, force_all, existing_results): c
            for c in containers
        }
        for future in as_completed(futures):
            try:
                cid, result = future.result()
                results[cid] = result
                if result.get("autoTracked"):
                    tracked_count += 1
                if result.get("skipped"):
                    skipped_count += 1
            except Exception as e:
                c = futures[future]
                print(f"  ✗ {c.get('containerNumber', '?')} unexpected error: {e}", file=sys.stderr)

    _write_results(results, len(containers), tracked_count, skipped_count)
    print(f"\n✅ Done: {tracked_count} tracked, {skipped_count} skipped, "
          f"{len(containers) - tracked_count - skipped_count} errors/no-API")


def _now():
    return datetime.now(timezone.utc).isoformat()

def _write_results(results, total, tracked, skipped):
    out = {
        "updatedAt":    _now(),
        "containerCount": total,
        "trackedCount": tracked,
        "skippedCount": skipped,
        "results":      results,
    }
    Path("public/auto-tracking.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"Written → public/auto-tracking.json  ({tracked}/{total} tracked, {skipped} skipped)")


if __name__ == "__main__":
    main()
