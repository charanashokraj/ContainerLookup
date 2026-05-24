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
SINAY_TIMEOUT = 90                    # Sinay free-tier CT lookups can be slow

# ── Carrier SCAC code map (passed to Sinay for faster / more accurate results) ─
CARRIER_SCAC: dict[str, str] = {
    "maersk":        "MAEU",
    "anl":           "ANNU",
    "cma":           "CMDU",
    "cma-cgm":       "CMDU",
    "cmacgm":        "CMDU",
    "hapag":         "HLCU",
    "hlag":          "HLCU",
    "hlcl":          "HLCU",
    "msc":           "MSCU",
    "mediterranean": "MSCU",
    "one":           "ONEY",
    "ocean network": "ONEY",
    "evergreen":     "EGLV",
    "cosco":         "COSU",
    "yang ming":     "YMLU",
    "yangming":      "YMLU",
    "pil":           "PCIU",
    "pacific int":   "PCIU",
    "zim":           "ZIMU",
    "hmm":           "HDMU",
    "hyundai":       "HDMU",
    "wan hai":       "WHLC",
    "ts lines":      "TSPU",
}

def _scac(carrier: str) -> str | None:
    c = carrier.lower()
    for key, code in CARRIER_SCAC.items():
        if key in c:
            return code
    return None

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
    """
    State-machine normalizer — processes events in order to avoid confusing
    outbound pre-loading events (gate-out empty, gate-in full at origin) with
    inbound events (discharge, release, empty-return at destination).

    Key rule: release can only occur AFTER discharge; empty-return can only
    occur AFTER release (or after discharge if description explicitly says empty).
    """
    result = {
        "dischargeDate": None, "releaseDate": None, "emptyReturnDate": None,
        "currentStatus": None, "lastEventDescription": None,
        "lastEventDate": None, "eta": None,
    }
    seen_discharge = False
    seen_release   = False
    last_actual_desc = None
    last_actual_date = None

    for ev in events:
        raw_desc = (ev.get("description") or ev.get("eventName") or
                    ev.get("equipmentEventTypeCode") or "")
        desc = raw_desc.lower()
        code = (ev.get("equipmentEventTypeCode") or "").upper()
        raw  = ev.get("eventDateTime") or ev.get("date") or ev.get("eventDate") or ""
        date = raw[:10] if raw else ""
        is_actual = ev.get("isActual", ev.get("actual", True))  # default True for DCSA events

        if any(a in desc for a in AMBIGUOUS_KW):
            continue

        # ── Discharge ──────────────────────────────────────────────────────────
        if not result["dischargeDate"]:
            if code in DISCHARGE_CODES or any(k in desc for k in DISCHARGE_KW):
                result["dischargeDate"] = date
                seen_discharge = True

        # ── Release: ONLY after discharge ──────────────────────────────────────
        # Prevents "gate out empty" (before loading) from being misread as release
        if seen_discharge and not result["releaseDate"]:
            is_empty_event = "empty" in desc
            if not is_empty_event:
                if code in RELEASE_CODES or any(k in desc for k in RELEASE_KW):
                    result["releaseDate"] = date
                    seen_release = True

        # ── Empty return ───────────────────────────────────────────────────────
        # Two valid cases:
        #   1. Description explicitly says "empty" + gate-in code → always safe
        #   2. Gate-in code after a release (sequence-based)
        if not result["emptyReturnDate"]:
            is_empty_event = "empty" in desc
            if is_empty_event and (code in EMPTY_CODES or any(k in desc for k in EMPTY_KW)):
                result["emptyReturnDate"] = date
            elif seen_release and (code in EMPTY_CODES or any(k in desc for k in EMPTY_KW)):
                result["emptyReturnDate"] = date

        # ── Track last ACTUAL event for current status display ─────────────────
        if is_actual:
            last_actual_desc = raw_desc
            last_actual_date = date

    # Use last actual event for display; fall back to last event overall
    if last_actual_desc:
        result["lastEventDescription"] = last_actual_desc
        result["lastEventDate"]        = last_actual_date
        result["currentStatus"]        = last_actual_desc
    elif events:
        last = events[-1]
        raw_desc = (last.get("description") or last.get("eventName") or
                    last.get("equipmentEventTypeCode") or "")
        raw  = last.get("eventDateTime") or last.get("date") or last.get("eventDate") or ""
        result["lastEventDescription"] = raw_desc
        result["lastEventDate"]        = raw[:10] if raw else ""
        result["currentStatus"]        = raw_desc

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

def _track_sinay(booking, container, api_key, carrier=""):
    """
    API ref: https://api.sinay.ai/doc/index.html?urls.primaryName=Container+tracking+API+v2
    Required header:  API_KEY
    Required param:   shipmentNumber  (BL/BK/CT number)
    Optional param:   shipmentType    (BL | BK | CT)
    Optional param:   sealine         (4-letter SCAC — strongly recommended for speed)
    """
    hdrs    = {"API_KEY": api_key, "Accept": "application/json"}
    scac    = _scac(carrier)
    base    = "https://api.sinay.ai/container-tracking/api/v2/shipment"

    for stype, val in [("CT", container), ("BL", booking), ("BK", booking)]:
        if not val:
            continue
        params: dict = {
            "shipmentNumber": val,   # ← correct param name (was "number")
            "shipmentType":   stype,
            "route":          "false",   # skip route/AIS data — faster
            "ais":            "false",
        }
        if scac:
            params["sealine"] = scac

        try:
            r = requests.get(base, headers=hdrs, params=params, timeout=SINAY_TIMEOUT)
            if not r.ok:
                print(f"  [Sinay] {stype} {val}: HTTP {r.status_code} — {r.text[:200]}",
                      file=sys.stderr)
                continue

            data = r.json()
            print(f"  [Sinay] {stype} {val}: HTTP 200, "
                  f"containers={len(data.get('containers', []))}, "
                  f"status={data.get('metadata', {}).get('shippingStatus', '?')}",
                  file=sys.stderr)

            # Events are nested: containers[].events[]
            raw_events = []
            for cont in data.get("containers", []):
                raw_events.extend(cont.get("events", []))

            # Map to our normalizer's expected shape
            # isActual=False events are predictions (e.g. estimated vessel arrival)
            # — include the flag so the normalizer skips them for currentStatus
            mapped = [
                {
                    "description":            ev.get("description", ""),
                    "equipmentEventTypeCode": ev.get("eventCode", ""),
                    "eventDateTime":          ev.get("date", ""),
                    "isActual":               ev.get("isActual", True),
                }
                for ev in raw_events
            ]

            norm = normalize_events(mapped)

            # ETA from route.pod (prefer estimated over actual)
            route = data.get("route") or {}
            pod   = route.get("pod") or {}
            if pod.get("date") and not norm["eta"]:
                norm["eta"] = str(pod["date"])[:10]

            # Fallback: shippingStatus from metadata
            meta = data.get("metadata") or {}
            if not norm["currentStatus"] and meta.get("shippingStatus"):
                norm["currentStatus"] = meta["shippingStatus"].replace("_", " ").title()

            # ── Location & vessel from last actual event ───────────────────────
            current_location = None
            vessel_name      = None
            pol_name         = None
            pod_name         = None

            for ev in reversed(raw_events):
                if not ev.get("isActual", True):
                    continue
                loc = ev.get("location") or {}
                city    = loc.get("name", "")
                country = loc.get("country", "")
                if city and not current_location:
                    current_location = f"{city}, {country}" if country else city
                vessel = ev.get("vessel") or {}
                if vessel.get("name") and not vessel_name:
                    vessel_name = vessel["name"]
                if current_location and vessel_name:
                    break

            # POL / POD from route object (available when route=true)
            pol_obj = (route.get("pol") or {}).get("location") or {}
            pod_obj = (route.get("pod") or {}).get("location") or {}
            if pol_obj.get("name"):
                pol_name = pol_obj["name"]
            if pod_obj.get("name"):
                pod_name = pod_obj["name"]

            norm["currentLocation"] = current_location
            norm["vesselName"]      = vessel_name
            norm["portOfLoading"]   = pol_name
            norm["portOfDischarge"] = pod_name

            return norm

        except Exception as e:
            print(f"  [Sinay] {stype} {val}: {e}", file=sys.stderr)

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

    # Universal Sinay fallback (pass carrier so it can include the SCAC code)
    if data is None and creds.get("sinay_key"):
        data, source = _track_sinay(booking, container, creds["sinay_key"], carrier), "Sinay API"

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
