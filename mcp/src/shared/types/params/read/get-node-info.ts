import { z } from "zod";

export const GetNodeInfoParamsSchema = z.object({
    id: z.string().describe("Node id — use the exact id returned by other tools (e.g. 145:314). Do NOT combine or modify IDs."),
});

export type GetNodeInfoParams = z.infer<typeof GetNodeInfoParamsSchema>;