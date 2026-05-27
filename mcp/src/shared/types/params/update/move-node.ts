import z from "zod";

export const MoveNodeParamsSchema = z.object({
    id: z.string().describe("Node id — use the exact id returned by other tools (e.g. 145:314). Do NOT combine or modify IDs."),
    x: z.coerce.number().describe("X position in pixels (number)"),
    y: z.coerce.number().describe("Y position in pixels (number)"),
});

export type MoveNodeParams = z.infer<typeof MoveNodeParamsSchema>;