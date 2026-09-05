from typing import Any

import numpy as np
import pandas as pd

REQUIRED_FIELDS = {
    "amount",
    "transactionType",
    "originBalanceBefore",
    "originBalanceAfter",
    "destinationBalanceBefore",
    "destinationBalanceAfter",
}

FEATURE_COLUMNS = [
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


def build_features(records: list[dict[str, Any]]) -> pd.DataFrame:
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

    return dataframe[FEATURE_COLUMNS]
