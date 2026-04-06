import React, { useEffect, useState } from 'react';
import { Document } from '../types';
import { documentsApi } from '../services/api';

interface Props {
  onSelect?: (doc: Document) => void;
}

export default function DocumentList({ onSelect }: Props): React.ReactElement {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const params = search ? { search } : undefined;
    documentsApi
      .list(params)
      .then((res) => {
        if (res.success && res.data) setDocuments(res.data);
        else setError(res.error ?? 'Failed to load documents');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [search]);

  const statusColor = (status: Document['status']): string => {
    const colors: Record<Document['status'], string> = {
      active: '#22c55e',
      draft: '#94a3b8',
      expired: '#ef4444',
      archived: '#64748b',
    };
    return colors[status];
  };

  if (loading) return <div style={styles.center}>Loading documents...</div>;
  if (error) return <div style={{ ...styles.center, color: '#ef4444' }}>Error: {error}</div>;

  return (
    <div style={styles.container}>
      <input
        type="text"
        placeholder="Search documents..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.searchInput}
      />
      {documents.length === 0 ? (
        <p style={styles.empty}>No documents found.</p>
      ) : (
        <ul style={styles.list}>
          {documents.map((doc) => (
            <li
              key={doc.id}
              style={styles.item}
              onClick={() => onSelect?.(doc)}
            >
              <div style={styles.row}>
                <strong>{doc.title}</strong>
                <span
                  style={{
                    ...styles.badge,
                    backgroundColor: statusColor(doc.status),
                  }}
                >
                  {doc.status}
                </span>
              </div>
              {doc.description && <p style={styles.description}>{doc.description}</p>}
              <small style={styles.meta}>
                v{doc.current_version} · {doc.category ?? 'Uncategorized'} ·{' '}
                {new Date(doc.updated_at).toLocaleDateString()}
                {doc.expires_at && ` · Expires: ${new Date(doc.expires_at).toLocaleDateString()}`}
              </small>
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
  searchInput: {
    width: '100%',
    padding: '8px 12px',
    marginBottom: '16px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  item: {
    padding: '16px',
    marginBottom: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    background: '#fff',
    transition: 'box-shadow 0.1s',
  },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#fff',
    fontWeight: 600,
  },
  description: { margin: '6px 0 4px', fontSize: '13px', color: '#64748b' },
  meta: { color: '#94a3b8', fontSize: '12px' },
  empty: { color: '#94a3b8', textAlign: 'center' },
};
