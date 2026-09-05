import csv
import json
from collections import Counter
from pathlib import Path
from typing import Any

from app.features import build_features

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
DATA_PATH = REPOSITORY_ROOT / "web" / "src" / "data" / "transactions.json"
METRICS_PATH = REPOSITORY_ROOT / "services" / "inference" / "artifacts" / "model_metrics.json"
DEMO_DIRECTORY = REPOSITORY_ROOT / "web" / "public" / "demo-data"

DATASETS = {
    "baseline": {
        "label": "Baseline monitoring sample",
        "source": "LordNR/AMLGraphX-Paysim",
        "file": None,
    },
    "routine": {
        "label": "Routine payments scenario",
        "source": "Model-selected low-risk records",
        "file": "routine-low-risk.csv",
    },
    "mixed": {
        "label": "Mixed review queue",
        "source": "Model-selected mixed-risk records",
        "file": "mixed-review-queue.csv",
    },
    "escalation": {
        "label": "High-risk escalation scenario",
        "source": "Model-selected high-risk records",
        "file": "high-risk-escalation.csv",
    },
}


def risk_band(probability: float) -> str:
    if probability >= 0.9:
        return "Critical"
    if probability >= 0.75:
        return "High"
    if probability >= 0.5:
        return "Medium"
    return "Low"


def load_records(dataset: str, limit: int) -> tuple[list[dict[str, Any]], str, str]:
    configuration = DATASETS.get(dataset)

    if configuration is None:
        raise ValueError(f"Unknown dataset selection: {dataset}")

    if configuration["file"] is None:
        payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
        records = payload.get("transactions")

        if not isinstance(records, list) or not records:
            raise ValueError("Baseline transaction sample is empty.")

        return records[:limit], configuration["label"], configuration["source"]

    csv_path = DEMO_DIRECTORY / str(configuration["file"])

    if not csv_path.exists():
        raise RuntimeError(f"Demo scenario not found at {csv_path}")

    with csv_path.open(encoding="utf-8", newline="") as file:
        reader = csv.DictReader(file)
        records = [
            {
                "transactionType": row["transactionType"],
                "amount": float(row["amount"]),
                "originBalanceBefore": float(row["originBalanceBefore"]),
                "originBalanceAfter": float(row["originBalanceAfter"]),
                "destinationBalanceBefore": float(row["destinationBalanceBefore"]),
                "destinationBalanceAfter": float(row["destinationBalanceAfter"]),
            }
            for row in reader
        ]

    if not records:
        raise ValueError(f"Demo scenario {dataset} is empty.")

    return records[:limit], configuration["label"], configuration["source"]


def build_dashboard(model: Any, limit: int, dataset: str = "baseline") -> dict[str, Any]:
    if not METRICS_PATH.exists():
        raise RuntimeError(f"Model metrics not found at {METRICS_PATH}. Train the model first.")

    records, dataset_label, source = load_records(dataset, limit)
    probabilities = model.predict_proba(build_features(records))[:, 1]

    alerts = []
    distribution = Counter()
    timeline = Counter()

    for index, (record, probability) in enumerate(zip(records, probabilities, strict=True)):
        score = round(float(probability) * 100, 2)
        band = risk_band(float(probability))
        distribution[band] += 1

        batch_group = f"Batch {(index // max(1, len(records) // 8)) + 1}"
        timeline[batch_group] += int(score >= 50)

        if score >= 50:
            alerts.append(
                {
                    "id": record.get("id", f"UPL-{index + 1:03d}"),
                    "counterparty": record.get("counterparty", f"Scenario record {index + 1}"),
                    "amount": record["amount"],
                    "transactionType": record["transactionType"],
                    "riskScore": score,
                    "riskBand": band,
                }
            )

    alerts.sort(key=lambda alert: alert["riskScore"], reverse=True)
    metrics = json.loads(METRICS_PATH.read_text(encoding="utf-8"))

    bands = [
        ("Critical", "#e11d48"),
        ("High", "#d97706"),
        ("Medium", "#0284c7"),
        ("Low", "#64748b"),
    ]

    return {
        "activeDataset": dataset,
        "datasetLabel": dataset_label,
        "source": source,
        "sampleSize": len(records),
        "metrics": {
            "transactionsMonitored": len(records),
            "reviewAlerts": len(alerts),
            "exposureUnderReview": round(sum(alert["amount"] for alert in alerts), 2),
            "modelPrecision": round(float(metrics["precision"]) * 100, 1),
            "modelRecall": round(float(metrics["recall"]) * 100, 1),
            "rocAuc": float(metrics["rocAuc"]),
        },
        "riskDistribution": [
            {"name": name, "value": distribution[name], "color": color}
            for name, color in bands
        ],
        "riskTrend": [
            {"time": group, "alerts": timeline[group]}
            for group in sorted(timeline)
        ],
        "alerts": alerts[:50],
    }
