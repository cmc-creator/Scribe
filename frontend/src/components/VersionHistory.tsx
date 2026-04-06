import React, { useEffect, useState } from 'react';
import { DocumentVersion } from '../types';
import { documentsApi } from '../services/api';

interface Props {
  documentId: string;
}

export default function VersionHistory({ documentId }: Props): React.ReactElement {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    documentsApi
      .getVersions(documentId)
      .then((res) => {
        if (res.success && res.data) setVersions(res.data);
        else setError(res.error ?? 'Failed to load versions');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [documentId]);

  function formatBytes(bytes?: number): string {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (loading) return <div>Loading version history...</div>;
  if (error) return <div style={{ color: '#ef4444' }}>Error: {error}</div>;

  return (
    <div style={styles.container}>
      <h4 style={styles.heading}>Version History</h4>
      {versions.length === 0 ? (
        <p style={styles.empty}>No versions recorded.</p>
      ) : (
        <ul style={styles.list}>
          {versions.map((v) => (
            <li key={v.id} style={styles.item}>
              <div style={styles.row}>
                <span style={styles.version}>Version {v.version_number}</span>
                <span style={styles.meta}>{new Date(v.created_at).toLocaleDateString()}</span>
              </div>
              {v.change_notes && <p style={styles.notes}>{v.change_notes}</p>}
              <div style={styles.details}>
                <span>Size: {formatBytes(v.file_size)}</span>
                {v.mime_type && <span> · Type: {v.mime_type}</span>}
                {v.content_hash && (
                  <span style={styles.hash}> · SHA256: {v.content_hash.slice(0, 12)}…</span>
                )}
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
  heading: { fontSize: '15px', fontWeight: 600, margin: '0 0 12px' },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  item: {
    padding: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    marginBottom: '8px',
    background: '#f8fafc',
  },
  row: { display: 'flex', justifyContent: 'space-between' },
  version: { fontWeight: 600, fontSize: '14px' },
  meta: { color: '#94a3b8', fontSize: '12px' },
  notes: { margin: '4px 0', fontSize: '13px', color: '#475569' },
  details: { fontSize: '12px', color: '#94a3b8', marginTop: '4px' },
  hash: { fontFamily: 'monospace' },
  empty: { color: '#94a3b8' },
};
