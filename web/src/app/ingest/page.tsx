"use client";

import { ChangeEvent, useState } from "react";
import Papa from "papaparse";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  ShieldCheck,
  Upload,
} from "lucide-react";

type Transaction = {
  transactionType: string;
  amount: number;
  originBalanceBefore: number;
  originBalanceAfter: number;
  destinationBalanceBefore: number;
  destinationBalanceAfter: number;
};

type IngestionResult = {
  summary: {
    transactionsScored: number;
    reviewAlerts: number;
    riskBandCounts: Record<string, number>;
  };
  alerts: Array<{
    rowNumber: number;
    transactionType: string;
    amount: number;
    riskScore: number;
    riskBand: string;
  }>;
  notice: string;
};

const template = `transactionType,amount,originBalanceBefore,originBalanceAfter,destinationBalanceBefore,destinationBalanceAfter
TRANSFER,9842.50,10000,157.50,0,9842.50
PAYMENT,125.75,2800,2674.25,600,725.75`;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function downloadTemplate() {
  const blob = new Blob([template], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "sentinel-transaction-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function IngestPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<IngestionResult | null>(null);
  const [scoring, setScoring] = useState(false);

  function normalizeRow(row: Record<string, string>): Transaction {
    const transaction = {
      transactionType: row.transactionType ?? row.type,
      amount: Number(row.amount),
      originBalanceBefore: Number(row.originBalanceBefore ?? row.oldbalanceOrg),
      originBalanceAfter: Number(row.originBalanceAfter ?? row.newbalanceOrig),
      destinationBalanceBefore: Number(row.destinationBalanceBefore ?? row.oldbalanceDest),
      destinationBalanceAfter: Number(row.destinationBalanceAfter ?? row.newbalanceDest),
    };

    if (
      !transaction.transactionType ||
      Object.values(transaction).some(
        (value) => typeof value === "number" && !Number.isFinite(value),
      )
    ) {
      throw new Error("The CSV is missing required columns or contains invalid numeric values.");
    }

    return transaction;
  }

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setResult(null);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Upload a CSV file.");
      return;
    }

    if (file.size > 2_000_000) {
      setError("CSV must be smaller than 2 MB for this demonstration.");
      return;
    }

    const csv = await file.text();
    const parsed = Papa.parse<Record<string, string>>(csv, {
      header: true,
      skipEmptyLines: "greedy",
    });

    if (parsed.errors.length > 0) {
      setError(`CSV parsing failed: ${parsed.errors[0].message}`);
      return;
    }

    try {
      const normalized = parsed.data.map(normalizeRow);

      if (normalized.length === 0) {
        throw new Error("The CSV does not contain any transactions.");
      }

      if (normalized.length > 1000) {
        throw new Error("Upload a maximum of 1,000 transactions per scoring request.");
      }

      setTransactions(normalized);
      setFileName(file.name);
    } catch (validationError) {
      setError(
        validationError instanceof Error
          ? validationError.message
          : "Unable to validate the CSV.",
      );
    }
  }

  async function scoreTransactions() {
    setScoring(true);
    setError("");

    const response = await fetch("/api/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactions }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Unable to score uploaded transactions.");
      setScoring(false);
      return;
    }

    setResult(payload as IngestionResult);
    setScoring(false);
  }

  return (
    <main className="min-h-full bg-transparent px-4 py-8 text-slate-950 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-slate-200 bg-white px-6 py-7 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">
            Data intake
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Upload transaction data
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Upload a PaySim-compatible CSV, validate the expected fields, and score up to 1,000 transactions without storing your upload.
          </p>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-cyan-100 p-2.5 text-cyan-700">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-950">1. Choose a CSV file</h2>
                <p className="mt-1 text-sm text-slate-600">Required numeric fields are validated before scoring.</p>
              </div>
            </div>

            <button className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-cyan-700 hover:text-cyan-900" onClick={downloadTemplate}>
              <Download className="h-4 w-4" />
              Download CSV template
            </button>

            <label className="mt-6 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center transition hover:border-cyan-500 hover:bg-cyan-50">
              <Upload className="h-7 w-7 text-cyan-700" />
              <span className="mt-3 font-medium text-slate-900">Select transaction CSV</span>
              <span className="mt-1 text-xs text-slate-500">Maximum 1,000 rows · 2 MB · CSV only</span>
              <input accept=".csv,text/csv" className="sr-only" onChange={selectFile} type="file" />
            </label>

            {error && <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

            {transactions.length > 0 && (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  {transactions.length.toLocaleString()} transactions validated
                </p>
                <p className="mt-1 truncate text-xs text-emerald-700">{fileName}</p>
              </div>
            )}

            <button
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white shadow-lg shadow-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={transactions.length === 0 || scoring}
              onClick={scoreTransactions}
            >
              {scoring ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {scoring ? "Scoring upload..." : "Score uploaded transactions"}
            </button>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {!result ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-50 via-white to-blue-50 px-6 text-center">
                <ShieldCheck className="h-9 w-9 text-cyan-700" />
                <h2 className="mt-4 text-xl font-semibold text-slate-950">2. Review scored results</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                  Upload a valid CSV to view risk bands, alert volume, and the highest-risk transactions.
                </p>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Scoring summary</h2>
                <p className="mt-1 text-sm text-slate-600">{result.notice}</p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-950 p-5 text-white">
                    <p className="text-sm text-slate-300">Transactions scored</p>
                    <p className="mt-2 text-3xl font-bold">{result.summary.transactionsScored}</p>
                  </div>
                  <div className="rounded-2xl bg-rose-50 p-5">
                    <p className="text-sm text-rose-700">Review alerts</p>
                    <p className="mt-2 text-3xl font-bold text-rose-800">{result.summary.reviewAlerts}</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {Object.entries(result.summary.riskBandCounts).map(([band, count]) => (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3" key={band}>
                      <p className="text-xs text-slate-500">{band}</p>
                      <p className="mt-1 text-xl font-bold text-slate-900">{count}</p>
                    </div>
                  ))}
                </div>

                <h3 className="mt-7 font-semibold text-slate-950">Highest-risk transactions</h3>
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-500">
                      <tr><th className="px-4 py-3">Row</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Score</th></tr>
                    </thead>
                    <tbody>
                      {result.alerts.slice(0, 6).map((alert) => (
                        <tr className="border-t border-slate-200" key={alert.rowNumber}>
                          <td className="px-4 py-3 text-slate-600">#{alert.rowNumber}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{alert.transactionType}</td>
                          <td className="px-4 py-3 text-slate-700">{money.format(alert.amount)}</td>
                          <td className="px-4 py-3 font-bold text-rose-700">{alert.riskScore}/100</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
