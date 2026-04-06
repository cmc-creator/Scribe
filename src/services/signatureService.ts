import crypto from 'crypto';
import { getDatabase } from '../db/database';
import { SignatureRequest, CreateSignatureRequestInput } from '../models/signature';
import { AuditLog } from '../models/auditLog';

function logAudit(
  db: ReturnType<typeof getDatabase>,
  entityType: AuditLog['entity_type'],
  entityId: string,
  action: string,
  performedBy?: string,
  details?: object
): void {
  db.prepare(`
    INSERT INTO audit_logs (id, entity_type, entity_id, action, performed_by, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    entityType,
    entityId,
    action,
    performedBy ?? null,
    details ? JSON.stringify(details) : null
  );
}

export function createSignatureRequest(input: CreateSignatureRequestInput): SignatureRequest {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO signature_requests
      (id, document_id, document_version_id, requester_id, recipient_email, recipient_name, message, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.document_id,
    input.document_version_id,
    input.requester_id,
    input.recipient_email,
    input.recipient_name,
    input.message ?? null,
    input.expires_at ?? null,
    now
  );

  logAudit(db, 'signature', id, 'request_created', input.requester_id, {
    recipient: input.recipient_email,
  });

  return db.prepare('SELECT * FROM signature_requests WHERE id = ?').get(id) as SignatureRequest;
}

export function getSignatureRequest(id: string): SignatureRequest | null {
  const db = getDatabase();
  return (db.prepare('SELECT * FROM signature_requests WHERE id = ?').get(id) ?? null) as SignatureRequest | null;
}

export function getDocumentSignatures(documentId: string): SignatureRequest[] {
  const db = getDatabase();
  return db.prepare(
    'SELECT * FROM signature_requests WHERE document_id = ? ORDER BY created_at DESC'
  ).all(documentId) as SignatureRequest[];
}

export function submitSignature(
  id: string,
  signatureData: string,
  ipAddress?: string,
  userAgent?: string
): SignatureRequest | null {
  const db = getDatabase();
  const req = getSignatureRequest(id);
  if (!req || req.status !== 'pending') return null;

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE signature_requests
    SET status = 'signed', signed_at = ?, signature_data = ?, ip_address = ?, user_agent = ?
    WHERE id = ?
  `).run(now, signatureData, ipAddress ?? null, userAgent ?? null, id);

  logAudit(db, 'signature', id, 'signed', undefined, { ip_address: ipAddress });

  return db.prepare('SELECT * FROM signature_requests WHERE id = ?').get(id) as SignatureRequest;
}

export function declineSignatureRequest(id: string, ipAddress?: string): SignatureRequest | null {
  const db = getDatabase();
  const req = getSignatureRequest(id);
  if (!req || req.status !== 'pending') return null;

  db.prepare(
    "UPDATE signature_requests SET status = 'declined', ip_address = ? WHERE id = ?"
  ).run(ipAddress ?? null, id);

  logAudit(db, 'signature', id, 'declined', undefined, { ip_address: ipAddress });

  return db.prepare('SELECT * FROM signature_requests WHERE id = ?').get(id) as SignatureRequest;
}

export function expireStaleSignatureRequests(): number {
  const db = getDatabase();
  const now = new Date().toISOString();
  const result = db.prepare(`
    UPDATE signature_requests
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < ?
  `).run(now);
  return result.changes;
}
