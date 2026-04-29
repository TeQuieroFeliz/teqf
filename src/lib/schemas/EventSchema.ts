import z from 'zod';

export const eventSchema = z.object({
  title: z.string().min(1, 'Enter event title'),
});
