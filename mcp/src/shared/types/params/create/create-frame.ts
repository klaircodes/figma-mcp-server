import z from "zod";
import { ColorSchema } from "../shared/color.js";

export const CreateFrameParamsSchema = z.object({
    x: z.coerce.number().describe("X position in pixels (number)"),
    y: z.coerce.number().describe("Y position in pixels (number)"),
    width: z.coerce.number().optional().default(400).describe("Width in pixels (number, default 400)"),
    height: z.coerce.number().optional().default(300).describe("Height in pixels (number, default 300)"),
    name: z.string().optional().default("Frame").describe("Name of the frame"),
    parentId: z.string().regex(/^\d*:\d*$/).optional().describe("Parent node id — use the exact id returned by get-pages or create-frame (e.g. 9:2). Do NOT combine IDs. If omitted, created on current page."),
});

export type CreateFrameParams = z.infer<typeof CreateFrameParamsSchema>;