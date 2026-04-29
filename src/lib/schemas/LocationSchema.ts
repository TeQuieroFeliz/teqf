import { z } from "zod";

export const locationSchema = z.object({
  city: z.string().min(1, "Enter city name"),
});
