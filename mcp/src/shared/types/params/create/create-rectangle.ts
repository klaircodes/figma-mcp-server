import z from "zod";

export const CreateRectangleParamsSchema = z.object({
    x: z.coerce.number().describe("X position in pixels (number)"),
    y: z.coerce.number().describe("Y position in pixels (number)"),
    width: z.coerce.number().describe("Width in pixels (number)"),
    height: z.coerce.number().describe("Height in pixels (number)"),
    name: z.string().optional().default("Rectangle").describe("Name of the rectangle"),
    parentId: z.string().regex(/^\d*:\d*$/).optional().describe("Parent node id — use the exact id returned by get-pages or create-frame (e.g. 9:2). Do NOT combine IDs. If omitted, created on current page."),
});

export type CreateRectangleParams = z.infer<typeof CreateRectangleParamsSchema>;