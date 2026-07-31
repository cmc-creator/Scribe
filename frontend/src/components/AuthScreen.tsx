import React, { FormEvent, useEffect, useState } from 'react';

interface Session {
  token: string;
  user: { id: string; email: string; name: string; role: string };
}

interface Props {
  onAuthenticated: (session: Session) => void;
}

export default function AuthScreen({ onAuthenticated }: Props): React.ReactElement {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/auth/setup-status')
      .then((response) => response.json())
      .then((result) => setNeedsSetup(Boolean(result.data?.needsSetup)))
      .catch(() => setError('Authentication service is unavailable.'));
  }, []);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(needsSetup ? '/api/auth/setup' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(needsSetup ? { name, email, password, setupSecret } : { email, password }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Sign-in failed.');
      localStorage.setItem('token', result.data.token);
      onAuthenticated(result.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (needsSetup === null) return <main style={styles.center}>Loading sign-in…</main>;

  return <main style={styles.center}><form onSubmit={submit} style={styles.card}>
    <h1 style={styles.title}>NyxScribe</h1>
    <p style={styles.subtitle}>{needsSetup ? 'Create the first administrator account.' : 'Sign in to continue.'}</p>
    {needsSetup && <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" style={styles.input} />}
    <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" style={styles.input} />
    <input required minLength={12} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password (12+ characters)" style={styles.input} />
    {needsSetup && <input required type="password" value={setupSecret} onChange={(event) => setSetupSecret(event.target.value)} placeholder="Administrator setup secret" style={styles.input} />}
    {error && <p style={styles.error}>{error}</p>}
    <button disabled={submitting} style={styles.button}>{submitting ? 'Please wait…' : needsSetup ? 'Create administrator' : 'Sign in'}</button>
  </form></main>;
}

const styles: Record<string, React.CSSProperties> = {
  center: { minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' },
  card: { width: 'min(360px, calc(100% - 48px))', display: 'grid', gap: '12px', padding: '32px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 8px 24px rgb(15 23 42 / 8%)' },
  title: { margin: 0, color: '#1e293b' }, subtitle: { margin: '0 0 8px', color: '#64748b' },
  input: { padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' },
  button: { padding: '10px 12px', border: 0, borderRadius: '6px', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' },
  error: { margin: 0, color: '#dc2626', fontSize: '14px' },
};
