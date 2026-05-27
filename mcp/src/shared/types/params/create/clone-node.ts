import z from "zod";

export const CloneNodeParamsSchema = z.object({
    id: z.string().regex(/^\d*:\d*$/).describe("Node id — use the exact id returned by other tools (e.g. 145:314). Do NOT combine or modify IDs.")
});

export type CloneNodeParams = z.infer<typeof CloneNodeParamsSchema>;