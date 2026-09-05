from contextlib import asynccontextmanager
from pathlib import Path

import joblib
from fastapi import FastAPI, HTTPException, Query, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.copilot import generate_case_summary
from app.dashboard import build_dashboard
from app.features import build_features
from app.governance import governance_snapshot

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


class CaseSummaryRequest(BaseModel):
    transaction: TransactionRequest
    riskScore: float = Field(ge=0, le=100)
    riskBand: str = Field(min_length=1, max_length=20)
    supportingSignals: list[RiskSignal] = Field(max_length=10)


class IngestionRequest(BaseModel):
    transactions: list[TransactionRequest] = Field(min_length=1, max_length=1000)


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
    app.state.dashboard_cache = {}
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
def dashboard(
    dataset: str = Query(default="baseline", pattern="^(baseline|routine|mixed|escalation)$"),
    limit: int = Query(default=1000, ge=1, le=5000),
) -> dict:
    cache_key = f"{dataset}:{limit}"
    cached_dashboard = app.state.dashboard_cache.get(cache_key)

    if cached_dashboard is None:
        cached_dashboard = build_dashboard(app.state.model, limit, dataset)
        app.state.dashboard_cache[cache_key] = cached_dashboard

    return cached_dashboard

@app.get("/governance")
def governance() -> dict:
    return governance_snapshot()

@app.post("/ingest")
def ingest_transactions(payload: IngestionRequest) -> dict:
    records = [transaction.model_dump() for transaction in payload.transactions]
    probabilities = app.state.model.predict_proba(build_features(records))[:, 1]

    risk_band_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    alerts = []

    for row_number, (transaction, probability) in enumerate(
        zip(records, probabilities, strict=True),
        start=1,
    ):
        score = round(float(probability) * 100, 2)
        band = risk_band(float(probability))
        risk_band_counts[band] += 1

        if score >= 50:
            alerts.append(
                {
                    "rowNumber": row_number,
                    "transactionType": transaction["transactionType"],
                    "amount": transaction["amount"],
                    "riskScore": score,
                    "riskBand": band,
                }
            )

    alerts.sort(key=lambda alert: alert["riskScore"], reverse=True)

    return {
        "summary": {
            "transactionsScored": len(records),
            "reviewAlerts": len(alerts),
            "riskBandCounts": risk_band_counts,
        },
        "alerts": alerts[:50],
        "notice": "Uploaded data is scored in-memory for this session and is not persisted.",
    }

@app.post("/case-summary")
def case_summary(payload: CaseSummaryRequest) -> dict:
    try:
        summary = generate_case_summary(
            transaction=payload.transaction.model_dump(),
            risk_score=payload.riskScore,
            risk_band=payload.riskBand,
            supporting_signals=[
                signal.model_dump() for signal in payload.supportingSignals
            ],
        )
    except ValueError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    return {
        "summary": summary,
        "model": "Qwen/Qwen2.5-1.5B-Instruct",
        "notice": "AI output is an investigator aid and requires human review.",
    }
