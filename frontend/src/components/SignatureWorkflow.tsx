import React, { useEffect, useState } from 'react';
import { Document, SignatureRequest } from '../types';
import { documentsApi, signaturesApi } from '../services/api';

interface Props {
  document: Document;
  requesterId: string;
}

export default function SignatureWorkflow({ document, requesterId }: Props): React.ReactElement {
  const [signatures, setSignatures] = useState<SignatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    documentsApi
      .getSignatures(document.id)
      .then((res) => {
        if (res.success && res.data) setSignatures(res.data);
      })
      .finally(() => setLoading(false));
  }, [document.id]);

  async function sendRequest(): Promise<void> {
    if (!recipientEmail || !recipientName) {
      setError('Recipient email and name are required');
      return;
    }
    setSubmitting(true);
    setError(null);

    const versions = await documentsApi.getVersions(document.id);
    if (!versions.success || !versions.data?.length) {
      setError('No document version available to sign');
      setSubmitting(false);
      return;
    }
    const latestVersion = versions.data[0];

    const res = await signaturesApi.createRequest({
      document_id: document.id,
      document_version_id: latestVersion.id,
      requester_id: requesterId,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      message: message || undefined,
    });

    if (res.success && res.data) {
      setSignatures((prev) => [res.data!, ...prev]);
      setRecipientEmail('');
      setRecipientName('');
      setMessage('');
    } else {
      setError(res.error ?? 'Failed to send signature request');
    }
    setSubmitting(false);
  }

  const statusColor: Record<SignatureRequest['status'], string> = {
    pending: '#f59e0b',
    signed: '#22c55e',
    declined: '#ef4444',
    expired: '#94a3b8',
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Signature Workflow — {document.title}</h3>

      <div style={styles.form}>
        <h4 style={styles.subheading}>Request Signature</h4>
        {error && <p style={styles.error}>{error}</p>}
        <input
          placeholder="Recipient email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          style={styles.input}
          type="email"
        />
        <input
          placeholder="Recipient name"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          style={styles.input}
        />
        <textarea
          placeholder="Optional message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ ...styles.input, height: '60px', resize: 'vertical' }}
        />
        <button onClick={sendRequest} disabled={submitting} style={styles.button}>
          {submitting ? 'Sending...' : 'Send Request'}
        </button>
      </div>

      <div>
        <h4 style={styles.subheading}>Signature Status</h4>
        {loading ? (
          <p>Loading...</p>
        ) : signatures.length === 0 ? (
          <p style={styles.empty}>No signature requests yet.</p>
        ) : (
          <ul style={styles.list}>
            {signatures.map((sig) => (
              <li key={sig.id} style={styles.item}>
                <div style={styles.row}>
                  <span>{sig.recipient_name} &lt;{sig.recipient_email}&gt;</span>
                  <span style={{ ...styles.badge, backgroundColor: statusColor[sig.status] }}>
                    {sig.status}
                  </span>
                </div>
                {sig.signed_at && (
                  <small>Signed: {new Date(sig.signed_at).toLocaleString()}</small>
                )}
                <br />
                <small style={styles.meta}>Requested: {new Date(sig.created_at).toLocaleDateString()}</small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '16px' },
  heading: { fontSize: '18px', fontWeight: 600, margin: '0 0 16px' },
  subheading: { fontSize: '15px', fontWeight: 600, margin: '16px 0 8px' },
  form: { display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '400px', marginBottom: '24px' },
  input: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', fontFamily: 'inherit' },
  button: { padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  item: { padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
  badge: { padding: '2px 8px', borderRadius: '12px', fontSize: '12px', color: '#fff', fontWeight: 600 },
  meta: { color: '#94a3b8', fontSize: '12px' },
  empty: { color: '#94a3b8' },
  error: { color: '#ef4444', fontSize: '13px' },
};
