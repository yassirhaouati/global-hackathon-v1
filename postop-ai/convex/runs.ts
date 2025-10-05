import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createRun = mutation({
  args: {
    userId: v.string(),
    workflowId: v.id("workflows"),
    status: v.string(),
    input: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("runs", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const updateRun = mutation({
  args: {
    runId: v.id("runs"),
    status: v.optional(v.string()),
    output: v.optional(v.any()),
    log: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { runId, ...updates } = args;
    await ctx.db.patch(runId, updates);
  },
});

export const listRuns = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("runs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getRun = query({
  args: { runId: v.id("runs") },
  handler: async (ctx, { runId }) => {
    return await ctx.db.get(runId);
  },
});
