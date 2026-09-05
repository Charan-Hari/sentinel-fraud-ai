"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Database,
  LoaderCircle,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

type GovernanceData = {
  model: {
    name: string;
    version: string;
    decisionThreshold: number;
  };
  dataset: {
    source: string;
    trainingRecords: number;
    testRecords: number;
    testFraudRate: number;
  };
  evaluation: {
    precision: number;
    recall: number;
    f1Score: number;
    rocAuc: number;
    confusionMatrix: {
      trueNegative: number;
      falsePositive: number;
      falseNegative: number;
      truePositive: number;
    };
  };
  limitations: string[];
};

function ScoreCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-emerald-700">{value}</p>
      <p className="mt-3 text-xs leading-5 text-slate-500">{description}</p>
    </article>
  );
}

export default function GovernancePage() {
  const [data, setData] = useState<GovernanceData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadGovernance() {
      try {
        const response = await fetch("/api/governance", { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load model governance data.");
        }

        setData(payload as GovernanceData);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load model governance data.",
        );
      }
    }

    void loadGovernance();
  }, []);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-transparent p-6 text-slate-900">
        <section className="max-w-lg rounded-2xl border border-rose-400/30 bg-white p-6">
          <TriangleAlert className="h-8 w-8 text-rose-700" />
          <h1 className="mt-4 text-xl font-semibold">Governance data unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-transparent text-slate-700">
        <LoaderCircle className="mr-3 h-5 w-5 animate-spin text-cyan-700" />
        Loading model governance...
      </main>
    );
  }

  const matrix = data.evaluation.confusionMatrix;
  const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <main className="min-h-screen bg-transparent px-5 py-8 text-slate-900 md:px-8">
      <div className="mx-auto max-w-7xl">
        <Link className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-cyan-700" href="/">
          <ArrowLeft className="h-4 w-4" />
          Back to risk overview
        </Link>

        <header className="mt-7 flex flex-col gap-4 border-b border-slate-200 pb-7 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-700">
              Explainable risk operations
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Model governance
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Evaluation evidence, model lineage, and operational guardrails.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-800">
            <ShieldCheck className="mr-2 inline h-4 w-4" />
            Evaluation record available
          </div>
        </header>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ScoreCard label="Precision" value={percent(data.evaluation.precision)} description="Flagged alerts that were fraud-labelled in the test set." />
          <ScoreCard label="Recall" value={percent(data.evaluation.recall)} description="Fraud-labelled test records successfully identified." />
          <ScoreCard label="F1 score" value={percent(data.evaluation.f1Score)} description="Balance of precision and recall at the configured threshold." />
          <ScoreCard label="ROC-AUC" value={data.evaluation.rocAuc.toFixed(4)} description="Ranking quality across all possible decision thresholds." />
        </section>

        <section className="mt-7 grid gap-5 xl:grid-cols-[1fr_1.2fr]">
          <article className="rounded-2xl border border-slate-200 bg-white/90 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-cyan-400/10 p-3 text-cyan-700">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-950">Held-out test confusion matrix</h2>
                <p className="mt-1 text-sm text-slate-600">Decision threshold: {data.model.decisionThreshold}</p>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-[110px_1fr_1fr] gap-3 text-center text-sm">
              <div />
              <p className="py-2 text-slate-500">Predicted normal</p>
              <p className="py-2 text-slate-500">Predicted fraud</p>

              <p className="flex items-center justify-end pr-2 text-slate-500">Actual normal</p>
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5">
                <p className="text-3xl font-bold text-emerald-700">{matrix.trueNegative}</p>
                <p className="mt-1 text-xs text-emerald-100">True negatives</p>
              </div>
              <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-5">
                <p className="text-3xl font-bold text-rose-700">{matrix.falsePositive}</p>
                <p className="mt-1 text-xs text-rose-100">False positives</p>
              </div>

              <p className="flex items-center justify-end pr-2 text-slate-500">Actual fraud</p>
              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5">
                <p className="text-3xl font-bold text-amber-700">{matrix.falseNegative}</p>
                <p className="mt-1 text-xs text-amber-100">False negatives</p>
              </div>
              <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-5">
                <p className="text-3xl font-bold text-cyan-700">{matrix.truePositive}</p>
                <p className="mt-1 text-xs text-cyan-100">True positives</p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white/90 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-400/10 p-3 text-violet-300">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-950">Model lineage</h2>
                <p className="mt-1 text-sm text-slate-600">Traceable inputs for this evaluation record.</p>
              </div>
            </div>

            <div className="mt-7 space-y-3">
              {[
                ["Model", data.model.name],
                ["Version", data.model.version],
                ["Dataset", data.dataset.source],
                ["Training records", data.dataset.trainingRecords.toLocaleString()],
                ["Held-out test records", data.dataset.testRecords.toLocaleString()],
                ["Test fraud rate", percent(data.dataset.testFraudRate)],
              ].map(([label, value]) => (
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3" key={label}>
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="max-w-[60%] truncate text-right text-sm font-medium text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-7 rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-6">
          <div className="flex items-center gap-3">
            <TriangleAlert className="h-5 w-5 text-amber-700" />
            <h2 className="font-semibold text-slate-950">Required use limitations</h2>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {data.limitations.map((limitation) => (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600" key={limitation}>
                <CheckCircle2 className="mb-3 h-4 w-4 text-amber-700" />
                {limitation}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
