from __future__ import annotations

import argparse
import hashlib
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from datasets import load_dataset

DATASET_NAME = "CiferAI/Cifer-Fraud-Detection-Dataset-AF"
REQUIRED_COLUMNS = {
    "step",
    "type",
    "amount",
    "nameOrig",
    "nameDest",
    "oldbalanceOrg",
    "newbalanceOrig",
    "oldbalanceDest",
    "newbalanceDest",
    "isFraud",
    "isFlaggedFraud",
}


def anonymize(value: Any) -> str:
    digest = hashlib.sha256(str(value).encode("utf-8")).hexdigest()[:10]
    return f"CP-{digest.upper()}"


def transform_record(row: dict[str, Any], index: int) -> dict[str, Any]:
    missing_columns = REQUIRED_COLUMNS.difference(row)
    if missing_columns:
        raise ValueError(
            f"Dataset row is missing required columns: {sorted(missing_columns)}"
        )

    occurred_at = datetime(2025, 1, 1, tzinfo=UTC) + timedelta(
        hours=int(row["step"])
    )

    return {
        "id": f"TXN-{index:06d}",
        "occurredAt": occurred_at.isoformat(),
        "transactionType": str(row["type"]),
        "amount": round(float(row["amount"]), 2),
        "counterparty": anonymize(row["nameDest"]),
        "originBalanceBefore": round(float(row["oldbalanceOrg"]), 2),
        "originBalanceAfter": round(float(row["newbalanceOrig"]), 2),
        "destinationBalanceBefore": round(float(row["oldbalanceDest"]), 2),
        "destinationBalanceAfter": round(float(row["newbalanceDest"]), 2),
        "fraudLabel": bool(row["isFraud"]),
        "flaggedBySourceRule": bool(row["isFlaggedFraud"]),
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create a safe, balanced UI sample from the Hugging Face fraud dataset."
    )
    parser.add_argument("--normal-limit", type=int, default=1800)
    parser.add_argument("--fraud-limit", type=int, default=200)
    parser.add_argument("--max-rows-scanned", type=int, default=250000)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("web/src/data/transactions.json"),
    )
    args = parser.parse_args()

    if args.normal_limit < 1 or args.fraud_limit < 1 or args.max_rows_scanned < 1:
        raise ValueError("All limits must be positive integers.")

    dataset = load_dataset(DATASET_NAME, split="train", streaming=True)

    normal_records: list[dict[str, Any]] = []
    fraud_records: list[dict[str, Any]] = []

    for index, row in enumerate(dataset):
        if index >= args.max_rows_scanned:
            break

        transformed = transform_record(dict(row), index)

        if transformed["fraudLabel"] and len(fraud_records) < args.fraud_limit:
            fraud_records.append(transformed)
        elif not transformed["fraudLabel"] and len(normal_records) < args.normal_limit:
            normal_records.append(transformed)

        if (
            len(normal_records) == args.normal_limit
            and len(fraud_records) == args.fraud_limit
        ):
            break

    if not fraud_records:
        raise RuntimeError(
            "No fraud-labelled records were sampled. Increase --max-rows-scanned."
        )

    output = {
        "source": DATASET_NAME,
        "generatedAt": datetime.now(tz=UTC).isoformat(),
        "sampling": {
            "normalRecords": len(normal_records),
            "fraudRecords": len(fraud_records),
        },
        "transactions": fraud_records + normal_records,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2), encoding="utf-8")

    print(
        f"Wrote {len(output['transactions'])} transactions "
        f"({len(fraud_records)} fraud-labelled) to {args.output}"
    )


if __name__ == "__main__":
    main()
