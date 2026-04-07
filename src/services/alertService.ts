import { getDatabase } from '../db/database';
import { Document } from '../models/document';

export interface ExpiryAlert {
  document_id: string;
  title: string;
  status: string;
  expires_at: string;
  days_until_expiry: number;
}

export async function getExpiryAlerts(daysAhead = 30): Promise<ExpiryAlert[]> {
  const db = getDatabase();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);
  const now = new Date().toISOString();
  const cutoffStr = cutoff.toISOString();

  const result = await db.execute({
    sql: `SELECT id, title, status, expires_at
          FROM documents
          WHERE expires_at IS NOT NULL
            AND expires_at > ?
            AND expires_at <= ?
            AND status NOT IN ('archived', 'expired')
          ORDER BY expires_at ASC`,
    args: [now, cutoffStr],
  });

  const docs = result.rows as unknown as Pick<Document, 'id' | 'title' | 'status' | 'expires_at'>[];

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

export async function getUpcomingExpirations(daysAhead = 7): Promise<ExpiryAlert[]> {
  return getExpiryAlerts(daysAhead);
}

export async function markExpiredDocuments(): Promise<number> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const result = await db.execute({
    sql: `UPDATE documents
          SET status = 'expired', updated_at = ?
          WHERE expires_at IS NOT NULL AND expires_at < ? AND status = 'active'`,
    args: [now, now],
  });
  return result.rowsAffected;
}

export async function acknowledgeAlert(documentId: string): Promise<boolean> {
  const db = getDatabase();
  const result = await db.execute({ sql: 'SELECT id FROM documents WHERE id = ?', args: [documentId] });
  if (result.rows.length === 0) return false;
  // In a real system this would persist the acknowledgment; for now just validates existence
  return true;
}
