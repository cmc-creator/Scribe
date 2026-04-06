import { getDatabase } from '../db/database';
import { Document } from '../models/document';

export interface ExpiryAlert {
  document_id: string;
  title: string;
  status: string;
  expires_at: string;
  days_until_expiry: number;
}

export function getExpiryAlerts(daysAhead = 30): ExpiryAlert[] {
  const db = getDatabase();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);
  const now = new Date().toISOString();
  const cutoffStr = cutoff.toISOString();

  const docs = db.prepare(`
    SELECT id, title, status, expires_at
    FROM documents
    WHERE expires_at IS NOT NULL
      AND expires_at > ?
      AND expires_at <= ?
      AND status NOT IN ('archived', 'expired')
    ORDER BY expires_at ASC
  `).all(now, cutoffStr) as Pick<Document, 'id' | 'title' | 'status' | 'expires_at'>[];

  return docs.map((doc) => {
    const expiresAt = new Date(doc.expires_at as string);
    const daysUntilExpiry = Math.ceil(
      (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return {
      document_id: doc.id,
      title: doc.title,
      status: doc.status,
      expires_at: doc.expires_at as string,
      days_until_expiry: daysUntilExpiry,
    };
  });
}

export function getUpcomingExpirations(daysAhead = 7): ExpiryAlert[] {
  return getExpiryAlerts(daysAhead);
}

export function markExpiredDocuments(): number {
  const db = getDatabase();
  const now = new Date().toISOString();
  const result = db.prepare(`
    UPDATE documents
    SET status = 'expired', updated_at = ?
    WHERE expires_at IS NOT NULL AND expires_at < ? AND status = 'active'
  `).run(now, now);
  return result.changes;
}

export function acknowledgeAlert(documentId: string): boolean {
  const db = getDatabase();
  const doc = db.prepare('SELECT id FROM documents WHERE id = ?').get(documentId);
  if (!doc) return false;
  // In a real system this would persist the acknowledgment; for now just validates existence
  return true;
}
