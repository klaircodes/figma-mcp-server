import z from "zod";

export const ResizeNodeParamsSchema = z.object({
    id: z.string().describe("Node id — use the exact id returned by other tools (e.g. 145:314). Do NOT combine or modify IDs."),
    width: z.coerce.number().describe("Width in pixels (number)"),
    height: z.coerce.number().describe("Height in pixels (number)"),
});

export type ResizeNodeParams = z.infer<typeof ResizeNodeParamsSchema>;