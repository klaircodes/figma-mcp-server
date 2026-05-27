import z from "zod";

export const CreateImageParamsSchema = z.object({
    name: z.string().optional().default("Image").describe("Name of the image node"),
    parentId: z.string().regex(/^\d*:\d*$/).optional().describe("Parent node id — use the exact id returned by get-pages or create-frame (e.g. 9:2). Do NOT combine IDs. If omitted, created on current page."),
    x: z.coerce.number().optional().default(0).describe("X position in pixels (number, default 0)"),
    y: z.coerce.number().optional().default(0).describe("Y position in pixels (number, default 0)"),
    width: z.coerce.number().optional().default(100).describe("Width in pixels (number, default 100)"),
    height: z.coerce.number().optional().default(100).describe("Height in pixels (number, default 100)"),
    url: z.string().describe("Image URL to fetch and embed"),
});

export type CreateImageParams = z.infer<typeof CreateImageParamsSchema>;