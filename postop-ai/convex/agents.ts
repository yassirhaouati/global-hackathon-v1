import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listMine = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("agents").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect();
  },
});

export const installFromCatalog = mutation({
  args: { userId: v.string(), catalogId: v.id("catalog_agents") },
  handler: async (ctx, { userId, catalogId }) => {
    const catalog = await ctx.db.get(catalogId);
    if (!catalog) throw new Error("Catalog agent not found");

    const existing = await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const duplicate = existing.find(
      (a) => a.name === catalog.name || a.type === catalog.type
    );
    if (duplicate) return duplicate._id;

    return await ctx.db.insert("agents", {
      userId,
      name: catalog.name,
      type: catalog.type,
      manifest: catalog.manifest,
      createdAt: Date.now(),
    });
  },
});

export const deleteAgent = mutation({
  args: { userId: v.string(), agentId: v.id("agents") },
  handler: async (ctx, { userId, agentId }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent) throw new Error("Agent not found");
    if (agent.userId !== userId) throw new Error("Unauthorized");
    await ctx.db.delete(agentId);
    return { ok: true };
  },
});
