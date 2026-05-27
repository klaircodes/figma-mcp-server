import z from "zod";
import { ColorHexSchema } from "../shared/color-hex.js";

export const SetStrokeColorParamsSchema = z.object({
    id: z.string().describe("Node id — use the exact id returned by other tools (e.g. 145:314). Do NOT combine or modify IDs."),
    color: ColorHexSchema.describe("Stroke color as RGBA hex string (e.g. #FF0000FF for red, #000000FF for black)"),
});

export type SetStrokeColorParams = z.infer<typeof SetStrokeColorParamsSchema>;