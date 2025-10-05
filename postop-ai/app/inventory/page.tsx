"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useUser, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

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
          {subtitle && (
            <p className="text-sm text-[var(--muted)] mt-0.5">{subtitle}</p>
          )}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function AgentRow({
  name,
  type,
  onDelete,
}: {
  name: string;
  type: string;
  onDelete: () => void;
}) {
  return (
    <li className="surface rounded-xl p-3 flex items-center justify-between hover-lift">
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-xs text-[var(--muted)] mt-0.5">{type}</div>
      </div>
      <button onClick={onDelete} className="btn btn-ghost text-sm">
        Delete
      </button>
    </li>
  );
}

function CatalogRow({
  name,
  type,
  slug,
  onInstall,
}: {
  name: string;
  type: string;
  slug: string;
  onInstall: () => void;
}) {
  return (
    <li className="surface rounded-xl p-3 flex items-center justify-between hover-lift">
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-xs text-[var(--muted)] mt-0.5">
          {type} · {slug}
        </div>
      </div>
      <button onClick={onInstall} className="btn btn-primary text-sm">
        Install
      </button>
    </li>
  );
}

export default function InventoryPage() {
  const { user } = useUser();
  const [seeding, setSeeding] = useState(false);

  const myAgents = useQuery(
    api.agents.listMine,
    user ? { userId: user.id } : "skip"
  );
  const catalog = useQuery(api.catalog_agents.listCatalogAgents, {});

  const installFromCatalog = useMutation(api.agents.installFromCatalog);
  const deleteAgent = useMutation(api.agents.deleteAgent);
  const insertCatalogAgent = useMutation(api.catalog_agents.insertCatalogAgent);

  const DEMO = useMemo(
  () =>
    Array.from({ length: 5 }, (_, i) => ({
      slug: `demo-agent-${i + 1}`,
      name: `Agent ${i + 1} (Demo)`,
      type: "demo",
      manifest: {
        inputSchema: { input: "any" },
        outputSchema: { output: "any" },
        description: `Demo agent ${i + 1} placeholder | used for showcasing orchestration.`,
        demoBehavior: `Takes an input and returns a mock output to demonstrate data flow.`,
      },
    })),
  []
);


  async function onSeed() {
    if (seeding) return;
    setSeeding(true);
    try {
      const existingSlugs = new Set((catalog ?? []).map((c) => c.slug));
      for (const a of DEMO) {
        if (!existingSlugs.has(a.slug)) {
          await insertCatalogAgent(a);
        }
      }
    } finally {
      setSeeding(false);
    }
  }

  async function onInstall(catalogId: Id<"catalog_agents">) {
    if (!user) return;
    await installFromCatalog({ userId: user.id, catalogId });
  }

  async function onDelete(agentId: Id<"agents">) {
    if (!user) return;
    await deleteAgent({ userId: user.id, agentId });
  }

  return (
    <main className="container py-8">
      <SignedOut>
        <div className="max-w-xl mx-auto text-center card p-10">
          <h1 className="text-3xl font-semibold mb-2">Inventory</h1>
          <p className="text-[var(--muted)] mb-6">
            Sign in to manage your agents.
          </p>
          <SignInButton>
            <button className="btn btn-primary px-5">Sign In</button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight mb-1">Inventory</h1>
          <p className="text-[var(--muted)]">
            Manage your installed agents and add new ones from the catalog.
          </p>
        </header>

        <nav className="flex gap-3 mb-8">
          <Link href="/" className="btn">Dashboard</Link>
          <Link href="/orchestrate" className="btn">Orchestrate</Link>
        </nav>

        <div className="grid gap-6 md:grid-cols-2">
          {/* My agents */}
          <Section
            title="My Agents"
            subtitle="Agents available to your workflows"
            right={
              <div className="pill text-sm">
                {myAgents?.length ?? 0} total
              </div>
            }
          >
            {myAgents === undefined ? (
              <div className="space-y-3">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : myAgents.length === 0 ? (
              <div className="empty">
                No agents installed yet. Install from the Catalog →
              </div>
            ) : (
              <ul className="space-y-3">
                {myAgents.map((a) => (
                  <AgentRow
                    key={a._id}
                    name={a.name}
                    type={a.type}
                    onDelete={() => onDelete(a._id)}
                  />
                ))}
              </ul>
            )}
          </Section>

          {/* Catalog */}
          <Section
            title="Catalog"
            subtitle="Prebuilt agents ready to install"
            right={
              <div className="flex items-center gap-3">
                <div className="pill text-sm">{catalog?.length ?? 0} items</div>
                <button
                  onClick={onSeed}
                  disabled={seeding}
                  className="btn btn-ghost text-sm"
                >
                  {seeding ? "Seeding…" : "Seed Demo"}
                </button>
              </div>
            }
          >
            {catalog === undefined ? (
              <div className="space-y-3">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : catalog.length === 0 ? (
              <div className="empty">
                Catalog is empty. Click <b>Seed Demo</b> to add sample agents.
              </div>
            ) : (
              <ul className="space-y-3">
                {catalog.map((c) => (
                  <CatalogRow
                    key={c._id}
                    name={c.name}
                    type={c.type}
                    slug={c.slug}
                    onInstall={() => onInstall(c._id)}
                  />
                ))}
              </ul>
            )}
          </Section>
        </div>
      </SignedIn>
    </main>
  );
}
