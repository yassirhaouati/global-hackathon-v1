"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function prettyDate(ms?: number) {
  if (!ms) return "-";
  const d = new Date(ms);
  return d.toLocaleString();
}

export default function DashboardPage() {
  const { user } = useUser();

  const agents = useQuery(
    api.agents.listMine,
    user ? { userId: user.id } : "skip"
  );

  const workflows = useQuery(
    api.workflows.listWorkflows,
    user ? { userId: user.id } : "skip"
  );

  const runs = useQuery(
    api.runs.listRuns,
    user ? { userId: user.id } : "skip"
  );

  const loading = agents === undefined || workflows === undefined || runs === undefined;

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <SignedOut>
        <div className="max-w-lg mx-auto mt-16 text-center border rounded-xl p-8">
          <h1 className="text-2xl font-semibold mb-2">Welcome to your Agent Orchestrator</h1>
          <p className="text-gray-600 mb-6">
            Sign in to manage agents, build workflows, and run orchestrations.
          </p>
          <SignInButton>
            <button className="bg-black text-white px-5 py-2 rounded">Sign In</button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-gray-600">Quick overview of your agents, workflows, and recent runs.</p>
        </header>

        <nav className="flex flex-wrap gap-3 mb-6">
          <Link href="/inventory" className="px-3 py-2 rounded border hover:bg-gray-50">Inventory</Link>
          <Link href="/marketplace" className="px-3 py-2 rounded border hover:bg-gray-50">Marketplace</Link>
          <Link href="/orchestrate" className="px-3 py-2 rounded border hover:bg-gray-50">Orchestrate</Link>
          <Link href="/settings" className="px-3 py-2 rounded border hover:bg-gray-50">Settings</Link>
        </nav>

        <section className="grid gap-4 sm:grid-cols-2 mb-6">
          <div className="border rounded-xl p-4">
            <div className="text-sm text-gray-500">Agents</div>
            <div className="text-2xl font-semibold">{loading ? "…" : agents?.length ?? 0}</div>
            <Link href="/inventory" className="text-sm text-blue-600 underline mt-1 inline-block">
              Manage Agents
            </Link>
          </div>
          <div className="border rounded-xl p-4">
            <div className="text-sm text-gray-500">Workflows</div>
            <div className="text-2xl font-semibold">{loading ? "…" : workflows?.length ?? 0}</div>
            <Link href="/orchestrate" className="text-sm text-blue-600 underline mt-1 inline-block">
              Open Orchestrator
            </Link>
          </div>
        </section>

        <section className="border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent Runs</h2>
            <Link href="/orchestrate" className="text-sm text-blue-600 underline">See all</Link>
          </div>

          {loading ? (
            <div className="text-gray-600">Loading…</div>
          ) : runs && runs.length > 0 ? (
            <ul className="divide-y">
              {runs.slice(0, 3).map((r) => (
                <li key={r._id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {r.status === "completed" ? "✅" : r.status === "failed" ? "❌" : "⏳"} Run {r._id.slice(-6)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Started: {prettyDate(r.createdAt)}
                    </div>
                  </div>
                  <pre className="bg-gray-50 text-xs p-2 rounded max-w-[55%] overflow-x-auto">
                    {JSON.stringify(r.output ?? r.input ?? {}, null, 2)}
                  </pre>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-600">No runs yet. Try creating a workflow in the Orchestrator.</div>
          )}
        </section>
      </SignedIn>
    </main>
  );
}
