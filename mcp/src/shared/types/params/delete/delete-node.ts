import z from "zod";

export const DeleteNodeParamsSchema = z.object({
    id: z.string().regex(/^\d*:\d*$/).describe("Node id — use the exact id returned by other tools (e.g. 145:314). Do NOT combine or modify IDs."),
});

export type DeleteNodeParams = z.infer<typeof DeleteNodeParamsSchema>;