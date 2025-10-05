import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  agents: defineTable({
    userId: v.string(),
    name: v.string(),
    type: v.string(),
    manifest: v.any(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  catalog_agents: defineTable({
    type: v.string(),
    name: v.string(),
    slug: v.string(),
    manifest: v.any(),
    createdAt: v.number(),
  }),

  orchestrator_agents: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    logicType: v.string(),
    code: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  workflows: defineTable({
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
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  runs: defineTable({
    userId: v.string(),
    workflowId: v.id("workflows"),
    input: v.optional(v.any()),
    output: v.optional(v.any()),
    log: v.optional(v.any()),
    status: v.string(), 
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
