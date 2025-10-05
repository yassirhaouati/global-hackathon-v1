"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function prettyDate(ms?: number) {
  if (!ms) return "-";
  return new Date(ms).toLocaleString();
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />;
}

function StatCard({
  title,
  value,
  href,
  cta,
  loading,
}: {
  title: string;
  value?: number;
  href: string;
  cta: string;
  loading: boolean;
}) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wide text-[var(--muted)] mb-1">{title}</div>
      <div className="text-3xl font-semibold">
        {loading ? <Skeleton className="h-8 w-14" /> : value ?? 0}
      </div>
      <Link href={href} className="mt-3 inline-flex items-center gap-1 text-sm btn-ghost">
        {cta} <span className="opacity-60">→</span>
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useUser();

  const agents = useQuery(api.agents.listMine, user ? { userId: user.id } : "skip");
  const workflows = useQuery(api.workflows.listWorkflows, user ? { userId: user.id } : "skip");
  const runs = useQuery(api.runs.listRuns, user ? { userId: user.id } : "skip");

  const loading =
    agents === undefined || workflows === undefined || runs === undefined;

  return (
    <main className="container py-8">
      {/* Signed-out welcome */}
      <SignedOut>
        <div className="max-w-xl mx-auto text-center card p-10 fade-in">
          <h1 className="text-3xl font-semibold mb-2">
            Welcome to <span className="gradient-text">PostOp AI Orchestrator</span>
          </h1>
          <p className="text-[var(--muted)] mb-6">
            Sign in to manage agents, build workflows, and run orchestrations.
          </p>
          <SignInButton>
            <button className="btn btn-primary px-5">Sign In</button>
          </SignInButton>
        </div>
      </SignedOut>

      {/* Main dashboard */}
      <SignedIn>
        {/* Top bar */}
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight mb-1">Dashboard</h1>
          <p className="text-[var(--muted)]">
            Quick overview of your agents, workflows, and recent runs.
          </p>
        </header>

        {/* Primary nav actions */}
        <nav className="flex flex-wrap gap-3 mb-8">
          <Link href="/inventory" className="btn">Inventory</Link>
          <Link href="/orchestrate" className="btn">Orchestrate</Link>
        </nav>

        {/* Stats */}
        <section className="grid gap-5 sm:grid-cols-2 mb-8">
          <StatCard
            title="Agents"
            value={agents?.length}
            href="/inventory"
            cta="Manage Agents"
            loading={loading}
          />
          <StatCard
            title="Workflows"
            value={workflows?.length}
            href="/orchestrate"
            cta="Open Orchestrator"
            loading={loading}
          />
        </section>

        {/* Recent runs */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Runs</h2>
            <Link href="/orchestrate" className="btn btn-ghost text-sm">
              See all
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : runs && runs.length > 0 ? (
            <ul className="space-y-3">
              {runs.slice(0, 3).map((r) => (
                <li key={r._id} className="surface p-4 rounded-xl hover-lift">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 font-medium">
                        <span
                          className={`pill ${
                            r.status === "completed"
                              ? "text-green-400 border-green-500/30"
                              : r.status === "failed"
                              ? "text-red-400 border-red-500/30"
                              : "text-yellow-300 border-yellow-400/30"
                          }`}
                        >
                          {r.status === "completed"
                            ? "Completed"
                            : r.status === "failed"
                            ? "Failed"
                            : "Pending"}
                        </span>
                        <span className="opacity-70">Run {r._id.slice(-6)}</span>
                      </div>
                      <div className="text-xs text-[var(--muted)] mt-1">
                        Started: {prettyDate(r.createdAt)}
                      </div>
                    </div>
                    <pre className="max-w-[55%] w-full bg-white/5 border border-[var(--border)] text-xs p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(r.output ?? r.input ?? {}, null, 2)}
                    </pre>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">No runs yet. Create a workflow in the Orchestrator.</div>
          )}
        </section>
      </SignedIn>
    </main>
  );
}
