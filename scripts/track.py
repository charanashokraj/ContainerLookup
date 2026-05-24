"""
Automated Container Tracking Script
Reads data/containers.json → queries carrier APIs → writes public/auto-tracking.json.

API support matrix:
  Carrier               | API Used              | Secret(s) needed
  ----------------------|-----------------------|----------------------------------
  Maersk / ANL          | Maersk Track v2 API   | MAERSK_CLIENT_ID + MAERSK_CLIENT_SECRET
  CMA CGM / ANL         | CMA CGM DCSA API      | CMACGM_API_KEY
  Hapag-Lloyd           | HL DCSA API           | HLAG_CLIENT_ID + HLAG_CLIENT_SECRET
  MSC                   | MSC DCSA API          | MSC_API_KEY
  ALL others (fallback) | Sinay universal API   | SINAY_API_KEY  (170+ carriers, free tier)
"""

import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
import requests

# ── DCSA equipment event codes → standardized bucket ──────────────────────────
DCSA_DISCHARGE_CODES = {"DISC"}          # discharged from vessel
DCSA_RELEASE_CODES   = {"GOUT"}          # gate out full (customer picked up)
DCSA_EMPTY_CODES     = {"GTIN"}          # gate in empty (returned)

# ── Keyword fallback (non-DCSA carriers) ──────────────────────────────────────
DISCHARGE_KW  = ["discharged", "import discharged", "discharged at pod", "unloaded",
                  "vessel discharged", "arrival at pod", "port arrival", "disc"]
RELEASE_KW    = ["gate out", "full container gate out", "picked up", "import release",
                  "container released", "full out", "delivery out", "gout"]
EMPTY_KW      = ["empty return", "empty returned", "empty container returned",
                  "gate in empty", "empty in", "return empty", "gtin"]
AMBIGUOUS_KW  = ["available for delivery", "available", "customs cleared"]


# ── Shared event normalizer (handles DCSA + keyword) ──────────────────────────

def normalize_events(events: list) -> dict:
    result = {
        "dischargeDate": None, "releaseDate": None, "emptyReturnDate": None,
        "currentStatus": None, "lastEventDescription": None,
        "lastEventDate": None, "eta": None,
    }
    for ev in events:
        desc   = (ev.get("description") or ev.get("eventName") or
                  ev.get("equipmentEventTypeCode") or "").lower()
        code   = (ev.get("equipmentEventTypeCode") or "").upper()
        raw_dt = ev.get("eventDateTime") or ev.get("date") or ev.get("eventDate") or ""
        date   = raw_dt[:10] if raw_dt else ""

        if any(a in desc for a in AMBIGUOUS_KW):
            continue

        is_disc  = code in DCSA_DISCHARGE_CODES or any(k in desc for k in DISCHARGE_KW)
        is_rel   = code in DCSA_RELEASE_CODES   or any(k in desc for k in RELEASE_KW)
        is_empty = code in DCSA_EMPTY_CODES      or any(k in desc for k in EMPTY_KW)

        if is_disc  and not result["dischargeDate"]:  result["dischargeDate"]  = date
        if is_rel   and not result["releaseDate"]:    result["releaseDate"]    = date
        if is_empty and not result["emptyReturnDate"]: result["emptyReturnDate"] = date

    if events:
        last = events[-1]
        desc = (last.get("description") or last.get("eventName") or
                last.get("equipmentEventTypeCode") or "")
        raw  = last.get("eventDateTime") or last.get("date") or last.get("eventDate") or ""
        result["lastEventDescription"] = desc
        result["lastEventDate"]        = raw[:10] if raw else ""
        result["currentStatus"]        = desc
    return result


# ──────────────────────────────────────────────────────────────────────────────
# MAERSK  (OAuth2, api.maersk.com)
# Register: https://developer.maersk.com  → free tier
# ──────────────────────────────────────────────────────────────────────────────

def _maersk_token(client_id, secret):
    try:
        r = requests.post(
            "https://api.maersk.com/oauth2/access_token",
            data={"grant_type": "client_credentials",
                  "client_id": client_id, "client_secret": secret},
            timeout=30)
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
                             headers=hdrs, params={k: v}, timeout=30)
            if r.ok:
                data = r.json()
                ships = data.get("shipments", [data])
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


# ──────────────────────────────────────────────────────────────────────────────
# CMA CGM / ANL  (DCSA v2, api-portal.cma-cgm.com)
# Register: https://api-portal.cma-cgm.com → free trial → Visibility API
# Secret:   CMACGM_API_KEY
# ──────────────────────────────────────────────────────────────────────────────

CMACGM_BASE = "https://apis.cma-cgm.net/visibility/v2"

def _track_cmacgm(booking, container, api_key):
    hdrs = {"Ocp-Apim-Subscription-Key": api_key, "Accept": "application/json"}
    for k, v in [("carrierBookingReference", booking), ("equipmentReference", container)]:
        if not v: continue
        try:
            r = requests.get(f"{CMACGM_BASE}/events", headers=hdrs,
                             params={k: v, "limit": 100}, timeout=30)
            if r.ok:
                events = r.json().get("events", [])
                norm = normalize_events(events)
                # Extract ETA from transport events
                for ev in events:
                    if ev.get("transportEventTypeCode") == "ARRI":
                        raw = ev.get("eventDateTime", "")
                        if raw and not norm["eta"]: norm["eta"] = raw[:10]
                return norm
        except Exception as e:
            print(f"  [CMA CGM] {e}", file=sys.stderr)
    return None


# ──────────────────────────────────────────────────────────────────────────────
# HAPAG-LLOYD  (DCSA v2, api.hlag.com)
# Register: https://api-portal.hlag.com  → free sandbox → subscribe to Track & Trace
# Secrets:  HLAG_CLIENT_ID + HLAG_CLIENT_SECRET
# ──────────────────────────────────────────────────────────────────────────────

def _hlag_token(client_id, secret):
    try:
        r = requests.post(
            "https://api.hlag.com/hlag/auth/v1/token",
            data={"grant_type": "client_credentials",
                  "client_id": client_id, "client_secret": secret},
            timeout=30)
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
                             headers=hdrs, params={k: v, "limit": 100}, timeout=30)
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


# ──────────────────────────────────────────────────────────────────────────────
# MSC  (DCSA v2, developerportal.msc.com)
# Register: https://developerportal.msc.com → DPO-DCSATrackAndTrace-API-V2
# Secret:   MSC_API_KEY  (Ocp-Apim-Subscription-Key header)
# ──────────────────────────────────────────────────────────────────────────────

MSC_BASE = "https://api.msc.com/dpo/v2"

def _track_msc(booking, container, api_key):
    hdrs = {"Ocp-Apim-Subscription-Key": api_key, "Accept": "application/json"}
    for k, v in [("carrierBookingReference", booking), ("equipmentReference", container)]:
        if not v: continue
        try:
            r = requests.get(f"{MSC_BASE}/events", headers=hdrs,
                             params={k: v, "limit": 100}, timeout=30)
            if r.ok:
                events = r.json().get("events", [])
                return normalize_events(events)
        except Exception as e:
            print(f"  [MSC] {e}", file=sys.stderr)
    return None


# ──────────────────────────────────────────────────────────────────────────────
# SINAY  (Universal – 170+ carriers)
# Register: https://app.sinay.ai  → free API key in minutes
# Secret:   SINAY_API_KEY
# Covers:   ONE, Evergreen, Yang Ming, COSCO, ZIM, PIL, HMM, and 160+ more
# ──────────────────────────────────────────────────────────────────────────────

SINAY_BASE = "https://api-dev.sinay.ai/container-tracking/api/v2"

def _track_sinay(booking, container, api_key):
    hdrs = {"API_KEY": api_key, "Accept": "application/json"}
    # Sinay works best with container number; try booking as BL fallback
    for stype, val in [("CT", container), ("BL", booking)]:
        if not val: continue
        try:
            r = requests.get(f"{SINAY_BASE}/shipment",
                             headers=hdrs,
                             params={"shipmentType": stype, "number": val},
                             timeout=30)
            if r.ok:
                data = r.json()
                # Sinay response: { locations: [...], eta: "...", ... }
                locations = data.get("locations", data.get("events", []))
                # Map Sinay location fields to our normalized format
                mapped_events = []
                for loc in locations:
                    mapped_events.append({
                        "description": loc.get("status") or loc.get("eventName") or "",
                        "eventDateTime": loc.get("date") or loc.get("eventDate") or "",
                    })
                norm = normalize_events(mapped_events)
                # ETA
                for f in ("eta", "estimatedArrival", "estimatedTimeOfArrival"):
                    if data.get(f) and not norm["eta"]:
                        norm["eta"] = str(data[f])[:10]
                return norm
        except Exception as e:
            print(f"  [Sinay] {e}", file=sys.stderr)
    return None


# ──────────────────────────────────────────────────────────────────────────────
# Carrier router
# ──────────────────────────────────────────────────────────────────────────────

def carrier_group(carrier: str) -> str:
    c = carrier.lower()
    if any(k in c for k in ("maersk", "maerskline")): return "maersk"
    if any(k in c for k in ("anl",)):                  return "anl"   # anl = also cmacgm
    if any(k in c for k in ("cma", "cma-cgm", "cmacgm")): return "cmacgm"
    if any(k in c for k in ("hapag", "hlag", "hlcl")): return "hlag"
    if any(k in c for k in ("msc", "mediterranean")):  return "msc"
    return "other"


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main():
    Path("public").mkdir(exist_ok=True)

    containers_path = Path("data/containers.json")
    if not containers_path.exists():
        print("No data/containers.json — sync your container list from the app first.")
        _write_results({}, 0)
        return

    containers = json.loads(containers_path.read_text(encoding="utf-8"))
    print(f"Loaded {len(containers)} containers")

    # Load credentials
    creds = {
        "maersk_id":      os.environ.get("MAERSK_CLIENT_ID", "").strip(),
        "maersk_secret":  os.environ.get("MAERSK_CLIENT_SECRET", "").strip(),
        "cmacgm_key":     os.environ.get("CMACGM_API_KEY", "").strip(),
        "hlag_id":        os.environ.get("HLAG_CLIENT_ID", "").strip(),
        "hlag_secret":    os.environ.get("HLAG_CLIENT_SECRET", "").strip(),
        "msc_key":        os.environ.get("MSC_API_KEY", "").strip(),
        "sinay_key":      os.environ.get("SINAY_API_KEY", "").strip(),
    }

    # Pre-fetch OAuth2 tokens
    tokens = {}
    if creds["maersk_id"] and creds["maersk_secret"]:
        print("Getting Maersk token...")
        tokens["maersk"] = _maersk_token(creds["maersk_id"], creds["maersk_secret"])
        print("  ✓" if tokens["maersk"] else "  ✗ failed")

    if creds["hlag_id"] and creds["hlag_secret"]:
        print("Getting Hapag-Lloyd token...")
        tokens["hlag"] = _hlag_token(creds["hlag_id"], creds["hlag_secret"])
        print("  ✓" if tokens["hlag"] else "  ✗ failed")

    # Summary of active credentials
    active = []
    if tokens.get("maersk"):  active.append("Maersk")
    if creds["cmacgm_key"]:   active.append("CMA CGM")
    if tokens.get("hlag"):    active.append("Hapag-Lloyd")
    if creds["msc_key"]:      active.append("MSC")
    if creds["sinay_key"]:    active.append("Sinay (universal)")
    print(f"Active APIs: {', '.join(active) or 'NONE – all containers will be flagged for manual check'}\n")

    results = {}
    tracked_count = 0

    for i, c in enumerate(containers):
        carrier   = c.get("carrier", "")
        booking   = c.get("bookingNumber", "")
        container = c.get("containerNumber", "")
        cid       = c.get("id", "")
        status    = c.get("reviewStatus", "")

        if not cid: continue
        if status == "Completed":
            print(f"[{i+1}/{len(containers)}] {container} — skip (Completed)")
            continue

        group = carrier_group(carrier)
        print(f"[{i+1}/{len(containers)}] {container or booking} ({carrier}) [{group}]...", end=" ", flush=True)

        data, source, error = None, None, None

        # --- Try native carrier API first ---
        if group == "maersk" and tokens.get("maersk"):
            data  = _track_maersk(booking, container, tokens["maersk"])
            source = "Maersk API"
        elif group in ("cmacgm", "anl") and creds["cmacgm_key"]:
            data  = _track_cmacgm(booking, container, creds["cmacgm_key"])
            source = "CMA CGM API"
        elif group == "hlag" and tokens.get("hlag"):
            data  = _track_hlag(booking, container, tokens["hlag"])
            source = "Hapag-Lloyd API"
        elif group == "msc" and creds["msc_key"]:
            data  = _track_msc(booking, container, creds["msc_key"])
            source = "MSC API"

        # --- Fallback to Sinay universal API ---
        if data is None and creds["sinay_key"]:
            data  = _track_sinay(booking, container, creds["sinay_key"])
            source = "Sinay API (universal)"

        # --- No credentials available ---
        if data is None:
            if not active:
                error = "No API credentials configured. Add at least SINAY_API_KEY to repo secrets."
            else:
                error = f"Not found via {source or 'any configured API'}"

        if data:
            results[cid] = {**data, "checkedAt": _now(), "source": source, "autoTracked": True, "error": None}
            tracked_count += 1
            print(f"✓ {data.get('currentStatus') or 'ok'} [{source}]")
        else:
            results[cid] = {"autoTracked": False, "checkedAt": _now(), "error": error}
            print(f"✗ {error}")

        time.sleep(0.4)  # gentle rate limiting

    _write_results(results, len(containers), tracked_count)
    print(f"\n✅ Done: {tracked_count}/{len(containers)} containers auto-tracked.")


def _now():
    return datetime.utcnow().isoformat() + "Z"

def _write_results(results, total, tracked=0):
    out = {
        "updatedAt": _now(),
        "containerCount": total,
        "trackedCount": tracked,
        "results": results,
    }
    Path("public/auto-tracking.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"Written to public/auto-tracking.json ({tracked}/{total} tracked)")


if __name__ == "__main__":
    main()
