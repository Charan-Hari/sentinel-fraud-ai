import json
from pathlib import Path
from typing import Any

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
METRICS_PATH = REPOSITORY_ROOT / "services" / "inference" / "artifacts" / "model_metrics.json"


def governance_snapshot() -> dict[str, Any]:
    if not METRICS_PATH.exists():
        raise RuntimeError(f"Model metrics not found at {METRICS_PATH}. Train the model first.")

    metrics = json.loads(METRICS_PATH.read_text(encoding="utf-8"))

    required_metrics = {
        "datasetSource",
        "trainingRecords",
        "testRecords",
        "testFraudRate",
        "precision",
        "recall",
        "f1Score",
        "rocAuc",
        "decisionThreshold",
        "modelType",
        "confusionMatrix",
    }

    missing_metrics = required_metrics.difference(metrics)
    if missing_metrics:
        raise ValueError(f"Model metrics are missing: {sorted(missing_metrics)}")

    return {
        "model": {
            "name": metrics["modelType"],
            "version": "0.1.0-synthetic-demo",
            "decisionThreshold": metrics["decisionThreshold"],
        },
        "dataset": {
            "source": metrics["datasetSource"],
            "trainingRecords": metrics["trainingRecords"],
            "testRecords": metrics["testRecords"],
            "testFraudRate": metrics["testFraudRate"],
        },
        "evaluation": {
            "precision": metrics["precision"],
            "recall": metrics["recall"],
            "f1Score": metrics["f1Score"],
            "rocAuc": metrics["rocAuc"],
            "confusionMatrix": metrics["confusionMatrix"],
        },
        "limitations": [
            "Evaluation uses synthetic PaySim-style data and is not a production-performance claim.",
            "Scores support investigator triage and do not make autonomous fraud decisions.",
            "Production deployment requires monitoring, drift detection, access controls, and human review.",
        ],
    }
