"use client";

import Link from "next/link";

import { type FormEvent, useState } from "react";
import { ArrowLeft, Bot, LoaderCircle, ShieldAlert, Sparkles } from "lucide-react";

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

const numericFields: Array<{ key: Exclude<keyof FormValues, "transactionType">; label: string }> = [
  { key: "amount", label: "Transaction amount" },
  { key: "originBalanceBefore", label: "Origin balance before" },
  { key: "originBalanceAfter", label: "Origin balance after" },
  { key: "destinationBalanceBefore", label: "Destination balance before" },
  { key: "destinationBalanceAfter", label: "Destination balance after" },
];

export default function InvestigationsPage() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

    if (Object.values(payload).some((value) => typeof value === "number" && !Number.isFinite(value))) {
      setError("Enter a valid number in every balance and amount field.");
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

  const scoreColor =
    result?.riskBand === "Critical" ? "#fb7185" :
    result?.riskBand === "High" ? "#f59e0b" : "#22d3ee";

  return (
    <main className="min-h-screen bg-[#060b16] px-5 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-300">
          <ArrowLeft className="h-4 w-4" /> Back to risk overview
        </Link>

        <header className="mt-7 border-b border-slate-800 pb-7">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-300">Live model connection</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Investigation workspace</h1>
          <p className="mt-1 text-sm text-slate-400">
            Score a transaction and inspect the evidence behind the alert.
          </p>
        </header>

        <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          <form className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6" onSubmit={submit}>
            <h2 className="font-semibold text-white">Transaction evidence</h2>
            <p className="mt-1 text-sm text-slate-400">Synthetic fields compatible with Sentinel&apos;s model.</p>

            <label className="mt-6 block text-sm text-slate-300">
              Transaction type
              <select
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-cyan-400"
                onChange={(event) => updateValue("transactionType", event.target.value)}
                value={values.transactionType}
              >
                <option>TRANSFER</option><option>CASH_OUT</option><option>PAYMENT</option>
                <option>DEBIT</option><option>CASH_IN</option>
              </select>
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {numericFields.map((field) => (
                <label className="text-sm text-slate-300" key={field.key}>
                  {field.label}
                  <input
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-cyan-400"
                    min="0"
                    onChange={(event) => updateValue(field.key, event.target.value)}
                    step="0.01"
                    type="number"
                    value={values[field.key]}
                  />
                </label>
              ))}
            </div>

            {error && <p className="mt-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}

            <button
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
              {loading ? "Scoring transaction..." : "Run fraud risk assessment"}
            </button>
          </form>

          <section className="rounded-2xl border border-cyan-400/15 bg-gradient-to-b from-cyan-400/[0.08] to-slate-900/80 p-6">
            {!result ? (
              <div className="flex min-h-96 flex-col items-center justify-center text-center">
                <div className="rounded-2xl bg-cyan-400/10 p-5 text-cyan-300"><Bot className="h-8 w-8" /></div>
                <h2 className="mt-5 text-xl font-semibold text-white">Ready for investigation</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                  Submit the prefilled transaction to receive a trained-model fraud score.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-300">Model assessment</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{result.decision}</h2>

                <div className="mt-7 flex items-center gap-6 rounded-2xl border border-slate-700 bg-slate-950/60 p-5">
                  <div
                    className="flex h-28 w-28 items-center justify-center rounded-full"
                    style={{ background: `conic-gradient(${scoreColor} ${result.riskScore * 3.6}deg, #1e293b 0deg)` }}
                  >
                    <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-slate-950">
                      <span className="text-2xl font-bold" style={{ color: scoreColor }}>{result.riskScore}</span>
                      <span className="text-xs text-slate-500">risk score</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Risk band</p>
                    <p className="mt-1 text-xl font-semibold" style={{ color: scoreColor }}>{result.riskBand}</p>
                    <p className="mt-2 text-xs text-slate-500">Model: {result.modelVersion}</p>
                  </div>
                </div>

                <h3 className="mt-7 font-semibold text-white">Supporting review signals</h3>
                <div className="mt-3 space-y-3">
                  {result.supportingSignals.map((signal) => (
                    <article className="rounded-xl border border-slate-700 bg-slate-950/40 p-4" key={signal.name}>
                      <p className="text-sm font-medium text-cyan-200">{signal.name}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{signal.detail}</p>
                    </article>
                  ))}
                </div>
                <p className="mt-7 flex gap-2 text-xs leading-5 text-slate-500">
                  <Sparkles className="h-4 w-4 shrink-0 text-cyan-300" />
                  Synthetic-data demonstration only. Human review is required before any fraud decision.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
