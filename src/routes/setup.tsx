// src/routes/setup.tsx
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { todayIST } from '../../shared/dependencyEngine';
import { EventProfileSchema, type Volunteer } from '../../shared/schemas';
import { generatePlan } from '../lib/apiClient';
import { buildSampleEvent } from '../lib/sampleEvent';
import { useEventStore } from '../store/eventStore';
import { usePlanStore } from '../store/planStore';

const blankVolunteer = (n: number): Volunteer => ({
  id: `v${n}`, name: '', skills: [], availability: 'flexible', active: true,
});
const splitList = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);

export default function Setup() {
  const navigate = useNavigate();
  const setProfile = useEventStore(s => s.setProfile);
  const setPlan = usePlanStore(s => s.setPlan);

  const [type, setType] = useState('');
  const [date, setDate] = useState('');
  const [attendees, setAttendees] = useState(100);
  const [venueType, setVenueType] = useState<'indoor' | 'outdoor' | 'public'>('outdoor');
  const [budgetCash, setBudgetCash] = useState(10000);
  const [inKindNotes, setInKindNotes] = useState('');
  const [priorities, setPriorities] = useState('');
  const [nonNegotiables, setNonNegotiables] = useState('');
  const [culturalNotes, setCulturalNotes] = useState('');
  const [volunteers, setVolunteers] = useState<Volunteer[]>([blankVolunteer(1), blankVolunteer(2), blankVolunteer(3)]);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const updateVolunteer = (i: number, patch: Partial<Volunteer>) =>
    setVolunteers(vs => vs.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const candidate = {
      type, date, attendees, venueType, budgetCash, inKindNotes, culturalNotes,
      priorities: splitList(priorities), nonNegotiables: splitList(nonNegotiables),
      volunteers: volunteers.filter(v => v.name.trim() !== ''),
    };
    const parsed = EventProfileSchema.safeParse(candidate);
    if (!parsed.success) {
      setErrors(parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`));
      return;
    }
    setErrors([]);
    setBusy(true);
    try {
      const plan = await generatePlan(parsed.data);
      setProfile(parsed.data);
      setPlan(plan.tasks, plan.assumptions, parsed.data.date);
      navigate('/board');
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Something went wrong']);
    } finally {
      setBusy(false);
    }
  }

  function loadSample() {
    const sample = buildSampleEvent();
    setProfile(sample.profile);
    setPlan(sample.tasks, sample.assumptions, sample.profile.date);
    navigate('/board');
  }

  return (
    <form onSubmit={onSubmit} aria-describedby="form-errors" noValidate>
      <h1>Plan your community event</h1>
      <button type="button" onClick={loadSample}>Load sample event (works offline)</button>

      <fieldset>
        <legend>The event</legend>
        <label htmlFor="type">What kind of event?</label>
        <input id="type" value={type} onChange={e => setType(e.target.value)} placeholder="Diwali mela, tech meetup…" />
        <label htmlFor="date">Event date</label>
        <input id="date" type="date" min={todayIST()} value={date} onChange={e => setDate(e.target.value)} />
        <label htmlFor="attendees">Expected attendees</label>
        <input id="attendees" type="number" min={1} value={attendees} onChange={e => setAttendees(Number(e.target.value))} />
        <label htmlFor="venue">Venue</label>
        <select id="venue" value={venueType} onChange={e => setVenueType(e.target.value as typeof venueType)}>
          <option value="outdoor">Outdoor</option>
          <option value="indoor">Indoor</option>
          <option value="public">Public space</option>
        </select>
      </fieldset>

      <fieldset>
        <legend>Money and support</legend>
        <label htmlFor="budget">Cash budget (₹)</label>
        <input id="budget" type="number" min={0} step={500} value={budgetCash} onChange={e => setBudgetCash(Number(e.target.value))} />
        <label htmlFor="inkind">Donated or borrowed support</label>
        <textarea id="inkind" maxLength={500} value={inKindNotes} onChange={e => setInKindNotes(e.target.value)} />
      </fieldset>

      <fieldset>
        <legend>Volunteers (first names are enough)</legend>
        {volunteers.map((v, i) => (
          <div key={v.id} className="row">
            <label htmlFor={`vn-${i}`}>Name</label>
            <input id={`vn-${i}`} value={v.name} onChange={e => updateVolunteer(i, { name: e.target.value })} />
            <label htmlFor={`vs-${i}`}>Skills (comma separated)</label>
            <input id={`vs-${i}`} value={v.skills.join(', ')} onChange={e => updateVolunteer(i, { skills: splitList(e.target.value) })} />
            <label htmlFor={`va-${i}`}>Availability</label>
            <select id={`va-${i}`} value={v.availability} onChange={e => updateVolunteer(i, { availability: e.target.value as Volunteer['availability'] })}>
              <option value="flexible">Flexible</option>
              <option value="weekdays">Weekdays</option>
              <option value="weekends">Weekends</option>
              <option value="evenings">Evenings</option>
            </select>
          </div>
        ))}
        <button type="button" disabled={volunteers.length >= 40}
          onClick={() => setVolunteers(vs => [...vs, blankVolunteer(vs.length + 1)])}>Add volunteer</button>
      </fieldset>

      <fieldset>
        <legend>What matters most</legend>
        <label htmlFor="prio">Priorities, most important first (comma separated)</label>
        <input id="prio" value={priorities} onChange={e => setPriorities(e.target.value)} placeholder="Safety, food quality, decor" />
        <label htmlFor="nn">Non-negotiables (comma separated)</label>
        <input id="nn" value={nonNegotiables} onChange={e => setNonNegotiables(e.target.value)} />
        <label htmlFor="cult">Cultural or community notes</label>
        <textarea id="cult" maxLength={300} value={culturalNotes} onChange={e => setCulturalNotes(e.target.value)} />
      </fieldset>

      <div id="form-errors" role="alert">
        {errors.length > 0 && <ul>{errors.map(er => <li key={er}>{er}</li>)}</ul>}
      </div>
      <button type="submit" disabled={busy}>{busy ? 'Planning your event…' : 'Create my plan'}</button>
    </form>
  );
}
