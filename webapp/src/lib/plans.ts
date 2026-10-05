import { z } from 'zod';
import { categories } from './transactions';
const base = { name: z.string().trim().min(1).max(100), target: z.number().int().positive().max(1_000_000_000_000) };
export const planSchema = z.discriminatedUnion('kind', [
  z.object({ ...base, kind: z.literal('budget'), month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), category: z.enum(categories) }),
  z.object({ ...base, kind: z.literal('goal'), saved: z.number().int().nonnegative().max(1_000_000_000_000) }),
]);
export type PlanInput = z.infer<typeof planSchema>;
export type Plan = PlanInput & { id: string; ownerId?: string; ownerName?: string; ownerEmail?: string };
