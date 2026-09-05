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

type Alert = {
  id: string;
  counterparty: string;
  amount: number;
  transactionType: string;
  riskScore: number;
  riskBand: RiskBand;
};

type Dashboard = {
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
  Critical: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  High: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  Medium: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  Low: "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

function MetricCard({
  label,
  value,
  detail,
  icon,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/20">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{value}</p>
        </div>
        <div className={`rounded-xl p-3 ${accent}`}>{icon}</div>
      </div>
      <p className="mt-4 flex items-center gap-1 text-xs text-slate-500">
        <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />
        {detail}
      </p>
    </article>
  );
}

export default function Home() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskBand | "All">("All");
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await fetch("/api/dashboard", { cache: "no-store" });
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
  }, []);

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
      <main className="flex min-h-screen items-center justify-center bg-[#060b16] p-6 text-slate-100">
        <section className="max-w-lg rounded-2xl border border-rose-400/30 bg-slate-900 p-6">
          <ShieldAlert className="h-8 w-8 text-rose-300" />
          <h1 className="mt-4 text-xl font-semibold">Dashboard connection failed</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">{error}</p>
          <p className="mt-4 text-xs text-slate-500">
            Confirm FastAPI is running on port 8000.
          </p>
        </section>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#060b16] text-slate-300">
        <LoaderCircle className="mr-3 h-5 w-5 animate-spin text-cyan-300" />
        Loading Sentinel risk intelligence...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#060b16] text-slate-100">
      <div className="mx-auto max-w-[1600px] p-5 md:p-8">
        <header className="flex flex-col gap-5 border-b border-slate-800 pb-7 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-cyan-400 p-2 text-slate-950">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-bold tracking-tight text-white">Sentinel</p>
                <p className="text-xs text-slate-500">Fraud Risk Command Center</p>
              </div>
            </div>
            <h1 className="mt-7 text-3xl font-bold tracking-tight text-white">
              Fraud risk overview
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Model-scored monitoring from {dashboard.source}.
            </p>
          </div>

          <Link
            className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            href="/investigations"
          >
            Open investigation workspace
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </header>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            accent="bg-cyan-400/10 text-cyan-300"
            detail={`Sample of ${dashboard.sampleSize.toLocaleString()} transactions`}
            icon={<Activity className="h-5 w-5" />}
            label="Transactions monitored"
            value={dashboard.metrics.transactionsMonitored.toLocaleString()}
          />
          <MetricCard
            accent="bg-rose-400/10 text-rose-300"
            detail="Scores at or above review threshold"
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Review alerts"
            value={dashboard.metrics.reviewAlerts.toLocaleString()}
          />
          <MetricCard
            accent="bg-amber-400/10 text-amber-300"
            detail="Value associated with review alerts"
            icon={<CircleDollarSign className="h-5 w-5" />}
            label="Exposure under review"
            value={money.format(dashboard.metrics.exposureUnderReview)}
          />
          <MetricCard
            accent="bg-emerald-400/10 text-emerald-300"
            detail={`Recall ${dashboard.metrics.modelRecall}% · ROC-AUC ${dashboard.metrics.rocAuc}`}
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Synthetic test precision"
            value={`${dashboard.metrics.modelPrecision}%`}
          />
        </section>

        <section className="mt-7 grid gap-5 xl:grid-cols-[1.65fr_1fr]">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="font-semibold text-white">Scored alert activity</h2>
            <p className="mt-1 text-sm text-slate-400">
              Review-threshold alerts by transaction hour
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

          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="font-semibold text-white">Risk distribution</h2>
            <p className="mt-1 text-sm text-slate-400">Model risk bands across the monitored sample</p>
            <div className="relative mt-2 h-52">
              <ResponsiveContainer height="100%" width="100%">
                <PieChart>
                  <Pie data={dashboard.riskDistribution} dataKey="value" innerRadius={60} outerRadius={82} paddingAngle={4} stroke="none">
                    {dashboard.riskDistribution.map((item) => <Cell fill={item.color} key={item.name} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white">{dashboard.sampleSize}</span>
                <span className="text-xs text-slate-500">Transactions</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              {dashboard.riskDistribution.map((item) => (
                <div className="flex items-center gap-2 text-slate-400" key={item.name}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                  <span className="ml-auto mr-2 font-medium text-slate-200">{item.value}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-7 grid gap-5 2xl:grid-cols-[1.65fr_1fr]">
          <article className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
            <div className="flex flex-col gap-4 border-b border-slate-800 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-semibold text-white">Priority review queue</h2>
                <p className="mt-1 text-sm text-slate-400">Highest model-scored transactions.</p>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                  <Search className="mr-2 h-4 w-4 text-slate-500" />
                  <input
                    className="w-40 bg-transparent text-sm outline-none placeholder:text-slate-600"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search alerts"
                    value={query}
                  />
                </div>
                <select
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 outline-none"
                  onChange={(event) => setRiskFilter(event.target.value as RiskBand | "All")}
                  value={riskFilter}
                >
                  <option>All</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-500">
                  <tr><th className="px-5 py-4">Alert</th><th className="px-5 py-4">Transaction</th><th className="px-5 py-4">Risk score</th><th className="px-5 py-4">Band</th></tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr className={`border-t border-slate-800 transition hover:bg-slate-800/60 ${selectedAlert?.id === alert.id ? "bg-cyan-400/5" : ""}`} key={alert.id}>
                      <td className="px-5 py-4">
                        <button className="text-left" onClick={() => setSelectedId(alert.id)}>
                          <p className="font-medium text-slate-100">{alert.counterparty}</p>
                          <p className="mt-1 text-xs text-slate-500">{alert.id}</p>
                        </button>
                      </td>
                      <td className="px-5 py-4"><p className="font-medium text-slate-200">{money.format(alert.amount)}</p><p className="mt-1 text-xs text-slate-500">{alert.transactionType}</p></td>
                      <td className="px-5 py-4"><span className="font-semibold text-slate-100">{alert.riskScore}</span><span className="text-slate-500">/100</span></td>
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
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-300">Selected alert</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{selectedAlert?.id ?? "No matching alert"}</h2>
              </div>
              <Bot className="h-6 w-6 text-cyan-300" />
            </div>

            {selectedAlert && (
              <>
                <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                  <p className="text-sm text-slate-400">Model risk score</p>
                  <p className="mt-2 text-4xl font-bold text-rose-300">{selectedAlert.riskScore}<span className="text-base text-slate-500">/100</span></p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-400" style={{ width: `${selectedAlert.riskScore}%` }} />
                  </div>
                </div>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="rounded-lg bg-slate-950/40 p-3"><p className="text-slate-500">Masked counterparty</p><p className="mt-1 font-medium text-slate-200">{selectedAlert.counterparty}</p></div>
                  <div className="rounded-lg bg-slate-950/40 p-3"><p className="text-slate-500">Transaction type</p><p className="mt-1 font-medium text-slate-200">{selectedAlert.transactionType}</p></div>
                </div>
              </>
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
