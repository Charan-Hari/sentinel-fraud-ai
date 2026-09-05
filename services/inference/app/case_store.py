import json
import sqlite3
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

DATABASE_PATH = Path(__file__).resolve().parents[1] / "data" / "sentinel_cases.sqlite3"


class CaseNotFoundError(Exception):
    pass


class InvalidCaseTransitionError(Exception):
    pass


def timestamp() -> str:
    return datetime.now(tz=UTC).isoformat()


def connection() -> sqlite3.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    database = sqlite3.connect(DATABASE_PATH)
    database.row_factory = sqlite3.Row
    database.execute("PRAGMA foreign_keys = ON")
    return database


def initialize_database() -> None:
    with connection() as database:
        database.executescript(
            """
            CREATE TABLE IF NOT EXISTS cases (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL CHECK (status IN ('OPEN', 'ESCALATED', 'CLOSED')),
                evidence_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS case_events (
                id TEXT PRIMARY KEY,
                case_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                details_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (case_id) REFERENCES cases(id)
            );
            """
        )


def case_payload(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "status": row["status"],
        "evidence": json.loads(row["evidence_json"]),
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def create_case(evidence: dict[str, Any]) -> dict[str, Any]:
    case_id = str(uuid.uuid4())
    created_at = timestamp()

    with connection() as database:
        database.execute(
            "INSERT INTO cases (id, status, evidence_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (case_id, "OPEN", json.dumps(evidence), created_at, created_at),
        )
        database.execute(
            "INSERT INTO case_events (id, case_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), case_id, "CREATED", json.dumps({"status": "OPEN"}), created_at),
        )
        row = database.execute("SELECT * FROM cases WHERE id = ?", (case_id,)).fetchone()

    return case_payload(row)


def transition_case(case_id: str, target_status: str) -> dict[str, Any]:
    allowed_transitions = {
        "OPEN": {"ESCALATED", "CLOSED"},
        "ESCALATED": {"CLOSED"},
        "CLOSED": set(),
    }

    with connection() as database:
        row = database.execute("SELECT * FROM cases WHERE id = ?", (case_id,)).fetchone()

        if row is None:
            raise CaseNotFoundError(case_id)

        current_status = row["status"]

        if target_status not in allowed_transitions[current_status]:
            raise InvalidCaseTransitionError(
                f"Cannot transition case from {current_status} to {target_status}."
            )

        updated_at = timestamp()
        database.execute(
            "UPDATE cases SET status = ?, updated_at = ? WHERE id = ?",
            (target_status, updated_at, case_id),
        )
        database.execute(
            "INSERT INTO case_events (id, case_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, ?)",
            (
                str(uuid.uuid4()),
                case_id,
                "STATUS_CHANGED",
                json.dumps({"from": current_status, "to": target_status}),
                updated_at,
            ),
        )
        updated = database.execute("SELECT * FROM cases WHERE id = ?", (case_id,)).fetchone()

    return case_payload(updated)


def case_events(case_id: str) -> list[dict[str, Any]]:
    with connection() as database:
        case_exists = database.execute("SELECT id FROM cases WHERE id = ?", (case_id,)).fetchone()

        if case_exists is None:
            raise CaseNotFoundError(case_id)

        rows = database.execute(
            "SELECT event_type, details_json, created_at FROM case_events WHERE case_id = ? ORDER BY created_at",
            (case_id,),
        ).fetchall()

    return [
        {
            "eventType": row["event_type"],
            "details": json.loads(row["details_json"]),
            "createdAt": row["created_at"],
        }
        for row in rows
    ]
