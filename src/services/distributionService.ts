import crypto from 'crypto';
import { getDatabase } from '../db/database';

export interface DistributionRecord {
  id: string;
  document_id: string;
  document_version_id: string;
  sender_id: string;
  batch_id?: string;
  recipient_email: string;
  recipient_name?: string;
  status: 'sent' | 'delivered' | 'opened' | 'failed';
  sent_at: string;
  delivered_at?: string;
  opened_at?: string;
}

export interface SendDocumentInput {
  document_id: string;
  document_version_id: string;
  sender_id: string;
  recipient_email: string;
  recipient_name?: string;
  batch_id?: string;
}

export async function sendDocument(input: SendDocumentInput): Promise<DistributionRecord> {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO distribution_records
            (id, document_id, document_version_id, sender_id, batch_id, recipient_email, recipient_name, status, sent_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'sent', ?)`,
    args: [
      id,
      input.document_id,
      input.document_version_id,
      input.sender_id,
      input.batch_id ?? null,
      input.recipient_email,
      input.recipient_name ?? null,
      now,
    ],
  });

  await db.execute({
    sql: `INSERT INTO audit_logs (id, entity_type, entity_id, action, performed_by, details)
          VALUES (?, 'distribution', ?, 'sent', ?, ?)`,
    args: [
      crypto.randomUUID(),
      id,
      input.sender_id,
      JSON.stringify({ recipient: input.recipient_email }),
    ],
  });

  const result = await db.execute({ sql: 'SELECT * FROM distribution_records WHERE id = ?', args: [id] });
  return result.rows[0] as unknown as DistributionRecord;
}

export async function bulkDistribute(
  documentId: string,
  documentVersionId: string,
  senderId: string,
  recipients: { email: string; name?: string }[]
): Promise<{ batch_id: string; records: DistributionRecord[] }> {
  const batchId = crypto.randomUUID();
  const records: DistributionRecord[] = [];

  for (const recipient of recipients) {
    const record = await sendDocument({
      document_id: documentId,
      document_version_id: documentVersionId,
      sender_id: senderId,
      recipient_email: recipient.email,
      recipient_name: recipient.name,
      batch_id: batchId,
    });
    records.push(record);
  }

  return { batch_id: batchId, records };
}

export async function getDistributionBatches(senderId?: string): Promise<{
  batch_id: string;
  sent_at: string;
  total: number;
}[]> {
  const db = getDatabase();
  let query = `
    SELECT batch_id, MIN(sent_at) as sent_at, COUNT(*) as total
    FROM distribution_records
    WHERE batch_id IS NOT NULL
  `;
  const params: string[] = [];

  if (senderId) {
    query += ' AND sender_id = ?';
    params.push(senderId);
  }
  query += ' GROUP BY batch_id ORDER BY sent_at DESC';

  const result = await db.execute({ sql: query, args: params });
  return result.rows as unknown as { batch_id: string; sent_at: string; total: number }[];
}

export async function getBatchStatus(batchId: string): Promise<DistributionRecord[]> {
  const db = getDatabase();
  const result = await db.execute({
    sql: 'SELECT * FROM distribution_records WHERE batch_id = ? ORDER BY sent_at ASC',
    args: [batchId],
  });
  return result.rows as unknown as DistributionRecord[];
}
