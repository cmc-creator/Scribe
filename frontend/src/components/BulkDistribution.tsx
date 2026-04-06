import React, { useState } from 'react';
import { Document, DistributionRecord } from '../types';
import { distributionApi, documentsApi } from '../services/api';

interface Props {
  document: Document;
  senderId: string;
}

interface Recipient {
  email: string;
  name: string;
}

export default function BulkDistribution({ document, senderId }: Props): React.ReactElement {
  const [recipients, setRecipients] = useState<Recipient[]>([{ email: '', name: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ batch_id: string; records: DistributionRecord[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateRecipient(index: number, field: keyof Recipient, value: string): void {
    setRecipients((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  function addRecipient(): void {
    setRecipients((prev) => [...prev, { email: '', name: '' }]);
  }

  function removeRecipient(index: number): void {
    setRecipients((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setResult(null);

    const valid = recipients.filter((r) => r.email.trim());
    if (valid.length === 0) {
      setError('Add at least one recipient with an email address');
      return;
    }

    setSubmitting(true);

    try {
      const versions = await documentsApi.getVersions(document.id);
      if (!versions.success || !versions.data?.length) {
        setError('No document version available to distribute');
        setSubmitting(false);
        return;
      }
      const latestVersion = versions.data[0];

      const res = await distributionApi.bulk({
        document_id: document.id,
        document_version_id: latestVersion.id,
        sender_id: senderId,
        recipients: valid.map((r) => ({ email: r.email, name: r.name || undefined })),
      });

      if (res.success && res.data) {
        setResult(res.data);
        setRecipients([{ email: '', name: '' }]);
      } else {
        setError(res.error ?? 'Distribution failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Bulk Distribution — {document.title}</h3>

      {error && <p style={styles.error}>{error}</p>}
      {result && (
        <div style={styles.success}>
          ✓ Sent to {result.records.length} recipient{result.records.length !== 1 ? 's' : ''}.
          Batch ID: <code>{result.batch_id}</code>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {recipients.map((r, i) => (
          <div key={i} style={styles.recipientRow}>
            <input
              type="email"
              placeholder="Email address *"
              value={r.email}
              onChange={(e) => updateRecipient(i, 'email', e.target.value)}
              style={{ ...styles.input, flex: 2 }}
              required
            />
            <input
              placeholder="Name (optional)"
              value={r.name}
              onChange={(e) => updateRecipient(i, 'name', e.target.value)}
              style={{ ...styles.input, flex: 2 }}
            />
            {recipients.length > 1 && (
              <button
                type="button"
                onClick={() => removeRecipient(i)}
                style={styles.removeButton}
              >
                ✕
              </button>
            )}
          </div>
        ))}

        <div style={styles.actions}>
          <button type="button" onClick={addRecipient} style={styles.secondaryButton}>
            + Add Recipient
          </button>
          <button type="submit" disabled={submitting} style={styles.primaryButton}>
            {submitting ? 'Sending...' : `Send to ${recipients.filter((r) => r.email).length} Recipient(s)`}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '16px' },
  heading: { fontSize: '18px', fontWeight: 600, margin: '0 0 16px' },
  recipientRow: { display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' },
  input: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px' },
  removeButton: {
    padding: '6px 10px',
    background: '#fee2e2',
    color: '#ef4444',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  actions: { display: 'flex', gap: '12px', marginTop: '16px' },
  secondaryButton: {
    padding: '8px 16px',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  primaryButton: {
    padding: '8px 20px',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
  },
  success: {
    padding: '12px 16px',
    background: '#f0fdf4',
    border: '1px solid #86efac',
    borderRadius: '8px',
    color: '#16a34a',
    marginBottom: '16px',
    fontSize: '14px',
  },
  error: { color: '#ef4444', fontSize: '14px' },
};
