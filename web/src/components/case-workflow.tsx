"use client";

import { useState } from "react";
import { CheckCircle2, Download, FilePlus2, LoaderCircle } from "lucide-react";

type Signal = { name: string; detail: string };

type Props = {
  transaction: Record<string, string | number>;
  riskScore: number;
  riskBand: string;
  supportingSignals: Signal[];
  aiBrief: string;
};

export function CaseWorkflow(props: Props) {
  const [caseId, setCaseId] = useState("");
  const [status, setStatus] = useState("");
  const [events, setEvents] = useState<Array<{ eventType: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(false);

  async function createCase() {
    setLoading(true);
    const response = await fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...props, aiBrief: props.aiBrief || null }),
    });
    const payload = await response.json();
    setCaseId(payload.case.id);
    setStatus(payload.case.status);
    setEvents(payload.events);
    setLoading(false);
  }

  async function updateCase(nextStatus: "ESCALATED" | "CLOSED") {
    setLoading(true);
    const response = await fetch(`/api/cases/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const payload = await response.json();
    setStatus(payload.case.status);
    setEvents(payload.events);
    setLoading(false);
  }

  function exportBrief() {
    const content = `Sentinel Investigation Case\nRisk score: ${props.riskScore}\nRisk band: ${props.riskBand}\n\n${props.aiBrief || "No AI brief generated."}`;
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `sentinel-case-${caseId || "draft"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Case decision workflow</h2>
      <p className="mt-1 text-sm text-slate-600">Create an auditable investigation record after reviewing the score.</p>

      {!caseId ? (
        <button className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white" disabled={loading} onClick={() => void createCase()} type="button">
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
          Create investigation case
        </button>
      ) : (
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-800">{status}</span>
            <span className="text-xs text-slate-500">Case {caseId}</span>
            {status === "OPEN" && <button className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white" disabled={loading} onClick={() => void updateCase("ESCALATED")} type="button">Escalate</button>}
            {status !== "CLOSED" && <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" disabled={loading} onClick={() => void updateCase("CLOSED")} type="button">Close case</button>}
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" onClick={exportBrief} type="button"><Download className="h-4 w-4" /> Export brief</button>
          </div>
          <div className="mt-5 border-l-2 border-cyan-300 pl-4">
            {events.map((event) => <p className="mb-2 text-sm text-slate-600" key={`${event.eventType}-${event.createdAt}`}><CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-600" />{event.eventType} · {new Date(event.createdAt).toLocaleString()}</p>)}
          </div>
        </div>
      )}
    </section>
  );
}
