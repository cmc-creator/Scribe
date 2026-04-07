import crypto from 'crypto';
import { Client } from '@libsql/client';
import { getDatabase } from '../db/database';
import { SignatureRequest, CreateSignatureRequestInput } from '../models/signature';
import { AuditLog } from '../models/auditLog';

async function logAudit(
  db: Client,
  entityType: AuditLog['entity_type'],
  entityId: string,
  action: string,
  performedBy?: string,
  details?: object
): Promise<void> {
  await db.execute({
    sql: `INSERT INTO audit_logs (id, entity_type, entity_id, action, performed_by, details)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      crypto.randomUUID(),
      entityType,
      entityId,
      action,
      performedBy ?? null,
      details ? JSON.stringify(details) : null,
    ],
  });
}

export async function createSignatureRequest(input: CreateSignatureRequestInput): Promise<SignatureRequest> {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO signature_requests
            (id, document_id, document_version_id, requester_id, recipient_email, recipient_name, message, expires_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.document_id,
      input.document_version_id,
      input.requester_id,
      input.recipient_email,
      input.recipient_name,
      input.message ?? null,
      input.expires_at ?? null,
      now,
    ],
  });

  await logAudit(db, 'signature', id, 'request_created', input.requester_id, {
    recipient: input.recipient_email,
  });

  const result = await db.execute({ sql: 'SELECT * FROM signature_requests WHERE id = ?', args: [id] });
  return result.rows[0] as unknown as SignatureRequest;
}

export async function getSignatureRequest(id: string): Promise<SignatureRequest | null> {
  const db = getDatabase();
  const result = await db.execute({ sql: 'SELECT * FROM signature_requests WHERE id = ?', args: [id] });
  return (result.rows[0] as unknown as SignatureRequest) ?? null;
}

export async function getDocumentSignatures(documentId: string): Promise<SignatureRequest[]> {
  const db = getDatabase();
  const result = await db.execute({
    sql: 'SELECT * FROM signature_requests WHERE document_id = ? ORDER BY created_at DESC',
    args: [documentId],
  });
  return result.rows as unknown as SignatureRequest[];
}

export async function submitSignature(
  id: string,
  signatureData: string,
  ipAddress?: string,
  userAgent?: string
): Promise<SignatureRequest | null> {
  const db = getDatabase();
  const req = await getSignatureRequest(id);
  if (!req || req.status !== 'pending') return null;

  const now = new Date().toISOString();
  await db.execute({
    sql: `UPDATE signature_requests
          SET status = 'signed', signed_at = ?, signature_data = ?, ip_address = ?, user_agent = ?
          WHERE id = ?`,
    args: [now, signatureData, ipAddress ?? null, userAgent ?? null, id],
  });

  await logAudit(db, 'signature', id, 'signed', undefined, { ip_address: ipAddress });

  const result = await db.execute({ sql: 'SELECT * FROM signature_requests WHERE id = ?', args: [id] });
  return result.rows[0] as unknown as SignatureRequest;
}

export async function declineSignatureRequest(id: string, ipAddress?: string): Promise<SignatureRequest | null> {
  const db = getDatabase();
  const req = await getSignatureRequest(id);
  if (!req || req.status !== 'pending') return null;

  await db.execute({
    sql: "UPDATE signature_requests SET status = 'declined', ip_address = ? WHERE id = ?",
    args: [ipAddress ?? null, id],
  });

  await logAudit(db, 'signature', id, 'declined', undefined, { ip_address: ipAddress });

  const result = await db.execute({ sql: 'SELECT * FROM signature_requests WHERE id = ?', args: [id] });
  return result.rows[0] as unknown as SignatureRequest;
}

export async function expireStaleSignatureRequests(): Promise<number> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const result = await db.execute({
    sql: `UPDATE signature_requests
          SET status = 'expired'
          WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < ?`,
    args: [now],
  });
  return result.rowsAffected;
}
