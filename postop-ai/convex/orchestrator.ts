import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

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

export const runWorkflow = action({
  args: {
    userId: v.string(),
    workflowId: v.id("workflows"),
    input: v.optional(v.any()),
  },
  handler: async (
    ctx,
    { userId, workflowId, input }
  ): Promise<{ runId: Id<"runs"> }> => {
    const workflow = await ctx.runQuery(api.workflows.getWorkflow, { workflowId });
    if (!workflow) throw new Error("Workflow not found");

    const runId: Id<"runs"> = await ctx.runMutation(api.orchestrator.createRun, {
      userId,
      workflowId,
      status: "running",
      input,
    });

    const log: string[] = [];
    let currentOutput: unknown = input ?? {};

    try {
      for (const [i, step] of workflow.steps.entries()) {
        log.push(`⚙️ Running step ${i + 1}: ${step.agentId}`);
        await delay(300);

        currentOutput = {
          ...(typeof currentOutput === "object" && currentOutput !== null ? currentOutput : {}),
          step: i + 1,
          lastAgent: step.agentId,
          output: `Processed by agent ${i + 1}`,
        };
      }

      log.push("✅ Workflow completed successfully");
      await ctx.runMutation(api.orchestrator.updateRun, {
        runId,
        status: "completed",
        output: currentOutput,
        log,
      });
    } catch (err: any) {
      log.push("❌ Workflow failed: " + err.message);
      await ctx.runMutation(api.orchestrator.updateRun, {
        runId,
        status: "failed",
        output: { error: err.message },
        log,
      });
    }

    return { runId };
  },
});

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
