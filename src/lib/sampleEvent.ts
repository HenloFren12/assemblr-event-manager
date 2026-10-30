// src/lib/sampleEvent.ts
// Offline fallback for the demo video: works with no API call and no network.
import { buildTasks } from '../../shared/applyPatch';
import { addDays, todayIST } from '../../shared/dependencyEngine';
import type { AiTask, EventProfile, Task } from '../../shared/schemas';

export function buildSampleEvent(today: string = todayIST()): {
  profile: EventProfile;
  tasks: Task[];
  assumptions: string[];
} {
  const profile: EventProfile = {
    type: 'Diwali Mela',
    date: addDays(today, 21),
    attendees: 300,
    venueType: 'outdoor',
    budgetCash: 25000,
    inKindNotes: 'Primary school ground is donated. Local sweet shop may sponsor snacks.',
    volunteers: [
      { id: 'v1', name: 'Asha', skills: ['logistics', 'permits'], availability: 'flexible', active: true },
      { id: 'v2', name: 'Ravi', skills: ['sound', 'electrical'], availability: 'weekends', active: true },
      { id: 'v3', name: 'Meena', skills: ['food', 'outreach'], availability: 'evenings', active: true },
      { id: 'v4', name: 'Imran', skills: ['safety', 'first aid'], availability: 'weekends', active: true },
      { id: 'v5', name: 'Priya', skills: ['decor', 'design'], availability: 'weekdays', active: true },
    ],
    priorities: ['Safety', 'Food quality', 'Decor'],
    nonNegotiables: ['First-aid desk on site'],
    culturalNotes: 'Mixed-faith neighbourhood. Vegetarian-only food stalls.',
  };

  const ai: AiTask[] = [
    { id: 't1', title: 'Confirm school ground and date in writing', category: 'venue', ownerId: 'v1', dependsOn: [], durationDays: 3, priority: 'must', costEstimate: 0, reason: 'Everything else depends on the venue.' },
    { id: 't2', title: 'Apply for loudspeaker and event permission', category: 'permits', ownerId: 'v1', dependsOn: ['t1'], durationDays: 5, priority: 'must', costEstimate: 500, reason: 'Needs the confirmed venue. Confirm rules with the local office.' },
    { id: 't3', title: 'Arrange sound system and extension wiring', category: 'sound', ownerId: 'v2', dependsOn: ['t2'], durationDays: 3, priority: 'should', costEstimate: 6000, inKindOption: 'Borrow the school PA system', reason: 'Booked only after permission.' },
    { id: 't4', title: 'Set up first-aid desk and fire safety plan', category: 'safety', ownerId: 'v4', dependsOn: ['t1'], durationDays: 3, priority: 'must', costEstimate: 1500, reason: 'Non-negotiable.' },
    { id: 't5', title: 'Recruit and brief food stall holders', category: 'food', ownerId: 'v3', dependsOn: ['t1'], durationDays: 6, priority: 'must', costEstimate: 3000, inKindOption: 'Ask the sweet shop to sponsor snacks', reason: 'Food quality is priority two.' },
    { id: 't6', title: 'Design and print posters and WhatsApp invite', category: 'outreach', ownerId: 'v5', dependsOn: ['t1'], durationDays: 4, priority: 'should', costEstimate: 2500, inKindOption: 'Digital invite only', reason: 'Needs confirmed date and venue.' },
    { id: 't7', title: 'Decorate entrance with diyas and rangoli', category: 'decor', ownerId: 'v5', dependsOn: ['t6'], durationDays: 2, priority: 'nice', costEstimate: 5000, inKindOption: 'Collect diyas from residents', reason: 'Easy to scale down.' },
    { id: 't8', title: 'Plan stage programme and run-sheet', category: 'program', ownerId: 'v3', dependsOn: ['t3'], durationDays: 2, priority: 'should', costEstimate: 0, reason: 'Needs to know the sound setup.' },
    { id: 't9', title: 'Event-day volunteer briefing and teardown plan', category: 'misc', ownerId: 'v1', dependsOn: ['t4', 't5', 't8'], durationDays: 1, priority: 'must', costEstimate: 0, reason: 'Last step before the event.' },
  ];

  return {
    profile,
    tasks: buildTasks(ai, profile.date, today),
    assumptions: ['Weather is dry (use the rain what-if to test)', 'The school allows evening use', 'Costs are rough INR estimates, verify locally'],
  };
}
