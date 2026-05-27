import z from "zod";
import { ColorHexSchema } from "../shared/color-hex.js";

export const CreateTextParamsSchema = z.object({
    x: z.coerce.number().describe("X position in pixels (number)"),
    y: z.coerce.number().describe("Y position in pixels (number)"),
    text: z.string().describe("Text content to display"),
    fontSize: z.coerce.number().optional().default(14).describe("Font size in pixels (number, default 14)"),
    fontName: z.string().optional().default("Inter").describe("Font family name (default Inter)"),
    fontWeight: z.coerce.number().optional().default(400).describe("Font weight as number: 100, 200, 300, 400 (regular), 500, 600, 700 (bold), 800, 900 (default 400)"),
    fontColor: ColorHexSchema.optional().default("#000000FF").describe("Font color as RGBA hex string (e.g. #000000FF)"),
    name: z.string().optional().default("Text").describe("Name of the text node"),
    parentId: z.string().regex(/^\d*:\d*$/).optional().describe("Parent node id — use the exact id returned by get-pages or create-frame (e.g. 9:2). Do NOT combine IDs. If omitted, created on current page."),
});

export type CreateTextParams = z.infer<typeof CreateTextParamsSchema>;