from __future__ import annotations

import csv
import json
import random
from pathlib import Path
from typing import Any

import joblib

from app.features import build_features

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
DATA_PATH = REPOSITORY_ROOT / "web" / "src" / "data" / "transactions.json"
MODEL_PATH = REPOSITORY_ROOT / "services" / "inference" / "artifacts" / "fraud_model.joblib"
OUTPUT_DIRECTORY = REPOSITORY_ROOT / "web" / "public" / "demo-data"

CSV_COLUMNS = [
    "transactionType",
    "amount",
    "originBalanceBefore",
    "originBalanceAfter",
    "destinationBalanceBefore",
    "destinationBalanceAfter",
]


def select_records(
    records: list[dict[str, Any]],
    probabilities: list[float],
    minimum: float,
    maximum: float,
    count: int,
    randomizer: random.Random,
) -> list[dict[str, Any]]:
    candidates = [
        record
        for record, probability in zip(records, probabilities, strict=True)
        if minimum <= probability < maximum
    ]

    if len(candidates) < count:
        raise RuntimeError(
            f"Expected {count} records between scores {minimum} and {maximum}; found {len(candidates)}."
        )

    return randomizer.sample(candidates, count)


def write_csv(filename: str, records: list[dict[str, Any]]) -> None:
    OUTPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)

    with (OUTPUT_DIRECTORY / filename).open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        writer.writerows(
            {column: record[column] for column in CSV_COLUMNS}
            for record in records
        )


def main() -> None:
    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    records = payload["transactions"]
    model = joblib.load(MODEL_PATH)
    probabilities = model.predict_proba(build_features(records))[:, 1].tolist()
    randomizer = random.Random(42)

    low_risk = select_records(records, probabilities, 0.0, 0.15, 20, randomizer)
    high_risk = select_records(records, probabilities, 0.9, 1.01, 20, randomizer)
    mixed_risk = (
        select_records(records, probabilities, 0.0, 0.15, 10, randomizer)
        + select_records(records, probabilities, 0.5, 0.9, 5, randomizer)
        + select_records(records, probabilities, 0.9, 1.01, 5, randomizer)
    )
    randomizer.shuffle(mixed_risk)

    write_csv("routine-low-risk.csv", low_risk)
    write_csv("mixed-review-queue.csv", mixed_risk)
    write_csv("high-risk-escalation.csv", high_risk)

    print(f"Created demo files in {OUTPUT_DIRECTORY}")


if __name__ == "__main__":
    main()
