import React, { useState } from 'react';
import { documentsApi } from '../services/api';
import { Document } from '../types';

interface Props {
  onUploaded?: (doc: Document) => void;
  ownerId: string;
}

interface FormState {
  title: string;
  description: string;
  category: string;
  expires_at: string;
  tags: string;
}

export default function DocumentUpload({ onUploaded, ownerId }: Props): React.ReactElement {
  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    category: '',
    expires_at: '',
    tags: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await documentsApi.create({
        title: form.title,
        description: form.description || undefined,
        category: form.category || undefined,
        expires_at: form.expires_at || undefined,
        tags: form.tags || undefined,
        owner_id: ownerId,
      });

      if (res.success && res.data) {
        setSuccess(true);
        setForm({ title: '', description: '', category: '', expires_at: '', tags: '' });
        onUploaded?.(res.data);
      } else {
        setError(res.error ?? 'Failed to create document');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Create Document</h3>
      {success && <p style={styles.success}>Document created successfully!</p>}
      {error && <p style={styles.error}>{error}</p>}
      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          Title *
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            style={styles.input}
            placeholder="Document title"
          />
        </label>
        <label style={styles.label}>
          Description
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            style={{ ...styles.input, height: '80px', resize: 'vertical' }}
            placeholder="Optional description"
          />
        </label>
        <label style={styles.label}>
          Category
          <select name="category" value={form.category} onChange={handleChange} style={styles.input}>
            <option value="">Select category...</option>
            <option value="policy">Policy</option>
            <option value="contract">Contract</option>
            <option value="compliance">Compliance</option>
            <option value="hr">HR</option>
            <option value="legal">Legal</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label style={styles.label}>
          Expiry Date
          <input
            name="expires_at"
            type="date"
            value={form.expires_at}
            onChange={handleChange}
            style={styles.input}
          />
        </label>
        <label style={styles.label}>
          Tags (comma-separated)
          <input
            name="tags"
            value={form.tags}
            onChange={handleChange}
            style={styles.input}
            placeholder="e.g. finance, annual, review"
          />
        </label>
        <button type="submit" disabled={submitting} style={styles.button}>
          {submitting ? 'Creating...' : 'Create Document'}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '16px', maxWidth: '480px' },
  heading: { margin: '0 0 16px', fontSize: '18px', fontWeight: 600 },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  label: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px', fontWeight: 500 },
  input: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
  button: {
    padding: '10px 20px',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  success: { color: '#22c55e', fontWeight: 500 },
  error: { color: '#ef4444', fontWeight: 500 },
};
