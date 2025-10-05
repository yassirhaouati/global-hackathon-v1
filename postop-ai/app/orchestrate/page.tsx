"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type Step = { agentId: Id<"agents">; inputMapping?: any };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border rounded-xl p-4">
      <h2 className="font-semibold mb-3">{title}</h2>
      {children}
    </section>
  );
}

export default function OrchestratePage() {
  const { user } = useUser();

  // --- Queries ---
  const agents = useQuery(api.agents.listMine, user ? { userId: user.id } : "skip");
  const orchestrators = useQuery(
    api.orchestrator_agents.listOrchestratorAgents,
    user ? { userId: user.id } : "skip"
  );
  const workflows = useQuery(
    api.workflows.listWorkflows,
    user ? { userId: user.id } : "skip"
  );
  const runs = useQuery(api.runs.listRuns, user ? { userId: user.id } : "skip");

  const createWorkflow = useMutation(api.workflows.createWorkflow);
  const deleteWorkflow = useMutation(api.workflows.deleteWorkflow);
  const runWorkflow = useAction(api.orchestrator.runWorkflow);

  const [wfName, setWfName] = useState("");
  const [wfDesc, setWfDesc] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<Step[]>([]);
  const [selectedOrchs, setSelectedOrchs] = useState<Id<"orchestrator_agents">[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Id<"workflows"> | null>(null);
  const [inputJson, setInputJson] = useState<string>('{"text": "Sample incident log text"}');
  const [running, setRunning] = useState(false);

  const myRuns = useMemo(() => {
    const list = runs ?? [];
    return selectedWorkflow
      ? list.filter((r) => r.workflowId === selectedWorkflow).slice(0, 5)
      : list.slice(0, 5);
  }, [runs, selectedWorkflow]);

  function addAgent(agentId: Id<"agents">) {
    setSelectedAgents((prev) => [...prev, { agentId }]);
  }
  function removeStep(i: number) {
    setSelectedAgents((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addOrchestrator(id: Id<"orchestrator_agents">) {
    setSelectedOrchs((prev) => [...prev, id]);
  }
  function removeOrchestrator(i: number) {
    setSelectedOrchs((prev) => prev.filter((_, idx) => idx !== i));
  }

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

  const loading =
    agents === undefined ||
    workflows === undefined ||
    orchestrators === undefined ||
    runs === undefined;

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <SignedOut>
        <div className="max-w-lg mx-auto mt-16 text-center border rounded-xl p-8">
          <h1 className="text-2xl font-semibold mb-2">Orchestrate</h1>
          <p className="text-gray-600 mb-6">Sign in to build and run workflows.</p>
          <SignInButton>
            <button className="bg-black text-white px-5 py-2 rounded">Sign In</button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Orchestrator</h1>
          <p className="text-gray-600">
            Build a workflow from your agents, optionally add orchestrator agents, and run it.
          </p>
        </header>

        <nav className="flex gap-3 mb-6">
          <Link href="/" className="px-3 py-2 rounded border hover:bg-gray-50">Dashboard</Link>
          <Link href="/inventory" className="px-3 py-2 rounded border hover:bg-gray-50">Inventory</Link>
        </nav>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Section title="Create Workflow">
              <div className="grid gap-3">
                <input
                  value={wfName}
                  onChange={(e) => setWfName(e.target.value)}
                  className="border rounded p-2"
                  placeholder="Workflow name"
                />
                <input
                  value={wfDesc}
                  onChange={(e) => setWfDesc(e.target.value)}
                  className="border rounded p-2"
                  placeholder="(optional) description"
                />

                <div>
                  <div className="text-sm text-gray-600 mb-2">Steps (click agents to add)</div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(agents ?? []).map((a) => (
                      <button
                        key={a._id}
                        onClick={() => addAgent(a._id)}
                        className="text-sm px-3 py-1 border rounded hover:bg-gray-50"
                      >
                        + {a.name}
                      </button>
                    ))}
                  </div>

                  {selectedAgents.length === 0 ? (
                    <div className="text-gray-600">No steps yet | add agents above.</div>
                  ) : (
                    <ol className="space-y-2">
                      {selectedAgents.map((s, i) => {
                        const agent = (agents ?? []).find((a) => a._id === s.agentId);
                        return (
                          <li key={i} className="flex items-center justify-between border rounded p-2">
                            <span>
                              <b>Step {i + 1}:</b> {agent?.name || s.agentId}
                            </span>
                            <button
                              className="text-sm px-3 py-1 border rounded hover:bg-gray-50"
                              onClick={() => removeStep(i)}
                            >
                              Remove
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>

                <div>
                  <div className="text-sm text-gray-600 mb-2">
                    Orchestrator Agents (optional, click to add per-step adapters)
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(orchestrators ?? []).map((o) => (
                      <button
                        key={o._id}
                        onClick={() => addOrchestrator(o._id)}
                        className="text-sm px-3 py-1 border rounded hover:bg-gray-50"
                      >
                        + {o.name}
                      </button>
                    ))}
                  </div>
                  {selectedOrchs.length > 0 && (
                    <ul className="space-y-2">
                      {selectedOrchs.map((id, i) => {
                        const o = (orchestrators ?? []).find((x) => x._id === id);
                        return (
                          <li key={i} className="flex items-center justify-between border rounded p-2">
                            <span>
                              <b>Adapter {i + 1}:</b> {o?.name || id}
                            </span>
                            <button
                              className="text-sm px-3 py-1 border rounded hover:bg-gray-50"
                              onClick={() => removeOrchestrator(i)}
                            >
                              Remove
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={onCreateWorkflow} className="bg-black text-white px-4 py-2 rounded">
                    Create Workflow
                  </button>
                </div>
              </div>
            </Section>

            <Section title="Run Workflow">
              <div className="grid gap-3">
                <div>
                  <div className="text-sm text-gray-600 mb-2">Select a workflow</div>
                  {loading ? (
                    <div className="text-gray-600">Loading…</div>
                  ) : (workflows ?? []).length === 0 ? (
                    <div className="text-gray-600">No workflows yet. Create one above.</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(workflows ?? []).map((w) => (
                        <button
                          key={w._id}
                          onClick={() => setSelectedWorkflow(w._id)}
                          className={`text-sm px-3 py-1 border rounded hover:bg-gray-50 ${
                            selectedWorkflow === w._id ? "bg-gray-100" : ""
                          }`}
                        >
                          {w.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm text-gray-600 mb-2">Input JSON</div>
                  <textarea
                    value={inputJson}
                    onChange={(e) => setInputJson(e.target.value)}
                    rows={5}
                    className="w-full border rounded p-2 font-mono text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={onRunWorkflow}
                    disabled={running || !selectedWorkflow}
                    className="bg-black text-white px-4 py-2 rounded disabled:opacity-60"
                  >
                    {running ? "Running…" : "Run Workflow"}
                  </button>
                  {selectedWorkflow && (
                    <button
                      onClick={() => onDeleteWorkflow(selectedWorkflow)}
                      className="px-4 py-2 rounded border hover:bg-gray-50"
                    >
                      Delete Selected
                    </button>
                  )}
                </div>
              </div>
            </Section>
          </div>

          <div className="space-y-6">
            <Section title="Recent Runs">
              {runs === undefined ? (
                <div className="text-gray-600">Loading…</div>
              ) : myRuns.length === 0 ? (
                <div className="text-gray-600">No runs yet.</div>
              ) : (
                <ul className="space-y-3">
                  {myRuns.map((r) => (
                    <li key={r._id} className="border rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">
                          {r.status === "completed" ? "✅" : r.status === "failed" ? "❌" : "⏳"} Run{" "}
                          {r._id.slice(-6)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(r.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">Output</div>
                      <pre className="bg-gray-50 text-xs p-2 rounded overflow-x-auto max-h-48">
                        {JSON.stringify(r.output ?? {}, null, 2)}
                      </pre>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </div>
      </SignedIn>
    </main>
  );
}
