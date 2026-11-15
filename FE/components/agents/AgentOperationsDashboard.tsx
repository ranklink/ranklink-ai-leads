"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, Bot, CheckCheck, Clock3, RotateCcw, Sparkles, Target, TriangleAlert, type LucideIcon } from "lucide-react";
import { AgentWorkflowScene } from "@/components/agents/AgentWorkflowScene";
import { getAgentStageStates, type AgentStageId, type AgentStageState } from "@/lib/agent-workspace";
import { automationApi } from "@/services/automation.service";
import { Button } from "@/components/ui/button";
import type { RunSummary } from "@/types/automation";

const EMPTY_RUNS: RunSummary[] = [];

function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatStatus(status: RunSummary["status"]) {
  return status.toLowerCase().replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

function StatusDot({ status }: { status: RunSummary["status"] }) {
  return <span aria-label={formatStatus(status)} className={`agent-run-dot agent-run-dot--${status.toLowerCase()}`} />;
}

function MetricCard({ label, value, note, icon: Icon, tone }: { label: string; value: number | null; note: string; icon: LucideIcon; tone: string }) {
  return (
    <article className="agent-metric-card">
      <div className={`agent-metric-icon agent-metric-icon--${tone}`}><Icon size={18} strokeWidth={2} /></div>
      <p className="agent-metric-label">{label}</p>
      <div className="agent-metric-value-row"><p className="agent-metric-value">{value === null ? "—" : value.toLocaleString()}</p><span className="agent-metric-note"><i /> recent</span></div>
      <p className="agent-metric-footnote">{note}</p>
    </article>
  );
}

export function AgentOperationsDashboard() {
  const [selectedAgent, setSelectedAgent] = useState<AgentStageId>("qualification");
  const [sceneVersion, setSceneVersion] = useState(0);
  const runsQuery = useQuery({
    queryKey: ["automation-runs", 1, 50],
    queryFn: () => automationApi.runs(1, undefined, 50),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: 1,
  });

  const runs = runsQuery.data?.items ?? EMPTY_RUNS;
  const runDataState = runsQuery.isLoading ? "loading" : runsQuery.isError && !runsQuery.data ? "unknown" : "ready";
  const agents = useMemo(() => getAgentStageStates(runs, runDataState), [runs, runDataState]);
  const selected = agents.find((agent) => agent.id === selectedAgent) ?? agents[0]!;
  const activeRuns = runs.filter((run) => run.status === "RUNNING").length;
  const queuedRuns = runs.filter((run) => run.status === "QUEUED" || run.status === "WAITING").length;
  const aiCalls = runs.reduce((total, run) => total + run.aiCalls, 0);
  const assessments = runs.reduce((total, run) => total + (run._count?.assessments ?? 0), 0);
  const runningText = runsQuery.isLoading ? "Checking recent run activity" : runsQuery.isError && !runsQuery.data ? "Run status unavailable" : activeRuns ? `${activeRuns} run${activeRuns === 1 ? "" : "s"} in progress` : queuedRuns ? `${queuedRuns} run${queuedRuns === 1 ? "" : "s"} queued for work` : "No runs in progress";

  function presenceLabel(presence: AgentStageState["presence"]) {
    if (presence === "working") return "Working";
    if (presence === "queued") return "Queued";
    if (presence === "review") return "Review";
    if (presence === "loading") return "Checking";
    if (presence === "unknown") return "Unknown";
    return "Ready";
  }

  return (
    <div className="agent-workspace">
      <header className="agent-workspace-header">
        <div>
          <p className="agent-eyebrow"><span className="agent-eyebrow-orb" /> AI LEAD OPERATIONS</p>
          <h1>Agent workspace</h1>
          <p className="agent-workspace-subtitle">A live view of how research, qualification, and outreach move through your workflow.</p>
        </div>
        <div className="agent-header-actions">
          <span className="agent-sync-label"><span className={`agent-presence-pip ${runsQuery.isError ? "is-warning" : ""}`} />{runsQuery.isError ? "Connection issue" : "Syncs every 30 sec"}</span>
          <Link href="/campaigns"><Button className="agent-primary-action"><Sparkles size={16} /> Campaigns <ArrowRight size={15} /></Button></Link>
        </div>
      </header>

      <section className="agent-metrics-grid" aria-label="Recent run metrics">
        <MetricCard label="Active runs" value={runDataState === "ready" ? activeRuns : null} note="Within the latest 50 runs" icon={Activity} tone="blue" />
        <MetricCard label="Waiting for review" value={runDataState === "ready" ? runs.filter((run) => run.status === "WAITING").length : null} note="Human approval stays in control" icon={CheckCheck} tone="violet" />
        <MetricCard label="AI calls" value={runDataState === "ready" ? aiCalls : null} note="Across the latest 50 runs" icon={Bot} tone="mint" />
        <MetricCard label="Leads assessed" value={runDataState === "ready" ? assessments : null} note="Across the latest 50 runs" icon={Target} tone="amber" />
      </section>

      <section className="agent-main-grid" aria-label="Agent workflow visualization">
        <div className="agent-scene-card">
          <div className="agent-scene-heading">
            <div>
              <div className="agent-section-title-row"><h2>Workflow in motion</h2><span className="agent-scene-mode">3D VIEW</span></div>
              <p>{runningText}. Select a station to inspect its role.</p>
            </div>
            <button type="button" className="agent-icon-button" onClick={() => setSceneVersion((version) => version + 1)} aria-label="Reset 3D view" title="Reset 3D view"><RotateCcw size={16} /></button>
          </div>
          {runsQuery.isError && <div className="agent-inline-alert" role="status"><TriangleAlert size={15} /> {runsQuery.data ? "Could not refresh run data. Showing the last received status." : "Run data is temporarily unavailable."} <button type="button" onClick={() => void runsQuery.refetch()}>Retry</button></div>}
          <div className="agent-scene-wrap">
            <AgentWorkflowScene key={sceneVersion} agents={agents} selectedAgent={selectedAgent} onSelectAgent={setSelectedAgent} />
            <div className="agent-scene-hint"><span className="agent-drag-icon">⤢</span> Drag to orbit <span className="agent-hint-divider" /> Scroll to zoom</div>
            <span className="agent-scene-compass" aria-hidden="true">N</span>
          </div>
          <div className="agent-scene-footer"><span><i className="agent-legend-dot is-working" /> Working</span><span><i className="agent-legend-dot is-queued" /> Queued</span><span><i className="agent-legend-dot is-ready" /> Ready</span><span className="agent-scene-help">Click a worker or choose a stage</span></div>
        </div>

        <aside className="agent-side-panel" aria-label="Agent details">
          <div className="agent-panel-card agent-team-card">
            <div className="agent-panel-title-row"><div><p className="agent-panel-kicker">YOUR WORKFLOW</p><h2>Agent team</h2></div><span className="agent-team-count">{agents.length} stages</span></div>
            <div className="agent-team-list">
              {agents.map((agent) => (
                <button key={agent.id} type="button" className={`agent-team-item ${selectedAgent === agent.id ? "is-selected" : ""}`} onClick={() => setSelectedAgent(agent.id)} aria-pressed={selectedAgent === agent.id}>
                  <span className="agent-avatar" style={{ "--agent-color": agent.color } as CSSProperties}><Bot size={18} /></span>
                  <span className="agent-team-copy"><strong>{agent.name}</strong><small>{agent.role}</small></span>
                  <span className={`agent-presence-badge is-${agent.presence}`}><i />{presenceLabel(agent.presence)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="agent-panel-card agent-selected-card" style={{ "--selected-color": selected.color } as CSSProperties}>
            <div className="agent-selected-topline"><span className="agent-selected-mark"><Bot size={20} /></span><span className={`agent-presence-badge is-${selected.presence}`}><i />{presenceLabel(selected.presence)}</span></div>
            <p className="agent-panel-kicker">SELECTED STAGE</p>
            <h2>{selected.name}</h2>
            <p className="agent-selected-description">{selected.description}</p>
            {selected.latestRun ? <div className="agent-selected-run"><div className="agent-selected-run-icon"><Clock3 size={15} /></div><div><strong>{selected.latestRun.campaign.name}</strong><small>{formatStatus(selected.latestRun.status)} · started {formatTime(selected.latestRun.createdAt)}</small></div></div> : <p className="agent-no-run">No recent run at this stage.</p>}
            <Link className="agent-text-link" href="/automations">Open agent runs <ArrowRight size={14} /></Link>
          </div>
        </aside>
      </section>

      <section className="agent-activity-card" aria-labelledby="recent-activity-heading">
        <div className="agent-activity-header"><div><p className="agent-panel-kicker">ACTIVITY FEED</p><h2 id="recent-activity-heading">Recent runs</h2></div><Link href="/automations" className="agent-text-link">View all runs <ArrowRight size={14} /></Link></div>
        {runsQuery.isLoading ? <div className="agent-feed-state" role="status">Loading recent agent activity…</div> : runsQuery.isError && runs.length === 0 ? <div className="agent-feed-state" role="alert"><div className="agent-empty-icon"><TriangleAlert size={18} /></div><strong>Could not load recent runs</strong><span>Check your connection and retry.</span><button type="button" className="agent-feed-retry" onClick={() => void runsQuery.refetch()}>Retry</button></div> : runs.length === 0 ? <div className="agent-feed-state"><div className="agent-empty-icon"><Bot size={19} /></div><strong>No agent runs yet</strong><span>Create a campaign to start discovering and qualifying leads.</span><Link href="/campaigns">Set up a campaign <ArrowRight size={14} /></Link></div> : (
          <div className="agent-run-list">
            {runs.slice(0, 5).map((run) => (
              <Link key={run.id} href={`/automations/${run.id}`} className="agent-run-row">
                <span className="agent-run-status-icon"><StatusDot status={run.status} /></span>
                <span className="agent-run-main"><strong>{run.campaign.name}</strong><small>{run.stage.replaceAll("_", " ")} · {run._count?.assessments ?? 0} assessed</small></span>
                <span className={`agent-run-status-text is-${run.status.toLowerCase()}`}>{formatStatus(run.status)}</span>
                <span className="agent-run-time">{formatTime(run.createdAt)}</span>
                <ArrowRight className="agent-run-arrow" size={15} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
