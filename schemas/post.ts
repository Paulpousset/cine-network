import { z } from "zod";

export const postSchema = z.object({
  content: z
    .string()
    .min(1, "Le message ne peut pas être vide.")
    .max(2000, "Le message est trop long (max 2000 caractères)."),
  media_url: z.string().url().optional().nullable(),
  media_type: z.enum(["image", "video"]).optional().nullable(),
});
