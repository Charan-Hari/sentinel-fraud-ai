"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CircleDollarSign,
  Clock3,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
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

type Severity = "Critical" | "High" | "Medium" | "Low";

type Alert = {
  id: string;
  customer: string;
  amount: number;
  transactionType: string;
  riskScore: number;
  severity: Severity;
  time: string;
  reason: string;
};

const riskTrend = [
  { time: "08:00", alerts: 8 },
  { time: "10:00", alerts: 12 },
  { time: "12:00", alerts: 9 },
  { time: "14:00", alerts: 19 },
  { time: "16:00", alerts: 16 },
  { time: "18:00", alerts: 27 },
  { time: "20:00", alerts: 21 },
];

const riskDistribution = [
  { name: "Critical", value: 14, color: "#fb7185" },
  { name: "High", value: 38, color: "#f59e0b" },
  { name: "Medium", value: 74, color: "#38bdf8" },
  { name: "Low", value: 196, color: "#64748b" },
];

const alerts: Alert[] = [
  {
    id: "ALT-84721",
    customer: "Avery Morgan",
    amount: 9842.5,
    transactionType: "International transfer",
    riskScore: 96,
    severity: "Critical",
    time: "2 min ago",
    reason: "New beneficiary, unusual amount, and high-velocity activity",
  },
  {
    id: "ALT-84718",
    customer: "Jordan Lee",
    amount: 4200,
    transactionType: "Card payment",
    riskScore: 89,
    severity: "High",
    time: "6 min ago",
    reason: "Location anomaly and merchant-category deviation",
  },
  {
    id: "ALT-84712",
    customer: "Samira Patel",
    amount: 7650,
    transactionType: "Cash withdrawal",
    riskScore: 84,
    severity: "High",
    time: "11 min ago",
    reason: "Cash-out pattern exceeds the customer baseline",
  },
  {
    id: "ALT-84703",
    customer: "Taylor Brooks",
    amount: 1980.75,
    transactionType: "Bank transfer",
    riskScore: 72,
    severity: "Medium",
    time: "18 min ago",
    reason: "Beneficiary network has elevated risk signals",
  },
  {
    id: "ALT-84696",
    customer: "Morgan Chen",
    amount: 860.2,
    transactionType: "Online purchase",
    riskScore: 64,
    severity: "Medium",
    time: "25 min ago",
    reason: "Device and purchase behavior differ from the profile",
  },
];

const severityClass: Record<Severity, string> = {
  Critical: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  High: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  Medium: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  Low: "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function MetricCard({
  label,
  value,
  change,
  icon,
  color,
}: {
  label: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/20">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{value}</p>
        </div>
        <div className={`rounded-xl p-3 ${color}`}>{icon}</div>
      </div>
      <p className="mt-4 flex items-center gap-1 text-xs font-medium text-emerald-300">
        <TrendingUp className="h-3.5 w-3.5" />
        {change}
        <span className="font-normal text-slate-500">vs. previous 24h</span>
      </p>
    </article>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<Severity | "All">("All");
  const [selectedAlertId, setSelectedAlertId] = useState(alerts[0].id);

  const filteredAlerts = useMemo(
    () =>
      alerts.filter((alert) => {
        const text = `${alert.id} ${alert.customer} ${alert.transactionType}`.toLowerCase();
        return (
          text.includes(query.toLowerCase()) &&
          (severityFilter === "All" || alert.severity === severityFilter)
        );
      }),
    [query, severityFilter],
  );

  const selectedAlert =
    alerts.find((alert) => alert.id === selectedAlertId) ?? alerts[0];

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
              Live monitoring preview using synthetic transaction data.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-400">
              <Clock3 className="mr-2 inline h-4 w-4 text-cyan-300" />
              Last refreshed: just now
            </div>
            <button className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
              Review critical alerts
            </button>
          </div>
        </header>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Transactions monitored"
            value="24,892"
            change="+12.8%"
            color="bg-cyan-400/10 text-cyan-300"
            icon={<Activity className="h-5 w-5" />}
          />
          <MetricCard
            label="High-risk alerts"
            value="52"
            change="+18.2%"
            color="bg-rose-400/10 text-rose-300"
            icon={<AlertTriangle className="h-5 w-5" />}
          />
          <MetricCard
            label="Exposure under review"
            value="$186.4K"
            change="+6.4%"
            color="bg-amber-400/10 text-amber-300"
            icon={<CircleDollarSign className="h-5 w-5" />}
          />
          <MetricCard
            label="Model precision"
            value="94.2%"
            change="+2.1%"
            color="bg-emerald-400/10 text-emerald-300"
            icon={<ShieldCheck className="h-5 w-5" />}
          />
        </section>

        <section className="mt-7 grid gap-5 xl:grid-cols-[1.65fr_1fr]">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-white">Alert activity</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Flagged transactions over the last 12 hours
                </p>
              </div>
              <span className="rounded-lg bg-rose-400/10 px-2.5 py-1 text-xs font-medium text-rose-300">
                +28% peak activity
              </span>
            </div>
            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={riskTrend}>
                  <defs>
                    <linearGradient id="alertGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="alerts"
                    stroke="#22d3ee"
                    strokeWidth={3}
                    fill="url(#alertGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="font-semibold text-white">Risk distribution</h2>
            <p className="mt-1 text-sm text-slate-400">Open alerts by severity</p>
            <div className="relative mt-2 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    dataKey="value"
                    innerRadius={60}
                    outerRadius={82}
                    paddingAngle={4}
                    stroke="none"
                  >
                    {riskDistribution.map((item) => (
                      <Cell fill={item.color} key={item.name} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white">322</span>
                <span className="text-xs text-slate-500">Open alerts</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              {riskDistribution.map((item) => (
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
                <h2 className="font-semibold text-white">Priority alert queue</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Review and escalate high-confidence risk signals.
                </p>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                  <Search className="mr-2 h-4 w-4 text-slate-500" />
                  <input
                    className="w-40 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search alerts"
                    value={query}
                  />
                </div>
                <select
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 outline-none"
                  onChange={(event) => setSeverityFilter(event.target.value as Severity | "All")}
                  value={severityFilter}
                >
                  <option>All</option>
                  <option>Critical</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-medium">Alert</th>
                    <th className="px-5 py-4 font-medium">Transaction</th>
                    <th className="px-5 py-4 font-medium">Risk score</th>
                    <th className="px-5 py-4 font-medium">Severity</th>
                    <th className="px-5 py-4 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.map((alert) => (
                    <tr
                      className={`border-t border-slate-800 transition hover:bg-slate-800/60 ${
                        selectedAlertId === alert.id ? "bg-cyan-400/5" : ""
                      }`}
                      key={alert.id}
                    >
                      <td className="px-5 py-4">
                        <button
                          className="text-left"
                          onClick={() => setSelectedAlertId(alert.id)}
                        >
                          <p className="font-medium text-slate-100">{alert.customer}</p>
                          <p className="mt-1 text-xs text-slate-500">{alert.id}</p>
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-200">{currency.format(alert.amount)}</p>
                        <p className="mt-1 text-xs text-slate-500">{alert.transactionType}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-400"
                              style={{ width: `${alert.riskScore}%` }}
                            />
                          </div>
                          <span className="font-semibold text-slate-100">{alert.riskScore}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${severityClass[alert.severity]}`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-400">{alert.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-2xl border border-cyan-400/15 bg-gradient-to-b from-cyan-400/[0.07] to-slate-900/80 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-300">
                  Selected investigation
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">{selectedAlert.id}</h2>
              </div>
              <Bot className="h-6 w-6 text-cyan-300" />
            </div>

            <div className="mt-5 rounded-xl border border-slate-700/80 bg-slate-950/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">AI risk score</span>
                <span className="text-3xl font-bold text-rose-300">
                  {selectedAlert.riskScore}<span className="text-base text-slate-500">/100</span>
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-400"
                  style={{ width: `${selectedAlert.riskScore}%` }}
                />
              </div>
            </div>

            <div className="mt-5">
              <p className="text-sm font-medium text-slate-200">Evidence summary</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">{selectedAlert.reason}.</p>
            </div>

            <div className="mt-5 space-y-3">
              {[
                ["Behavior deviation", "High impact", "text-rose-300"],
                ["Account network signal", "Elevated", "text-amber-300"],
                ["Known fraud pattern", "Under review", "text-cyan-300"],
              ].map(([label, value, color]) => (
                <div className="flex items-center justify-between rounded-lg bg-slate-950/40 px-3 py-2.5" key={label}>
                  <span className="text-sm text-slate-400">{label}</span>
                  <span className={`text-xs font-medium ${color}`}>{value}</span>
                </div>
              ))}
            </div>

            <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white">
              Open investigation workspace
              <ArrowUpRight className="h-4 w-4" />
            </button>
            <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-slate-500">
              <Sparkles className="h-3 w-3" />
              Synthetic demo data. Human review required.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
