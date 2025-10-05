"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type Step = { agentId: Id<"agents">; inputMapping?: any };

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />;
}

function Section({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-[var(--muted)] mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ok" | "warn" | "bad" }) {
  const map: Record<string, string> = {
    neutral: "bg-white/5 text-[var(--muted)]",
    ok: "bg-emerald-500/15 text-emerald-300",
    warn: "bg-amber-500/15 text-amber-300",
    bad: "bg-rose-500/15 text-rose-300",
  };
  return <span className={`px-2.5 py-1 rounded-full text-xs ${map[tone]}`}>{children}</span>;
}

export default function OrchestratePage() {
  const { user } = useUser();

  // --- Queries ---
  const agents = useQuery(api.agents.listMine, user ? { userId: user.id } : "skip");
  const orchestrators = useQuery(
    api.orchestrator_agents.listOrchestratorAgents,
    user ? { userId: user.id } : "skip"
  );
  const workflows = useQuery(api.workflows.listWorkflows, user ? { userId: user.id } : "skip");
  const runs = useQuery(api.runs.listRuns, user ? { userId: user.id } : "skip");

  // --- Mutations / Actions ---
  const createWorkflow = useMutation(api.workflows.createWorkflow);
  const deleteWorkflow = useMutation(api.workflows.deleteWorkflow);
  const runWorkflow = useAction(api.orchestrator.runWorkflow);

  // --- Local state ---
  const [wfName, setWfName] = useState("");
  const [wfDesc, setWfDesc] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<Step[]>([]);
  const [selectedOrchs, setSelectedOrchs] = useState<Id<"orchestrator_agents">[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Id<"workflows"> | null>(null);
  const [inputJson, setInputJson] = useState<string>('{"text": "Sample incident log text"}');
  const [running, setRunning] = useState(false);

  const loading =
    agents === undefined || workflows === undefined || orchestrators === undefined || runs === undefined;

  const myRuns = useMemo(() => {
    const list = runs ?? [];
    return selectedWorkflow ? list.filter((r) => r.workflowId === selectedWorkflow).slice(0, 5) : list.slice(0, 5);
  }, [runs, selectedWorkflow]);

  // --- Step helpers ---
  function addAgent(agentId: Id<"agents">) {
    setSelectedAgents((prev) => [...prev, { agentId }]);
  }
  function removeStep(i: number) {
    setSelectedAgents((prev) => prev.filter((_, idx) => idx !== i));
  }
  function moveStep(i: number, dir: -1 | 1) {
    setSelectedAgents((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function addOrchestrator(id: Id<"orchestrator_agents">) {
    setSelectedOrchs((prev) => [...prev, id]);
  }
  function removeOrchestrator(i: number) {
    setSelectedOrchs((prev) => prev.filter((_, idx) => idx !== i));
  }

  // --- Actions ---
  async function onCreateWorkflow() {
    if (!user) return;
    if (!wfName || selectedAgents.length === 0) {
      alert("Give the workflow a name and add at least one agent.");
      return;
    }
    const id = await createWorkflow({
      userId: user.id,
      name: wfName,
      description: wfDesc || undefined,
      steps: selectedAgents,
      orchestratorIds: selectedOrchs.length ? selectedOrchs : undefined,
    });
    setWfName("");
    setWfDesc("");
    setSelectedAgents([]);
    setSelectedOrchs([]);
    setSelectedWorkflow(id);
  }

  async function onRunWorkflow() {
    if (!user || !selectedWorkflow) {
      alert("Select a workflow first.");
      return;
    }
    setRunning(true);
    try {
      const input = inputJson ? JSON.parse(inputJson) : {};
      await runWorkflow({ userId: user.id, workflowId: selectedWorkflow, input });
    } catch (e: any) {
      alert("Run failed: " + e.message);
    } finally {
      setRunning(false);
    }
  }

  async function onDeleteWorkflow(id: Id<"workflows">) {
    await deleteWorkflow({ workflowId: id });
    if (selectedWorkflow === id) setSelectedWorkflow(null);
  }

  return (
    <main className="container py-8">
      {/* Signed out */}
      <SignedOut>
        <div className="max-w-xl mx-auto text-center card p-10">
          <h1 className="text-3xl font-semibold mb-2">Orchestrate</h1>
          <p className="text-[var(--muted)] mb-6">Sign in to build and run workflows.</p>
          <SignInButton>
            <button className="btn btn-primary px-5">Sign In</button>
          </SignInButton>
        </div>
      </SignedOut>

      {/* Signed in */}
      <SignedIn>
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight mb-1">Orchestrator</h1>
          <p className="text-[var(--muted)]">
            Build a workflow from your agents, optionally add adapter agents, and run it.
          </p>
        </header>

        <nav className="flex gap-3 mb-8">
          <Link href="/" className="btn">Dashboard</Link>
          <Link href="/inventory" className="btn">Inventory</Link>
        </nav>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Builder column */}
          <div className="md:col-span-2 space-y-6">
            {/* Create workflow */}
            <Section
              title="Create Workflow"
              subtitle="Pick agents as steps, optionally add adapters, then save"
              right={<Badge tone="neutral">{selectedAgents.length} steps</Badge>}
            >
              <div className="grid gap-3">
                <input
                  value={wfName}
                  onChange={(e) => setWfName(e.target.value)}
                  className="input"
                  placeholder="Workflow name"
                />
                <input
                  value={wfDesc}
                  onChange={(e) => setWfDesc(e.target.value)}
                  className="input"
                  placeholder="(optional) description"
                />

                <div>
                  <div className="text-sm text-[var(--muted)] mb-2">Steps (click an agent to add)</div>
                  {agents === undefined ? (
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-28" />
                      <Skeleton className="h-9 w-40" />
                      <Skeleton className="h-9 w-24" />
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {(agents ?? []).map((a) => (
                        <button
                          key={a._id}
                          onClick={() => addAgent(a._id)}
                          className="btn btn-ghost text-sm"
                          title={`Add ${a.name}`}
                        >
                          + {a.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedAgents.length === 0 ? (
                    <div className="empty">No steps yet — add agents above.</div>
                  ) : (
                    <ol className="space-y-2">
                      {selectedAgents.map((s, i) => {
                        const agent = (agents ?? []).find((a) => a._id === s.agentId);
                        return (
                          <li key={i} className="surface rounded-xl p-3 flex items-center justify-between hover-lift">
                            <div className="flex items-center gap-3">
                              <Badge>Step {i + 1}</Badge>
                              <span className="font-medium">{agent?.name || s.agentId}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button className="btn btn-ghost px-2" onClick={() => moveStep(i, -1)} title="Move up">
                                ↑
                              </button>
                              <button className="btn btn-ghost px-2" onClick={() => moveStep(i, 1)} title="Move down">
                                ↓
                              </button>
                              <button className="btn btn-ghost" onClick={() => removeStep(i)}>
                                Remove
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>

                <div>
                  <div className="text-sm text-[var(--muted)] mb-2">
                    Adapter Agents (optional) — transform/route data between steps
                  </div>
                  {orchestrators === undefined ? (
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-36" />
                      <Skeleton className="h-9 w-28" />
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {(orchestrators ?? []).map((o) => (
                        <button
                          key={o._id}
                          onClick={() => addOrchestrator(o._id)}
                          className="btn btn-ghost text-sm"
                        >
                          + {o.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedOrchs.length > 0 && (
                    <ul className="space-y-2">
                      {selectedOrchs.map((id, i) => {
                        const o = (orchestrators ?? []).find((x) => x._id === id);
                        return (
                          <li key={i} className="surface rounded-xl p-3 flex items-center justify-between hover-lift">
                            <div className="flex items-center gap-3">
                              <Badge tone="neutral">Adapter {i + 1}</Badge>
                              <span className="font-medium">{o?.name || id}</span>
                            </div>
                            <button className="btn btn-ghost" onClick={() => removeOrchestrator(i)}>
                              Remove
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={onCreateWorkflow} className="btn btn-primary">
                    Create Workflow
                  </button>
                </div>
              </div>
            </Section>

            {/* Run workflow */}
            <Section title="Run Workflow" subtitle="Pick a workflow, provide input JSON, and execute">
              <div className="grid gap-3">
                <div>
                  <div className="text-sm text-[var(--muted)] mb-2">Select a workflow</div>
                  {loading ? (
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-28" />
                      <Skeleton className="h-9 w-40" />
                    </div>
                  ) : (workflows ?? []).length === 0 ? (
                    <div className="empty">No workflows yet. Create one above.</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(workflows ?? []).map((w) => (
                        <button
                          key={w._id}
                          onClick={() => setSelectedWorkflow(w._id)}
                          className={`btn text-sm ${
                            selectedWorkflow === w._id ? "btn-primary" : "btn-ghost"
                          }`}
                        >
                          {w.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-[var(--muted)]">Input JSON</div>
                    <button
                      className="btn btn-ghost text-xs"
                      onClick={() => setInputJson('{"text":"Sample incident log text"}')}
                    >
                      Reset sample
                    </button>
                  </div>
                  <textarea
                    value={inputJson}
                    onChange={(e) => setInputJson(e.target.value)}
                    rows={6}
                    className="textarea"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={onRunWorkflow}
                    disabled={running || !selectedWorkflow}
                    className="btn btn-primary disabled:opacity-60"
                  >
                    {running ? "Running…" : "Run Workflow"}
                  </button>
                  {selectedWorkflow && (
                    <button onClick={() => onDeleteWorkflow(selectedWorkflow)} className="btn">
                      Delete Selected
                    </button>
                  )}
                </div>
              </div>
            </Section>
          </div>

          {/* Runs column */}
          <div className="space-y-6">
            <Section title="Recent Runs" subtitle="Latest 5 executions of this or any workflow">
              {runs === undefined ? (
                <div className="space-y-3">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              ) : myRuns.length === 0 ? (
                <div className="empty">No runs yet.</div>
              ) : (
                <ul className="space-y-3">
                  {myRuns.map((r) => {
                    const tone: "ok" | "warn" | "bad" | "neutral" =
                      r.status === "completed" ? "ok" : r.status === "failed" ? "bad" : "neutral";
                    return (
                      <li key={r._id} className="surface rounded-xl p-3 hover-lift">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">Run {r._id.slice(-6)}</div>
                          <Badge tone={tone}>{r.status}</Badge>
                        </div>
                        <div className="text-xs text-[var(--muted)] mb-2">
                          {new Date(r.createdAt).toLocaleString()}
                        </div>
                        <div className="text-xs text-[var(--muted)] mb-1">Output</div>
                        <pre className="bg-white/5 rounded-lg p-2 text-xs overflow-x-auto max-h-48">
                          {JSON.stringify(r.output ?? {}, null, 2)}
                        </pre>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>
          </div>
        </div>
      </SignedIn>
    </main>
  );
}
