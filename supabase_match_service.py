from __future__ import annotations

import os
from typing import Any

from dotenv import load_dotenv
from supabase import create_client

from matching_service import score_match

load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in environment.")

client = create_client(SUPABASE_URL, SUPABASE_KEY)


def fetch_candidate_people(limit: int = 20) -> list[dict[str, Any]]:
    response = client.table("people").select("*").limit(limit).execute()
    return response.data or []


def fetch_candidate_sightings(limit: int = 50) -> list[dict[str, Any]]:
    response = client.table("sightings").select("*, locations(*)").limit(limit).execute()
    return response.data or []


def normalize_record_for_match(person: dict[str, Any]) -> dict[str, Any]:
    location = person.get("location") or person.get("locations") or {}
    return {
        "name": person.get("name"),
        "age": person.get("age"),
        "gender": person.get("gender"),
        "description": person.get("description") or person.get("clothing"),
        "last_seen_date": person.get("last_seen_date"),
        "location": {
            "latitude": location.get("latitude"),
            "longitude": location.get("longitude"),
        },
    }


def normalize_sighting_for_match(sighting: dict[str, Any]) -> dict[str, Any]:
    location = sighting.get("location") or sighting.get("locations") or {}
    return {
        "name": sighting.get("name"),
        "age": sighting.get("age"),
        "gender": sighting.get("gender"),
        "description": sighting.get("description"),
        "sighting_date": sighting.get("sighting_date"),
        "location": {
            "latitude": location.get("latitude"),
            "longitude": location.get("longitude"),
        },
    }


def find_match_candidates(missing_person: dict[str, Any], limit: int = 20) -> list[dict[str, Any]]:
    people = fetch_candidate_people(limit=limit)
    ranked = []

    for person in people:
        if person.get("id") == missing_person.get("id"):
            continue
        result = score_match(normalize_record_for_match(person), normalize_sighting_for_match(missing_person))
        ranked.append({
            "person": person,
            "score": result["score"],
            "result": result,
        })

    ranked.sort(key=lambda item: item["score"], reverse=True)
    return ranked


def match_report_against_people(report: dict[str, Any], limit: int = 20) -> list[dict[str, Any]]:
    people = fetch_candidate_people(limit=limit)
    ranked = []

    for person in people:
        result = score_match(normalize_record_for_match(person), normalize_sighting_for_match(report))
        ranked.append({
            "person": person,
            "score": result["score"],
            "result": result,
        })

    ranked.sort(key=lambda item: item["score"], reverse=True)
    return ranked


if __name__ == "__main__":
    sample_missing = {
        "id": "demo-person-1",
        "name": "Bikash Babu",
        "age": 40,
        "description": "Blue jacket, glasses",
        "last_seen_date": "2026-08-26T14:00:00.000Z",
        "location": {"latitude": 27.7172, "longitude": 85.324},
    }

    sample_report = {
        "name": "Bikash Bahadur Babu",
        "age": 40,
        "description": "Navy jacket, glasses",
        "sighting_date": "2026-08-27T09:00:00.000Z",
        "location": {"latitude": 27.728, "longitude": 85.331},
    }

    print(match_report_against_people(sample_report, limit=5))
