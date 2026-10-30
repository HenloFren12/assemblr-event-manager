// shared/schemas.ts
import { z } from 'zod';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const CATEGORIES = [
  'venue', 'permits', 'food', 'sound', 'decor', 'outreach', 'safety', 'program', 'misc',
] as const;

export const VolunteerSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().trim().min(1).max(60),
  skills: z.array(z.string().trim().min(1).max(40)).max(10),
  availability: z.enum(['weekdays', 'weekends', 'evenings', 'flexible']),
  active: z.boolean(),
});

export const EventProfileSchema = z.object({
  type: z.string().trim().min(2).max(80),
  date: z.string().regex(DATE_RE),
  attendees: z.number().int().min(1).max(100_000),
  venueType: z.enum(['indoor', 'outdoor', 'public']),
  budgetCash: z.number().min(0).max(10_000_000),
  inKindNotes: z.string().trim().max(500),
  volunteers: z.array(VolunteerSchema).min(1).max(40),
  priorities: z.array(z.string().trim().min(1).max(60)).max(6),
  nonNegotiables: z.array(z.string().trim().min(1).max(100)).max(6),
  culturalNotes: z.string().trim().max(300),
});

export const TaskSchema = z.object({
  id: z.string().regex(/^t\d{1,3}$/),
  title: z.string().trim().min(1).max(120),
  category: z.enum(CATEGORIES),
  ownerId: z.string().max(40).nullable(),
  dependsOn: z.array(z.string().regex(/^t\d{1,3}$/)).max(10),
  dueDate: z.string().regex(DATE_RE),
  durationDays: z.number().int().min(1).max(60),
  priority: z.enum(['must', 'should', 'nice']),
  costEstimate: z.number().min(0).max(10_000_000),
  inKindOption: z.string().trim().max(200).optional(),
  status: z.enum(['todo', 'doing', 'done']),
  reason: z.string().trim().max(240).optional(),
});

// What the AI is allowed to produce: no dates and no status. Code owns those.
export const AiTaskSchema = TaskSchema.omit({ dueDate: true, status: true });

export const AiPlanSchema = z.object({
  tasks: z.array(AiTaskSchema).min(3).max(40),
  assumptions: z.array(z.string().trim().max(200)).max(10),
});

export const TaskChangesSchema = AiTaskSchema.omit({ id: true }).partial();

export const PatchSchema = z.object({
  added: z.array(AiTaskSchema).max(15),
  modified: z.array(z.object({ id: z.string(), changes: TaskChangesSchema })).max(40),
  removed: z.array(z.string()).max(40),
  summary: z.string().trim().max(400),
  tradeoffs: z.array(z.string().trim().max(240)).max(5),
});

export const DisruptionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('volunteer_dropout'), volunteerIds: z.array(z.string()).min(1).max(20) }),
  z.object({ kind: z.literal('budget_cut'), amount: z.number().positive().max(10_000_000) }),
  z.object({ kind: z.literal('weather'), note: z.string().trim().min(1).max(200) }),
  z.object({ kind: z.literal('date_shift'), newDate: z.string().regex(DATE_RE) }),
  z.object({ kind: z.literal('custom'), note: z.string().trim().min(1).max(300) }),
]);

export const ReplanRequestSchema = z.object({
  profile: EventProfileSchema,
  tasks: z.array(TaskSchema).min(1).max(60),
  disruption: DisruptionSchema,
});

export const OutreachRequestSchema = z.object({
  profile: EventProfileSchema,
  kind: z.enum(['sponsor', 'volunteer', 'permit']),
  audience: z.string().trim().min(2).max(120),
  language: z.enum(['en', 'hinglish']),
});

export const OutreachResponseSchema = z.object({
  whatsapp: z.string().trim().min(1).max(700),
  emailSubject: z.string().trim().min(1).max(150),
  emailBody: z.string().trim().min(1).max(2500),
});

export const PlanResponseSchema = z.object({
  tasks: z.array(TaskSchema),
  assumptions: z.array(z.string()),
});

export const ReplanResponseSchema = z.object({
  patch: PatchSchema,
  tasks: z.array(TaskSchema),
});

export type Volunteer = z.infer<typeof VolunteerSchema>;
export type EventProfile = z.infer<typeof EventProfileSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type TaskStatus = Task['status'];
export type AiTask = z.infer<typeof AiTaskSchema>;
export type Patch = z.infer<typeof PatchSchema>;
export type Disruption = z.infer<typeof DisruptionSchema>;
export type ReplanRequest = z.infer<typeof ReplanRequestSchema>;
export type OutreachRequest = z.infer<typeof OutreachRequestSchema>;
export type OutreachResponse = z.infer<typeof OutreachResponseSchema>;
