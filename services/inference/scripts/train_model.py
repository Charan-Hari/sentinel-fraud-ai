from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

REQUIRED_FIELDS = {
    "amount",
    "transactionType",
    "originBalanceBefore",
    "originBalanceAfter",
    "destinationBalanceBefore",
    "destinationBalanceAfter",
    "fraudLabel",
}


def build_features(records: list[dict[str, Any]]) -> tuple[pd.DataFrame, pd.Series]:
    dataframe = pd.DataFrame(records)
    missing_fields = REQUIRED_FIELDS.difference(dataframe.columns)
    if missing_fields:
        raise ValueError(f"Missing required transaction fields: {sorted(missing_fields)}")

    dataframe["originBalanceDelta"] = (
        dataframe["originBalanceBefore"] - dataframe["originBalanceAfter"]
    )
    dataframe["destinationBalanceDelta"] = (
        dataframe["destinationBalanceAfter"] - dataframe["destinationBalanceBefore"]
    )
    dataframe["amountToOriginBalanceRatio"] = np.where(
        dataframe["originBalanceBefore"] > 0,
        dataframe["amount"] / dataframe["originBalanceBefore"],
        0,
    )

    feature_columns = [
        "transactionType",
        "amount",
        "originBalanceBefore",
        "originBalanceAfter",
        "destinationBalanceBefore",
        "destinationBalanceAfter",
        "originBalanceDelta",
        "destinationBalanceDelta",
        "amountToOriginBalanceRatio",
    ]

    return dataframe[feature_columns], dataframe["fraudLabel"].astype(int)


def main() -> None:
    parser = argparse.ArgumentParser(description="Train Sentinel's fraud-risk classifier.")
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("web/src/data/transactions.json"),
    )
    parser.add_argument(
        "--model-output",
        type=Path,
        default=Path("services/inference/artifacts/fraud_model.joblib"),
    )
    parser.add_argument(
        "--metrics-output",
        type=Path,
        default=Path("services/inference/artifacts/model_metrics.json"),
    )
    args = parser.parse_args()

    payload = json.loads(args.input.read_text(encoding="utf-8"))
    records = payload.get("transactions")

    if not isinstance(records, list) or not records:
        raise ValueError("Input must contain a non-empty 'transactions' list.")

    features, labels = build_features(records)

    if labels.nunique() != 2:
        raise ValueError("Training data must contain both fraud and non-fraud labels.")

    x_train, x_test, y_train, y_test = train_test_split(
        features,
        labels,
        test_size=0.25,
        random_state=42,
        stratify=labels,
    )

    categorical_features = ["transactionType"]
    numeric_features = [column for column in features.columns if column not in categorical_features]

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "transactionType",
                OneHotEncoder(handle_unknown="ignore"),
                categorical_features,
            ),
            ("numeric", "passthrough", numeric_features),
        ]
    )

    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=300,
                    class_weight="balanced_subsample",
                    min_samples_leaf=2,
                    n_jobs=-1,
                    random_state=42,
                ),
            ),
        ]
    )

    pipeline.fit(x_train, y_train)

    probabilities = pipeline.predict_proba(x_test)[:, 1]
    predictions = (probabilities >= 0.5).astype(int)
    matrix = confusion_matrix(y_test, predictions)

    metrics = {
        "datasetSource": payload.get("source"),
        "trainingRecords": int(len(x_train)),
        "testRecords": int(len(x_test)),
        "testFraudRate": round(float(y_test.mean()), 4),
        "precision": round(float(precision_score(y_test, predictions, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, predictions, zero_division=0)), 4),
        "f1Score": round(float(f1_score(y_test, predictions, zero_division=0)), 4),
        "rocAuc": round(float(roc_auc_score(y_test, probabilities)), 4),
        "confusionMatrix": {
            "trueNegative": int(matrix[0][0]),
            "falsePositive": int(matrix[0][1]),
            "falseNegative": int(matrix[1][0]),
            "truePositive": int(matrix[1][1]),
        },
        "decisionThreshold": 0.5,
        "modelType": "RandomForestClassifier",
        "dataNotice": "Metrics are from synthetic data and are not production performance claims.",
    }

    args.model_output.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, args.model_output)
    args.metrics_output.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print(json.dumps(metrics, indent=2))
    print(f"\nSaved model to {args.model_output}")


if __name__ == "__main__":
    main()
