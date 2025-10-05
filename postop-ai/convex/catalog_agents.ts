import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listCatalogAgents = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("catalog_agents").order("desc").collect();
  },
});

export const insertCatalogAgent = mutation({
  args: {
    type: v.string(),
    name: v.string(),
    slug: v.string(),
    manifest: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("catalog_agents", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getCatalogAgentBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("catalog_agents")
      .filter((q) => q.eq(q.field("slug"), args.slug))
      .first();
  },
});
