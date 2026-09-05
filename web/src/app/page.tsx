"use client";

import Link from "next/link";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CircleDollarSign,
  LoaderCircle,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RiskBand = "Critical" | "High" | "Medium" | "Low";
type MetricKey = "transactions" | "alerts" | "exposure" | "precision";

type Alert = {
  id: string;
  counterparty: string;
  amount: number;
  transactionType: string;
  riskScore: number;
  riskBand: RiskBand;
  investigationInput: {
    transactionType: string;
    amount: number;
    originBalanceBefore: number;
    originBalanceAfter: number;
    destinationBalanceBefore: number;
    destinationBalanceAfter: number;
  };
};

type Dashboard = {
  activeDataset: string;
  datasetLabel: string;
  source: string;
  sampleSize: number;
  metrics: {
    transactionsMonitored: number;
    reviewAlerts: number;
    exposureUnderReview: number;
    modelPrecision: number;
    modelRecall: number;
    rocAuc: number;
  };
  riskDistribution: Array<{ name: RiskBand; value: number; color: string }>;
  riskTrend: Array<{ time: string; alerts: number }>;
  alerts: Alert[];
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const bandClass: Record<RiskBand, string> = {
  Critical: "border-rose-400/30 bg-rose-400/10 text-rose-700",
  High: "border-amber-400/30 bg-amber-400/10 text-amber-700",
  Medium: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  Low: "border-slate-500/30 bg-slate-500/10 text-slate-700",
};

function MetricCard({
  label,
  value,
  detail,
  icon,
  accent,
  active,
  onClick,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  accent: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        active ? "border-cyan-500 ring-2 ring-cyan-100" : "border-slate-200"
      }`}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-600">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <div className={`rounded-xl p-3 ${accent}`}>{icon}</div>
      </div>
      <p className="mt-4 flex items-center gap-1 text-xs text-slate-500">
        <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
        {detail}
      </p>
    </button>
  );
}

export default function Home() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskBand | "All">("All");
  const [selectedId, setSelectedId] = useState("");
  const [activeDataset, setActiveDataset] = useState("baseline");
  const [error, setError] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("alerts");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await fetch(`/api/dashboard?dataset=${activeDataset}`, { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load Sentinel data.");
        }

        const loadedDashboard = payload as Dashboard;
        setDashboard(loadedDashboard);
        setSelectedId(loadedDashboard.alerts[0]?.id ?? "");
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load Sentinel data.",
        );
      }
    }

    void loadDashboard();
  }, [activeDataset]);

  const alerts = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    return dashboard.alerts.filter((alert) => {
      const matchesQuery = `${alert.id} ${alert.counterparty} ${alert.transactionType}`
        .toLowerCase()
        .includes(query.toLowerCase());

      return matchesQuery && (riskFilter === "All" || alert.riskBand === riskFilter);
    });
  }, [dashboard, query, riskFilter]);

  const selectedAlert =
    alerts.find((alert) => alert.id === selectedId) ??
    dashboard?.alerts.find((alert) => alert.id === selectedId) ??
    alerts[0];

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-transparent p-6 text-slate-900">
        <section className="max-w-lg rounded-2xl border border-rose-400/30 bg-white p-6">
          <ShieldAlert className="h-8 w-8 text-rose-700" />
          <h1 className="mt-4 text-xl font-semibold">Dashboard connection failed</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{error}</p>
          <p className="mt-4 text-xs text-slate-500">
            Confirm FastAPI is running on port 8000.
          </p>
        </section>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-transparent text-slate-700">
        <LoaderCircle className="mr-3 h-5 w-5 animate-spin text-cyan-700" />
        Loading Sentinel risk intelligence...
      </main>
    );
  }

  const investigationUrl = selectedAlert
    ? `/investigations?${new URLSearchParams(
        Object.entries(selectedAlert.investigationInput).map(([key, value]) => [key, String(value)]),
      ).toString()}`
    : "/investigations";

  const metricDetails: Record<MetricKey, { title: string; description: string }> = {
    transactions: {
      title: "Transactions monitored",
      description: `${dashboard.metrics.transactionsMonitored.toLocaleString()} transactions from the current sampled dataset were scored by the model.`,
    },
    alerts: {
      title: "Review alerts",
      description: `${dashboard.metrics.reviewAlerts.toLocaleString()} transactions met Sentinel's review threshold and appear in the priority queue below.`,
    },
    exposure: {
      title: "Exposure under review",
      description: `${money.format(dashboard.metrics.exposureUnderReview)} is the aggregate value associated with transactions requiring review.`,
    },
    precision: {
      title: "Synthetic test precision",
      description: "This reflects offline evaluation on synthetic PaySim-style data. It is not a production performance claim.",
    },
  };

  const selectedMetricDetail = metricDetails[selectedMetric];

  return (
    <main className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-[1600px] p-5 md:p-8">
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="px-2">
              <p className="text-sm font-semibold text-slate-950">Start a fraud-risk workflow</p>
              <p className="mt-1 text-sm text-slate-600">Choose an action to evaluate data, inspect risk, or review model evidence.</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <Link className="group rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 transition hover:border-cyan-500 hover:bg-cyan-100" href="/ingest">
                <span className="text-xs font-bold text-cyan-700">STEP 1</span>
                <p className="mt-1 text-sm font-semibold text-slate-950">Add data →</p>
                <p className="mt-1 text-xs text-slate-600">Load a scenario or upload CSV</p>
              </Link>

              <Link className="group rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 transition hover:border-amber-500 hover:bg-amber-100" href="/investigations">
                <span className="text-xs font-bold text-amber-700">STEP 2</span>
                <p className="mt-1 text-sm font-semibold text-slate-950">Investigate →</p>
                <p className="mt-1 text-xs text-slate-600">Score a single transaction</p>
              </Link>

              <Link className="group rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 transition hover:border-violet-500 hover:bg-violet-100" href="/governance">
                <span className="text-xs font-bold text-violet-700">STEP 3</span>
                <p className="mt-1 text-sm font-semibold text-slate-950">Review evidence →</p>
                <p className="mt-1 text-xs text-slate-600">Inspect model evaluation</p>
              </Link>
            </div>
          </div>
        </section>



        

        <section className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">{dashboard.datasetLabel}</p>
            <p className="mt-1 text-sm text-slate-600">{dashboard.source}</p>
          </div>
          <label className="text-sm font-medium text-slate-700">
            Dataset view
            <select
              className="ml-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
              onChange={(event) => setActiveDataset(event.target.value)}
              value={activeDataset}
            >
              <option value="baseline">Baseline · 1,000 records</option>
              <option value="routine">Routine payments · low risk</option>
              <option value="mixed">Mixed review queue</option>
              <option value="escalation">High-risk escalation</option>
            </select>
          </label>
        </section>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            accent="bg-cyan-400/10 text-cyan-700"
            detail={`Sample of ${dashboard.sampleSize.toLocaleString()} transactions`}
            icon={<Activity className="h-5 w-5" />}
            active={selectedMetric === "transactions"}
            label="Transactions monitored"
            onClick={() => setSelectedMetric("transactions")}
            value={dashboard.metrics.transactionsMonitored.toLocaleString()}
          />
          <MetricCard
            accent="bg-rose-400/10 text-rose-700"
            detail="Scores at or above review threshold"
            icon={<AlertTriangle className="h-5 w-5" />}
            active={selectedMetric === "alerts"}
            label="Review alerts"
            onClick={() => setSelectedMetric("alerts")}
            value={dashboard.metrics.reviewAlerts.toLocaleString()}
          />
          <MetricCard
            accent="bg-amber-400/10 text-amber-700"
            detail="Value associated with review alerts"
            icon={<CircleDollarSign className="h-5 w-5" />}
            active={selectedMetric === "exposure"}
            label="Exposure under review"
            onClick={() => setSelectedMetric("exposure")}
            value={money.format(dashboard.metrics.exposureUnderReview)}
          />
          <MetricCard
            accent="bg-emerald-400/10 text-emerald-700"
            detail={`Recall ${dashboard.metrics.modelRecall}% · ROC-AUC ${dashboard.metrics.rocAuc}`}
            icon={<ShieldCheck className="h-5 w-5" />}
            active={selectedMetric === "precision"}
            label="Synthetic test precision"
            onClick={() => setSelectedMetric("precision")}
            value={`${dashboard.metrics.modelPrecision}%`}
          />
        </section>

        <section className="mt-4 flex flex-col gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 px-5 py-4 sm:flex-row sm:items-center">
          <div className="rounded-lg bg-white p-2 text-cyan-700 shadow-sm">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{selectedMetricDetail.title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{selectedMetricDetail.description}</p>
          </div>
        </section>

        <section className="mt-7 grid gap-5 xl:grid-cols-[1.65fr_1fr]">
          <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
            <h2 className="font-semibold text-slate-950">Scored alert activity</h2>
            <p className="mt-1 text-sm text-slate-600">
              Review-threshold alert distribution across the selected dataset
            </p>
            <div className="mt-6 h-72">
              <ResponsiveContainer height="100%" width="100%">
                <AreaChart data={dashboard.riskTrend}>
                  <defs>
                    <linearGradient id="alertGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis axisLine={false} dataKey="time" tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "12px" }} />
                  <Area dataKey="alerts" fill="url(#alertGradient)" stroke="#22d3ee" strokeWidth={3} type="monotone" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
            <h2 className="font-semibold text-slate-950">Risk distribution</h2>
            <p className="mt-1 text-sm text-slate-600">Model risk bands across the monitored sample</p>
            <div className="relative mt-2 h-52">
              <ResponsiveContainer height="100%" width="100%">
                <PieChart>
                  <Pie data={dashboard.riskDistribution} dataKey="value" innerRadius={60} outerRadius={82} paddingAngle={4} stroke="none">
                    {dashboard.riskDistribution.map((item) => <Cell fill={item.color} key={item.name} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-950">{dashboard.sampleSize}</span>
                <span className="text-xs text-slate-500">Transactions</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              {dashboard.riskDistribution.map((item) => (
                <div className="flex items-center gap-2 text-slate-600" key={item.name}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                  <span className="ml-auto mr-2 font-medium text-slate-800">{item.value}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-7 grid gap-5 2xl:grid-cols-[1.65fr_1fr]">
          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-semibold text-slate-950">Priority review queue</h2>
                <p className="mt-1 text-sm text-slate-600">Highest model-scored transactions.</p>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <Search className="mr-2 h-4 w-4 text-slate-500" />
                  <input
                    className="w-40 bg-transparent text-sm outline-none placeholder:text-slate-600"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search alerts"
                    value={query}
                  />
                </div>
                <select
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none"
                  onChange={(event) => setRiskFilter(event.target.value as RiskBand | "All")}
                  value={riskFilter}
                >
                  <option>All</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr><th className="px-5 py-4">Alert</th><th className="px-5 py-4">Transaction</th><th className="px-5 py-4">Risk score</th><th className="px-5 py-4">Band</th></tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr className={`border-t border-slate-200 transition hover:bg-slate-800/60 ${selectedAlert?.id === alert.id ? "bg-cyan-400/5" : ""}`} key={alert.id}>
                      <td className="px-5 py-4">
                        <button className="text-left" onClick={() => setSelectedId(alert.id)}>
                          <p className="font-medium text-slate-900">{alert.counterparty}</p>
                          <p className="mt-1 text-xs text-slate-500">{alert.id}</p>
                        </button>
                      </td>
                      <td className="px-5 py-4"><p className="font-medium text-slate-800">{money.format(alert.amount)}</p><p className="mt-1 text-xs text-slate-500">{alert.transactionType}</p></td>
                      <td className="px-5 py-4"><span className="font-semibold text-slate-900">{alert.riskScore}</span><span className="text-slate-500">/100</span></td>
                      <td className="px-5 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${bandClass[alert.riskBand]}`}>{alert.riskBand}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-2xl border border-cyan-400/15 bg-gradient-to-b from-cyan-400/[0.07] to-slate-900/80 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-700">Selected alert</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">{selectedAlert?.id ?? "No matching alert"}</h2>
              </div>
              <Bot className="h-6 w-6 text-cyan-700" />
            </div>

            {selectedAlert && (
              <>
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-600">Model risk score</p>
                  <p className="mt-2 text-4xl font-bold text-rose-700">{selectedAlert.riskScore}<span className="text-base text-slate-500">/100</span></p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-400" style={{ width: `${selectedAlert.riskScore}%` }} />
                  </div>
                </div>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Masked counterparty</p><p className="mt-1 font-medium text-slate-800">{selectedAlert.counterparty}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Transaction type</p><p className="mt-1 font-medium text-slate-800">{selectedAlert.transactionType}</p></div>
                </div>
              </>
            )}

            {selectedAlert && (
              <Link
                className="mt-6 flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                href={investigationUrl}
              >
                Investigate selected transaction
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            )}

            <p className="mt-6 text-xs leading-5 text-slate-500">
              Synthetic data only. Scores support triage and require qualified human review.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
