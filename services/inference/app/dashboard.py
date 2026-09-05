from collections import Counter
from pathlib import Path
from typing import Any
import json

from app.features import build_features

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
DATA_PATH = REPOSITORY_ROOT / "web" / "src" / "data" / "transactions.json"
METRICS_PATH = REPOSITORY_ROOT / "services" / "inference" / "artifacts" / "model_metrics.json"


def risk_band(probability: float) -> str:
    if probability >= 0.9:
        return "Critical"
    if probability >= 0.75:
        return "High"
    if probability >= 0.5:
        return "Medium"
    return "Low"


def build_dashboard(model: Any, limit: int) -> dict[str, Any]:
    if not DATA_PATH.exists():
        raise RuntimeError(f"Transaction sample not found at {DATA_PATH}")

    if not METRICS_PATH.exists():
        raise RuntimeError(f"Model metrics not found at {METRICS_PATH}. Train the model first.")

    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    records = payload.get("transactions")

    if not isinstance(records, list) or not records:
        raise ValueError("Transaction sample must contain a non-empty transactions list.")

    selected_records = records[:limit]
    probabilities = model.predict_proba(build_features(selected_records))[:, 1]

    alerts = []
    distribution = Counter()
    timeline = Counter()

    for index, (record, probability) in enumerate(zip(selected_records, probabilities, strict=True)):
        score = round(float(probability) * 100, 2)
        band = risk_band(float(probability))
        distribution[band] += 1

        timestamp = str(record["occurredAt"])
        timeline[timestamp[11:13]] += int(score >= 50)

        if score >= 50:
            alerts.append(
                {
                    "id": record["id"],
                    "counterparty": record["counterparty"],
                    "amount": record["amount"],
                    "transactionType": record["transactionType"],
                    "occurredAt": timestamp,
                    "riskScore": score,
                    "riskBand": band,
                    "priority": index + 1,
                }
            )

    alerts.sort(key=lambda alert: alert["riskScore"], reverse=True)
    metrics = json.loads(METRICS_PATH.read_text(encoding="utf-8"))

    bands = [
        ("Critical", "#fb7185"),
        ("High", "#f59e0b"),
        ("Medium", "#38bdf8"),
        ("Low", "#64748b"),
    ]

    return {
        "source": payload.get("source"),
        "sampleSize": len(selected_records),
        "metrics": {
            "transactionsMonitored": len(selected_records),
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
            {"time": f"{hour}:00", "alerts": timeline[hour]}
            for hour in sorted(timeline)[-8:]
        ],
        "alerts": alerts[:50],
    }
