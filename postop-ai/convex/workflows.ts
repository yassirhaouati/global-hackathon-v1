import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createWorkflow = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    steps: v.array(
      v.object({
        agentId: v.id("agents"),
        inputMapping: v.optional(v.any()),
      })
    ),
    orchestratorIds: v.optional(v.array(v.id("orchestrator_agents"))),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("workflows", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const listWorkflows = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("workflows")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getWorkflow = query({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, { workflowId }) => {
    return await ctx.db.get(workflowId);
  },
});

export const updateWorkflow = mutation({
  args: {
    workflowId: v.id("workflows"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    steps: v.optional(
      v.array(
        v.object({
          agentId: v.id("agents"),
          inputMapping: v.optional(v.any()),
        })
      )
    ),
    orchestratorIds: v.optional(v.array(v.id("orchestrator_agents"))),
  },
  handler: async (ctx, args) => {
    const { workflowId, ...updates } = args;
    await ctx.db.patch(workflowId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const deleteWorkflow = mutation({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, { workflowId }) => {
    await ctx.db.delete(workflowId);
  },
});
