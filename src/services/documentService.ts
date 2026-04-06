import crypto from 'crypto';
import { getDatabase } from '../db/database';
import { Document, DocumentVersion, CreateDocumentInput, UpdateDocumentInput } from '../models/document';
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

export function listDocuments(filters: {
  status?: string;
  category?: string;
  owner_id?: string;
  search?: string;
} = {}): Document[] {
  const db = getDatabase();
  let query = 'SELECT * FROM documents WHERE 1=1';
  const params: (string | number)[] = [];

  if (filters.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.category) {
    query += ' AND category = ?';
    params.push(filters.category);
  }
  if (filters.owner_id) {
    query += ' AND owner_id = ?';
    params.push(filters.owner_id);
  }
  if (filters.search) {
    query += ' AND (title LIKE ? OR description LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  query += ' ORDER BY updated_at DESC';
  return db.prepare(query).all(...params) as Document[];
}

export function getDocument(id: string): Document | null {
  const db = getDatabase();
  return (db.prepare('SELECT * FROM documents WHERE id = ?').get(id) ?? null) as Document | null;
}

export function createDocument(input: CreateDocumentInput): Document {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO documents (id, title, description, category, owner_id, expires_at, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.title,
    input.description ?? null,
    input.category ?? null,
    input.owner_id,
    input.expires_at ?? null,
    input.tags ?? null,
    now,
    now
  );

  logAudit(db, 'document', id, 'created', input.owner_id, { title: input.title });

  return getDocument(id) as Document;
}

export function updateDocument(id: string, input: UpdateDocumentInput, performedBy?: string): Document | null {
  const db = getDatabase();
  const doc = getDocument(id);
  if (!doc) return null;

  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.title !== undefined) { updates.push('title = ?'); params.push(input.title); }
  if (input.description !== undefined) { updates.push('description = ?'); params.push(input.description); }
  if (input.category !== undefined) { updates.push('category = ?'); params.push(input.category); }
  if (input.status !== undefined) { updates.push('status = ?'); params.push(input.status); }
  if (input.expires_at !== undefined) { updates.push('expires_at = ?'); params.push(input.expires_at); }
  if (input.tags !== undefined) { updates.push('tags = ?'); params.push(input.tags); }

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);

  db.prepare(`UPDATE documents SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  logAudit(db, 'document', id, 'updated', performedBy, input);

  return getDocument(id);
}

export function archiveDocument(id: string, performedBy?: string): boolean {
  const db = getDatabase();
  const result = db.prepare(
    "UPDATE documents SET status = 'archived', updated_at = ? WHERE id = ?"
  ).run(new Date().toISOString(), id);

  if (result.changes > 0) {
    logAudit(db, 'document', id, 'archived', performedBy);
    return true;
  }
  return false;
}

export function createDocumentVersion(
  documentId: string,
  filePath: string,
  createdBy: string,
  opts: {
    file_size?: number;
    mime_type?: string;
    content_hash?: string;
    change_notes?: string;
  } = {}
): DocumentVersion {
  const db = getDatabase();
  const doc = getDocument(documentId);
  if (!doc) throw new Error('Document not found');

  const newVersionNumber = doc.current_version + 1;
  const versionId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO document_versions (id, document_id, version_number, file_path, file_size, mime_type, content_hash, change_notes, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    versionId,
    documentId,
    newVersionNumber,
    filePath,
    opts.file_size ?? null,
    opts.mime_type ?? null,
    opts.content_hash ?? null,
    opts.change_notes ?? null,
    createdBy,
    now
  );

  db.prepare("UPDATE documents SET current_version = ?, updated_at = ? WHERE id = ?")
    .run(newVersionNumber, now, documentId);

  logAudit(db, 'document', documentId, 'version_created', createdBy, { version: newVersionNumber });

  return db.prepare('SELECT * FROM document_versions WHERE id = ?').get(versionId) as DocumentVersion;
}

export function getDocumentVersions(documentId: string): DocumentVersion[] {
  const db = getDatabase();
  return db.prepare(
    'SELECT * FROM document_versions WHERE document_id = ? ORDER BY version_number DESC'
  ).all(documentId) as DocumentVersion[];
}
