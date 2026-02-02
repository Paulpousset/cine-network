import { z } from "zod";

export const updatePasswordSchema = z.object({
  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères.")
    .max(50, "Le mot de passe est trop long."),
});
