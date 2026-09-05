"use client";

import Link from "next/link";
import { Suspense, type FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  LoaderCircle,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

type ScoreResult = {
  riskScore: number;
  riskBand: string;
  decision: string;
  modelVersion: string;
  supportingSignals: Array<{ name: string; detail: string }>;
};

type FormValues = {
  transactionType: string;
  amount: string;
  originBalanceBefore: string;
  originBalanceAfter: string;
  destinationBalanceBefore: string;
  destinationBalanceAfter: string;
};

const initialValues: FormValues = {
  transactionType: "TRANSFER",
  amount: "9842.50",
  originBalanceBefore: "10000",
  originBalanceAfter: "157.50",
  destinationBalanceBefore: "0",
  destinationBalanceAfter: "9842.50",
};

const fields: Array<{
  key: Exclude<keyof FormValues, "transactionType">;
  label: string;
}> = [
  { key: "amount", label: "Transaction amount" },
  { key: "originBalanceBefore", label: "Sender balance before" },
  { key: "originBalanceAfter", label: "Sender balance after" },
  { key: "destinationBalanceBefore", label: "Recipient balance before" },
  { key: "destinationBalanceAfter", label: "Recipient balance after" },
];

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100";

function InvestigationWorkspace() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadedFromDashboard, setLoadedFromDashboard] = useState(false);
  const [brief, setBrief] = useState("");
  const [briefLoading, setBriefLoading] = useState(false);
  const searchParams = useSearchParams();

  function updateValue(key: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      transactionType: values.transactionType,
      amount: Number(values.amount),
      originBalanceBefore: Number(values.originBalanceBefore),
      originBalanceAfter: Number(values.originBalanceAfter),
      destinationBalanceBefore: Number(values.destinationBalanceBefore),
      destinationBalanceAfter: Number(values.destinationBalanceAfter),
    };

    if (
      Object.values(payload).some(
        (value) => typeof value === "number" && !Number.isFinite(value),
      )
    ) {
      setError("Enter a valid number in every amount and balance field.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json();

    if (!response.ok) {
      setError(responseBody.error ?? "Unable to score this transaction.");
      setLoading(false);
      return;
    }

    setResult(responseBody as ScoreResult);
    setLoading(false);
  }

  async function generateBrief() {
    if (!result) {
      return;
    }

    setBriefLoading(true);
    setError("");

    const response = await fetch("/api/case-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transaction: {
          transactionType: values.transactionType,
          amount: Number(values.amount),
          originBalanceBefore: Number(values.originBalanceBefore),
          originBalanceAfter: Number(values.originBalanceAfter),
          destinationBalanceBefore: Number(values.destinationBalanceBefore),
          destinationBalanceAfter: Number(values.destinationBalanceAfter),
        },
        riskScore: result.riskScore,
        riskBand: result.riskBand,
        supportingSignals: result.supportingSignals,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Unable to generate an AI investigator brief.");
      setBriefLoading(false);
      return;
    }

    setBrief(payload.summary);
    setBriefLoading(false);
  }

  const scoreColor =
    result?.riskBand === "Critical"
      ? "#be123c"
      : result?.riskBand === "High"
        ? "#b45309"
        : "#0369a1";

  return (
    <main className="min-h-full bg-transparent px-4 py-8 text-slate-950 md:px-8">
      <div className="mx-auto max-w-7xl">
        <Link className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-cyan-700" href="/">
          <ArrowLeft className="h-4 w-4" />
          Back to risk overview
        </Link>

        <header className="mt-6 rounded-3xl border border-slate-200 bg-white px-6 py-7 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">
            Investigator workflow
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Assess transaction risk
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Enter transaction evidence, receive a model score, and review the supporting signals before an analyst decision.
          </p>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
          <form className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={submit}>
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-cyan-100 p-2.5 text-cyan-700">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-950">Transaction evidence</h2>
                <p className="mt-1 text-sm text-slate-600">Synthetic data fields used by Sentinel&apos;s trained model.</p>
              </div>
            </div>

            {loadedFromDashboard && (
              <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-3">
                <p className="text-sm font-medium text-cyan-900">
                  Transaction loaded from the risk overview.
                </p>
                <button
                  className="text-xs font-semibold text-cyan-800 hover:text-cyan-950"
                  onClick={() => {
                    setValues(initialValues);
                    setLoadedFromDashboard(false);
                  }}
                  type="button"
                >
                  Reset
                </button>
              </div>
            )}

            <label className="mt-7 block text-sm font-medium text-slate-700">
              Transaction type
              <select
                className={inputClass}
                onChange={(event) => updateValue("transactionType", event.target.value)}
                value={values.transactionType}
              >
                <option>TRANSFER</option>
                <option>CASH_OUT</option>
                <option>PAYMENT</option>
                <option>DEBIT</option>
                <option>CASH_IN</option>
              </select>
            </label>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <label className="text-sm font-medium text-slate-700" key={field.key}>
                  {field.label}
                  <input
                    className={inputClass}
                    min="0"
                    onChange={(event) => updateValue(field.key, event.target.value)}
                    step="0.01"
                    type="number"
                    value={values[field.key]}
                  />
                </label>
              ))}
            </div>

            {error && (
              <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {error}
              </p>
            )}

            <button
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white shadow-lg shadow-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Scoring transaction..." : "Run fraud risk assessment"}
            </button>
          </form>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {!result ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-50 via-white to-blue-50 px-6 text-center">
                <div className="rounded-2xl bg-white p-5 text-cyan-700 shadow-md shadow-cyan-100">
                  <Bot className="h-8 w-8" />
                </div>
                <h2 className="mt-5 text-xl font-semibold text-slate-950">Ready for review</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                  Start with the prefilled transfer, then modify the evidence to see how the model responds.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">Model assessment</p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-950">{result.decision}</h2>
                    <p className="mt-1 text-sm text-slate-600">Model version: {result.modelVersion}</p>
                  </div>
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                </div>

                <div className="mt-7 flex items-center gap-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div
                    className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `conic-gradient(${scoreColor} ${result.riskScore * 3.6}deg, #e2e8f0 0deg)` }}
                  >
                    <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white">
                      <span className="text-2xl font-bold" style={{ color: scoreColor }}>{result.riskScore}</span>
                      <span className="text-xs text-slate-500">risk score</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Risk band</p>
                    <p className="mt-1 text-xl font-bold" style={{ color: scoreColor }}>{result.riskBand}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Use this score to prioritize investigation, not as an autonomous decision.</p>
                  </div>
                </div>

                <h3 className="mt-7 text-base font-semibold text-slate-950">Supporting review signals</h3>
                <div className="mt-3 space-y-3">
                  {result.supportingSignals.map((signal) => (
                    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4" key={signal.name}>
                      <p className="font-medium text-slate-900">{signal.name}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{signal.detail}</p>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}


export default function InvestigationsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-700">
          Loading investigation workspace...
        </main>
      }
    >
      <InvestigationWorkspace />
    </Suspense>
  );
}
