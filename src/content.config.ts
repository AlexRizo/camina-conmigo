import { defineCollection, z } from "astro:content";
import { file } from "astro/loaders";

const fortaleza = defineCollection({
  loader: file("src/content/fortaleza/fortaleza.json"),
  schema: z.object({
    day: z.number().int().min(1).max(365),
    titulo: z.string(),
    oracion: z.array(z.string()),
    salmo: z.string(),
    quote: z.string(),
  }),
});

export const collections = { fortaleza };
