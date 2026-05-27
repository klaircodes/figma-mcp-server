import { z } from "zod";

export const SetNodeComponentPropertyReferencesParamsSchema = z.object({
    id: z.string().regex(/^\d*:\d*$/).describe("Node id — use the exact id returned by other tools (e.g. 145:314). Do NOT combine or modify IDs."),
    componentPropertyReferences: z.record(z.enum(['characters', 'visible', 'mainComponent']), z.string()).describe("Component property references"),
});

export type SetNodeComponentPropertyReferencesParams = z.infer<typeof SetNodeComponentPropertyReferencesParamsSchema>;