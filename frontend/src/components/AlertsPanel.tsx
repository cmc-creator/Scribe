import React, { useEffect, useState } from 'react';
import { ExpiryAlert } from '../types';
import { alertsApi } from '../services/api';

export default function AlertsPanel(): React.ReactElement {
  const [alerts, setAlerts] = useState<ExpiryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  useEffect(() => {
    alertsApi
      .getAlerts(30)
      .then((res) => {
        if (res.success && res.data) setAlerts(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function acknowledge(documentId: string): Promise<void> {
    setAcknowledging(documentId);
    const res = await alertsApi.acknowledge(documentId);
    if (res.success) {
      setAlerts((prev) => prev.filter((a) => a.document_id !== documentId));
    }
    setAcknowledging(null);
  }

  function urgencyColor(days: number): string {
    if (days <= 3) return '#ef4444';
    if (days <= 7) return '#f59e0b';
    return '#3b82f6';
  }

  if (loading) return <div style={styles.center}>Loading alerts...</div>;

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Expiry Alerts</h3>
      {alerts.length === 0 ? (
        <p style={styles.empty}>No upcoming expirations in the next 30 days.</p>
      ) : (
        <ul style={styles.list}>
          {alerts.map((alert) => (
            <li key={alert.document_id} style={styles.item}>
              <div style={styles.row}>
                <div>
                  <strong>{alert.title}</strong>
                  <div style={{ ...styles.urgency, color: urgencyColor(alert.days_until_expiry) }}>
                    Expires in {alert.days_until_expiry} day{alert.days_until_expiry !== 1 ? 's' : ''} —{' '}
                    {new Date(alert.expires_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => acknowledge(alert.document_id)}
                  disabled={acknowledging === alert.document_id}
                  style={styles.ackButton}
                >
                  {acknowledging === alert.document_id ? '...' : 'Acknowledge'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '16px' },
  center: { textAlign: 'center', padding: '32px' },
  heading: { fontSize: '18px', fontWeight: 600, margin: '0 0 16px' },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  item: {
    padding: '14px 16px',
    border: '1px solid #fde68a',
    borderRadius: '8px',
    marginBottom: '10px',
    background: '#fffbeb',
  },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  urgency: { fontSize: '13px', marginTop: '4px', fontWeight: 500 },
  ackButton: {
    padding: '6px 12px',
    background: '#e2e8f0',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
  },
  empty: { color: '#94a3b8' },
};
