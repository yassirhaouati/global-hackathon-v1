import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createOrchestratorAgent = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    logicType: v.string(),
    code: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("orchestrator_agents", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const listOrchestratorAgents = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("orchestrator_agents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getOrchestratorAgent = query({
  args: { agentId: v.id("orchestrator_agents") },
  handler: async (ctx, { agentId }) => {
    return await ctx.db.get(agentId);
  },
});

export const updateOrchestratorAgent = mutation({
  args: {
    agentId: v.id("orchestrator_agents"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    code: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { agentId, ...updates } = args;
    await ctx.db.patch(agentId, updates);
  },
});

export const deleteOrchestratorAgent = mutation({
  args: { agentId: v.id("orchestrator_agents") },
  handler: async (ctx, { agentId }) => {
    await ctx.db.delete(agentId);
  },
});
