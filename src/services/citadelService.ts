import crypto from 'crypto';
import { getDatabase } from '../db/database';

export interface CitadelRecord {
  id: string;
  document_id: string;
  citadel_ref?: string;
  compliance_status: 'pending' | 'compliant' | 'non_compliant';
  last_check_at?: string;
  next_check_at?: string;
  compliance_notes?: string;
  created_at: string;
}

/** Mock Citadel API call - in production this would be an HTTP request to the Citadel service. */
async function callCitadelApi(
  documentId: string
): Promise<{ ref: string; status: 'compliant' | 'non_compliant'; notes: string }> {
  // Simulate async API latency
  await new Promise((resolve) => setTimeout(resolve, 10));
  const isCompliant = Math.random() > 0.2;
  return {
    ref: `CITADEL-${documentId.slice(0, 8).toUpperCase()}`,
    status: isCompliant ? 'compliant' : 'non_compliant',
    notes: isCompliant
      ? 'All compliance checks passed.'
      : 'Missing required metadata fields.',
  };
}

export async function checkCompliance(documentId: string): Promise<CitadelRecord> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const nextCheck = new Date();
  nextCheck.setDate(nextCheck.getDate() + 30);

  const apiResult = await callCitadelApi(documentId);

  const existingResult = await db.execute({
    sql: 'SELECT * FROM citadel_records WHERE document_id = ?',
    args: [documentId],
  });
  const existing = existingResult.rows[0] as unknown as CitadelRecord | undefined;

  if (existing) {
    await db.execute({
      sql: `UPDATE citadel_records
            SET citadel_ref = ?, compliance_status = ?, last_check_at = ?, next_check_at = ?, compliance_notes = ?
            WHERE document_id = ?`,
      args: [apiResult.ref, apiResult.status, now, nextCheck.toISOString(), apiResult.notes, documentId],
    });
  } else {
    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO citadel_records (id, document_id, citadel_ref, compliance_status, last_check_at, next_check_at, compliance_notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, documentId, apiResult.ref, apiResult.status, now, nextCheck.toISOString(), apiResult.notes, now],
    });
  }

  const result = await db.execute({
    sql: 'SELECT * FROM citadel_records WHERE document_id = ?',
    args: [documentId],
  });
  return result.rows[0] as unknown as CitadelRecord;
}

export async function getComplianceStatus(documentId: string): Promise<CitadelRecord | null> {
  const db = getDatabase();
  const result = await db.execute({
    sql: 'SELECT * FROM citadel_records WHERE document_id = ?',
    args: [documentId],
  });
  return (result.rows[0] as unknown as CitadelRecord) ?? null;
}

export async function syncAllDocuments(): Promise<{ synced: number; errors: number }> {
  const db = getDatabase();
  const result = await db.execute({
    sql: "SELECT id FROM documents WHERE status NOT IN ('archived')",
    args: [],
  });
  const documents = result.rows as unknown as { id: string }[];

  let synced = 0;
  let errors = 0;

  for (const doc of documents) {
    try {
      await checkCompliance(doc.id);
      synced++;
    } catch {
      errors++;
    }
  }

  return { synced, errors };
}
