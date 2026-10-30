// src/routes/outreach.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { OutreachRequest, OutreachResponse } from '../../shared/schemas';
import { generateOutreach } from '../lib/apiClient';
import { useEventStore } from '../store/eventStore';

export default function Outreach() {
  const profile = useEventStore(s => s.profile);
  const [kind, setKind] = useState<OutreachRequest['kind']>('sponsor');
  const [audience, setAudience] = useState('');
  const [language, setLanguage] = useState<OutreachRequest['language']>('en');
  const [result, setResult] = useState<OutreachResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  if (!profile) return <p>No event yet. <Link to="/setup">Create one</Link>.</p>;

  async function generate() {
    if (!profile) return;
    setBusy(true); setError(null); setResult(null);
    try {
      setResult(await generateOutreach({ profile, kind, audience: audience.trim(), language }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
    } catch {
      setCopied(null);
      setError('Copy failed. Select the text and copy it manually.');
    }
  }

  return (
    <>
      <h1>Outreach messages</h1>
      <label htmlFor="kind">Message type</label>
      <select id="kind" value={kind} onChange={e => setKind(e.target.value as typeof kind)}>
        <option value="sponsor">Sponsor pitch</option>
        <option value="volunteer">Volunteer call</option>
        <option value="permit">Permit request</option>
      </select>
      <label htmlFor="aud">Who is it for?</label>
      <input id="aud" value={audience} onChange={e => setAudience(e.target.value)} placeholder="Owner of the local sweet shop" />
      <label htmlFor="lang">Language</label>
      <select id="lang" value={language} onChange={e => setLanguage(e.target.value as typeof language)}>
        <option value="en">English</option>
        <option value="hinglish">Hinglish</option>
      </select>
      <button type="button" disabled={busy || audience.trim().length < 2} onClick={generate}>
        {busy ? 'Writing…' : 'Write message'}
      </button>
      <p role="status" aria-live="polite">{copied ? `${copied} copied` : ''}</p>
      {error && <p role="alert">{error}</p>}
      {result && (
        <>
          <section aria-label="WhatsApp version">
            <h2>WhatsApp</h2>
            <p style={{ whiteSpace: 'pre-wrap' }}>{result.whatsapp}</p>
            <button type="button" onClick={() => copy('WhatsApp text', result.whatsapp)}>Copy</button>
          </section>
          <section aria-label="Email version">
            <h2>Email</h2>
            <p><strong>{result.emailSubject}</strong></p>
            <p style={{ whiteSpace: 'pre-wrap' }}>{result.emailBody}</p>
            <button type="button" onClick={() => copy('Email text', `${result.emailSubject}\n\n${result.emailBody}`)}>Copy</button>
          </section>
        </>
      )}
    </>
  );
}
