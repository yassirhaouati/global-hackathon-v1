"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useUser, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

function Card({ children }: { children: React.ReactNode }) {
  return <div className="border rounded-xl p-4">{children}</div>;
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
    () => [
      {
        slug: "log-parser",
        name: "Log Parser",
        type: "prompt",
        manifest: {
          inputSchema: { text: "string" },
          outputSchema: { signals: "any" },
          prompt:
            "Extract key metrics, services, and errors as JSON array named signals from:\\n{{text}}",
        },
      },
      {
        slug: "anomaly-detector",
        name: "Anomaly Detector",
        type: "transform",
        manifest: {
          inputSchema: { signals: "any" },
          outputSchema: { anomalies: "any" },
          transform: `
            const a=[]; 
            const s=input.signals||[]; 
            for(const x of s){
              if(x.type==='cpu' && Number(x.value)>90) a.push({name:'High CPU',score:0.8});
              if(x.type==='error_rate' && Number(x.value)>1) a.push({name:'Elevated Errors',score:0.7});
              if(x.type==='latency_p95' && Number(x.value)>400) a.push({name:'High Latency',score:0.6});
            }
            return { anomalies:a };
          `,
        },
      },
      {
        slug: "severity-scorer",
        name: "Severity Scorer",
        type: "transform",
        manifest: {
          inputSchema: { anomalies: "any" },
          outputSchema: { severity: "string", rationale: "string" },
          transform: `
            const a=input.anomalies||[]; 
            const max=(a.reduce((m,x)=>Math.max(m,x.score||0),0)); 
            let sev='P3'; 
            if(max>=0.8) sev='P1'; else if(max>=0.6) sev='P2'; 
            return { severity: sev, rationale: \`Top anomaly score \${max}\` };
          `,
        },
      },
      {
        slug: "action-planner",
        name: "Action Planner",
        type: "prompt",
        manifest: {
          inputSchema: { severity: "string", anomalies: "any" },
          outputSchema: { summary: "string", next_actions: "any" },
          prompt:
            "Given severity {{severity}} and anomalies {{anomalies}}, write a 2-sentence incident summary and a JSON array next_actions of 2-3 steps.",
        },
      },
      {
        slug: "notifier",
        name: "Notifier (Mock)",
        type: "http-mock",
        manifest: {
          inputSchema: {
            severity: "string",
            summary: "string",
            next_actions: "any",
          },
          outputSchema: { posted: "boolean", channel: "string" },
          url: "https://example.com/mock",
          method: "POST",
        },
      },
    ],
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
    <main className="p-6 max-w-6xl mx-auto">
      <SignedOut>
        <div className="max-w-lg mx-auto mt-16 text-center border rounded-xl p-8">
          <h1 className="text-2xl font-semibold mb-2">Inventory</h1>
          <p className="text-gray-600 mb-6">Sign in to manage your agents.</p>
          <SignInButton>
            <button className="bg-black text-white px-5 py-2 rounded">Sign In</button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="text-gray-600">
            Manage your installed agents and add new ones from the catalog.
          </p>
        </header>

        <nav className="flex gap-3 mb-6">
          <Link href="/" className="px-3 py-2 rounded border hover:bg-gray-50">
            Dashboard
          </Link>
          <Link href="/orchestrate" className="px-3 py-2 rounded border hover:bg-gray-50">
            Orchestrate
          </Link>
        </nav>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">My Agents</h2>
              <span className="text-sm text-gray-500">{myAgents?.length ?? 0}</span>
            </div>
            {myAgents === undefined ? (
              <div className="text-gray-600">Loading…</div>
            ) : myAgents.length === 0 ? (
              <div className="text-gray-600">
                No agents installed yet. Install from the Catalog on the right.
              </div>
            ) : (
              <ul className="divide-y">
                {myAgents.map((a) => (
                  <li key={a._id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs text-gray-500">{a.type}</div>
                    </div>
                    <button
                      onClick={() => onDelete(a._id)}
                      className="text-sm px-3 py-1 border rounded hover:bg-gray-50"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Catalog</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{catalog?.length ?? 0}</span>
                <button
                  onClick={onSeed}
                  disabled={seeding}
                  className="text-sm px-3 py-1 border rounded hover:bg-gray-50"
                >
                  {seeding ? "Seeding…" : "Seed Demo"}
                </button>
              </div>
            </div>

            {catalog === undefined ? (
              <div className="text-gray-600">Loading…</div>
            ) : catalog.length === 0 ? (
              <div className="text-gray-600">
                Catalog is empty. Click <b>Seed Demo</b> to add sample agents.
              </div>
            ) : (
              <ul className="divide-y">
                {catalog.map((c) => (
                  <li key={c._id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-gray-500">
                        {c.type} · {c.slug}
                      </div>
                    </div>
                    <button
                      onClick={() => onInstall(c._id)}
                      className="text-sm px-3 py-1 border rounded hover:bg-gray-50"
                    >
                      Install
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </SignedIn>
    </main>
  );
}
