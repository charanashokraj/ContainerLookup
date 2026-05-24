"""
Automated Container Tracking Script
Reads data/containers.json, queries carrier APIs, writes public/auto-tracking.json.

Supported carriers (via free API):
  - Maersk / ANL  (requires MAERSK_CLIENT_ID + MAERSK_CLIENT_SECRET secrets)

All other carriers are flagged for manual check.
"""

import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import requests

# ── Maersk OAuth2 ──────────────────────────────────────────────────────────────
MAERSK_TOKEN_URL = "https://api.maersk.com/oauth2/access_token"
MAERSK_TRACK_URL = "https://api.maersk.com/track/v2/shipments"

# ── Event keyword tables (mirrors TypeScript eventNormalizer.ts) ────────────────
DISCHARGE_KEYWORDS = [
    "discharged", "import discharged", "discharged at pod",
    "unloaded", "vessel discharged", "arrival at pod", "port arrival",
]
RELEASE_KEYWORDS = [
    "gate out", "full container gate out", "picked up",
    "import release", "container released", "full out", "delivery out",
]
EMPTY_RETURN_KEYWORDS = [
    "empty return", "empty returned", "empty container returned",
    "gate in empty", "empty in", "return empty",
]
AMBIGUOUS_KEYWORDS = ["available for delivery", "available", "customs cleared"]


def normalize_events(events: list) -> dict:
    result = {
        "dischargeDate": None,
        "releaseDate": None,
        "emptyReturnDate": None,
        "currentStatus": None,
        "lastEventDescription": None,
        "lastEventDate": None,
        "eta": None,
    }

    for ev in events:
        desc = (ev.get("description") or ev.get("eventName") or "").lower()
        raw_date = ev.get("eventDateTime") or ev.get("date") or ""
        date_str = raw_date[:10] if raw_date else ""

        if any(a in desc for a in AMBIGUOUS_KEYWORDS):
            continue

        if any(k in desc for k in DISCHARGE_KEYWORDS) and not result["dischargeDate"]:
            result["dischargeDate"] = date_str
        if any(k in desc for k in RELEASE_KEYWORDS) and not result["releaseDate"]:
            result["releaseDate"] = date_str
        if any(k in desc for k in EMPTY_RETURN_KEYWORDS) and not result["emptyReturnDate"]:
            result["emptyReturnDate"] = date_str

    if events:
        last = events[-1]
        result["lastEventDescription"] = last.get("description") or last.get("eventName") or ""
        raw = last.get("eventDateTime") or last.get("date") or ""
        result["lastEventDate"] = raw[:10] if raw else ""
        result["currentStatus"] = result["lastEventDescription"]

    return result


# ── Maersk helpers ──────────────────────────────────────────────────────────────

def get_maersk_token(client_id: str, client_secret: str) -> str | None:
    try:
        resp = requests.post(
            MAERSK_TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret,
            },
            timeout=30,
        )
        if resp.status_code == 200:
            return resp.json().get("access_token")
        print(f"  Token error {resp.status_code}: {resp.text[:200]}", file=sys.stderr)
    except Exception as e:
        print(f"  Token request failed: {e}", file=sys.stderr)
    return None


def parse_maersk_response(data: dict) -> dict:
    """Extract events and ETA from Maersk Track API v2 response."""
    # Maersk v2 response shape: { "shipments": [ { "transportEvents": [...], ... } ] }
    shipments = data.get("shipments", [])
    if not shipments:
        shipments = [data]

    all_events = []
    eta = None

    for shipment in shipments:
        events = shipment.get("transportEvents", shipment.get("events", []))
        all_events.extend(events)

        # Try several possible ETA fields
        for field in ("estimatedTimeOfArrival", "eta", "estimatedArrival"):
            val = shipment.get(field, "")
            if val:
                eta = val[:10]
                break

        # Also check containers list
        for ctr in shipment.get("containers", []):
            for field in ("estimatedTimeOfArrival", "eta"):
                val = ctr.get(field, "")
                if val and not eta:
                    eta = val[:10]

    normalized = normalize_events(all_events)
    if eta:
        normalized["eta"] = eta
    return normalized


def track_maersk(booking: str, container_num: str, token: str) -> dict | None:
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }
    # Try booking reference first, then container number
    search_pairs = []
    if booking:
        search_pairs.append(("bookingReference", booking))
    if container_num:
        search_pairs.append(("containerNumber", container_num))

    for param_key, param_val in search_pairs:
        try:
            resp = requests.get(
                MAERSK_TRACK_URL,
                headers=headers,
                params={param_key: param_val},
                timeout=30,
            )
            if resp.status_code == 200:
                return parse_maersk_response(resp.json())
            if resp.status_code == 404:
                continue  # try next key
            print(f"  Maersk API {resp.status_code}: {resp.text[:200]}", file=sys.stderr)
        except Exception as e:
            print(f"  Maersk request error: {e}", file=sys.stderr)

    return None


# ── Carrier router ──────────────────────────────────────────────────────────────

def is_maersk(carrier: str) -> bool:
    c = carrier.lower()
    return any(k in c for k in ("maersk", "anl", "maerskline"))


# ── Main ────────────────────────────────────────────────────────────────────────

def main():
    # Ensure output directory exists
    Path("public").mkdir(exist_ok=True)

    containers_path = Path("data/containers.json")
    if not containers_path.exists():
        print("No data/containers.json found. Sync your container list from the app first.")
        _write_results({}, 0)
        return

    containers = json.loads(containers_path.read_text(encoding="utf-8"))
    print(f"Loaded {len(containers)} containers from data/containers.json")

    # Maersk credentials
    maersk_client_id = os.environ.get("MAERSK_CLIENT_ID", "").strip()
    maersk_client_secret = os.environ.get("MAERSK_CLIENT_SECRET", "").strip()
    maersk_token = None

    if maersk_client_id and maersk_client_secret:
        print("Obtaining Maersk OAuth2 token...")
        maersk_token = get_maersk_token(maersk_client_id, maersk_client_secret)
        print("  Token obtained." if maersk_token else "  Failed to obtain token.")
    else:
        print("MAERSK_CLIENT_ID / MAERSK_CLIENT_SECRET not set — Maersk tracking disabled.")

    results = {}
    tracked_count = 0

    for i, container in enumerate(containers):
        carrier = container.get("carrier", "")
        booking = container.get("bookingNumber", "")
        container_num = container.get("containerNumber", "")
        container_id = container.get("id", "")
        review_status = container.get("reviewStatus", "")

        if not container_id:
            continue

        # Skip completed containers
        if review_status == "Completed":
            print(f"[{i+1}/{len(containers)}] {container_num} — Skipping (Completed)")
            continue

        print(f"[{i+1}/{len(containers)}] {container_num or booking} ({carrier})...", end=" ", flush=True)

        tracking_data = None
        error = None

        if is_maersk(carrier):
            if maersk_token:
                tracking_data = track_maersk(booking, container_num, maersk_token)
                if not tracking_data:
                    error = "Not found in Maersk/ANL tracking API"
            else:
                error = "Maersk API credentials not configured (add MAERSK_CLIENT_ID and MAERSK_CLIENT_SECRET to repo secrets)"
        else:
            error = f"No free API available for carrier '{carrier}' — use manual tracking"

        if tracking_data:
            results[container_id] = {
                **tracking_data,
                "checkedAt": datetime.utcnow().isoformat() + "Z",
                "source": "Maersk API (auto)",
                "autoTracked": True,
                "error": None,
            }
            tracked_count += 1
            print(f"✓ {tracking_data.get('currentStatus') or 'no status'}")
        else:
            results[container_id] = {
                "autoTracked": False,
                "checkedAt": datetime.utcnow().isoformat() + "Z",
                "error": error,
            }
            print(f"✗ {error}")

        # Respect rate limits
        time.sleep(0.5)

    _write_results(results, len(containers))
    print(f"\n✅ Done: {tracked_count}/{len(containers)} containers auto-tracked.")


def _write_results(results: dict, total: int):
    output = {
        "updatedAt": datetime.utcnow().isoformat() + "Z",
        "containerCount": total,
        "trackedCount": sum(1 for r in results.values() if r.get("autoTracked")),
        "results": results,
    }
    path = Path("public/auto-tracking.json")
    path.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"Written to {path}")


if __name__ == "__main__":
    main()
