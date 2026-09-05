from contextlib import asynccontextmanager
from pathlib import Path

import joblib
from fastapi import FastAPI, HTTPException, Query, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.dashboard import build_dashboard
from app.features import build_features

MODEL_PATH = Path(__file__).resolve().parents[1] / "artifacts" / "fraud_model.joblib"


class TransactionRequest(BaseModel):
    transactionType: str = Field(min_length=1, max_length=50)
    amount: float = Field(ge=0)
    originBalanceBefore: float = Field(ge=0)
    originBalanceAfter: float = Field(ge=0)
    destinationBalanceBefore: float = Field(ge=0)
    destinationBalanceAfter: float = Field(ge=0)


class RiskSignal(BaseModel):
    name: str
    detail: str


class FraudScoreResponse(BaseModel):
    riskScore: float
    riskBand: str
    decision: str
    supportingSignals: list[RiskSignal]
    modelVersion: str


def risk_band(probability: float) -> str:
    if probability >= 0.9:
        return "Critical"
    if probability >= 0.75:
        return "High"
    if probability >= 0.5:
        return "Medium"
    return "Low"


def supporting_signals(transaction: TransactionRequest) -> list[RiskSignal]:
    signals: list[RiskSignal] = []

    if transaction.amount >= 5000:
        signals.append(
            RiskSignal(
                name="High transaction amount",
                detail="Amount exceeds the configured high-value review threshold.",
            )
        )

    if transaction.transactionType in {"TRANSFER", "CASH_OUT"}:
        signals.append(
            RiskSignal(
                name="Higher-risk transaction type",
                detail="Transfers and cash-out transactions receive additional review.",
            )
        )

    if (
        transaction.originBalanceBefore > 0
        and transaction.amount / transaction.originBalanceBefore >= 0.8
    ):
        signals.append(
            RiskSignal(
                name="Material balance reduction",
                detail="Transaction consumes at least 80% of the origin balance.",
            )
        )

    return signals


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not MODEL_PATH.exists():
        raise RuntimeError(
            f"Model artifact not found at {MODEL_PATH}. Run the training script first."
        )

    app.state.model = joblib.load(MODEL_PATH)
    yield


app = FastAPI(
    title="Sentinel Fraud Scoring API",
    version="0.1.0",
    description="Synthetic-data fraud scoring demonstration. Human review is required.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy", "model": "fraud_model.joblib"}


@app.post("/score", response_model=FraudScoreResponse)
def score_transaction(transaction: TransactionRequest) -> FraudScoreResponse:
    try:
        features = build_features([transaction.model_dump()])
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    probability = float(app.state.model.predict_proba(features)[0][1])
    score = round(probability * 100, 2)
    band = risk_band(probability)

    return FraudScoreResponse(
        riskScore=score,
        riskBand=band,
        decision="Escalate for review" if band in {"Critical", "High"} else "Monitor",
        supportingSignals=supporting_signals(transaction),
        modelVersion="0.1.0-synthetic-demo",
    )


@app.get("/dashboard")
def dashboard(limit: int = Query(default=1000, ge=50, le=5000)) -> dict:
    return build_dashboard(app.state.model, limit)
