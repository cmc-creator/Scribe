import crypto from 'crypto';
import { Client } from '@libsql/client';
import { getDatabase } from '../db/database';
import { Document, DocumentVersion, CreateDocumentInput, UpdateDocumentInput } from '../models/document';
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

export async function listDocuments(filters: {
  status?: string;
  category?: string;
  owner_id?: string;
  search?: string;
} = {}): Promise<Document[]> {
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
  const result = await db.execute({ sql: query, args: params });
  return result.rows as unknown as Document[];
}

export async function getDocument(id: string): Promise<Document | null> {
  const db = getDatabase();
  const result = await db.execute({ sql: 'SELECT * FROM documents WHERE id = ?', args: [id] });
  return (result.rows[0] as unknown as Document) ?? null;
}

export async function createDocument(input: CreateDocumentInput): Promise<Document> {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO documents (id, title, description, category, owner_id, expires_at, tags, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.title,
      input.description ?? null,
      input.category ?? null,
      input.owner_id,
      input.expires_at ?? null,
      input.tags ?? null,
      now,
      now,
    ],
  });

  await logAudit(db, 'document', id, 'created', input.owner_id, { title: input.title });

  return getDocument(id) as Promise<Document>;
}

export async function updateDocument(id: string, input: UpdateDocumentInput, performedBy?: string): Promise<Document | null> {
  const db = getDatabase();
  const doc = await getDocument(id);
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

  await db.execute({ sql: `UPDATE documents SET ${updates.join(', ')} WHERE id = ?`, args: params });

  await logAudit(db, 'document', id, 'updated', performedBy, input);

  return getDocument(id);
}

export async function archiveDocument(id: string, performedBy?: string): Promise<boolean> {
  const db = getDatabase();
  const result = await db.execute({
    sql: "UPDATE documents SET status = 'archived', updated_at = ? WHERE id = ?",
    args: [new Date().toISOString(), id],
  });

  if (result.rowsAffected > 0) {
    await logAudit(db, 'document', id, 'archived', performedBy);
    return true;
  }
  return false;
}

export async function createDocumentVersion(
  documentId: string,
  filePath: string,
  createdBy: string,
  opts: {
    file_size?: number;
    mime_type?: string;
    content_hash?: string;
    change_notes?: string;
  } = {}
): Promise<DocumentVersion> {
  const db = getDatabase();
  const doc = await getDocument(documentId);
  if (!doc) throw new Error('Document not found');

  const newVersionNumber = doc.current_version + 1;
  const versionId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO document_versions (id, document_id, version_number, file_path, file_size, mime_type, content_hash, change_notes, created_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      versionId,
      documentId,
      newVersionNumber,
      filePath,
      opts.file_size ?? null,
      opts.mime_type ?? null,
      opts.content_hash ?? null,
      opts.change_notes ?? null,
      createdBy,
      now,
    ],
  });

  await db.execute({
    sql: 'UPDATE documents SET current_version = ?, updated_at = ? WHERE id = ?',
    args: [newVersionNumber, now, documentId],
  });

  await logAudit(db, 'document', documentId, 'version_created', createdBy, { version: newVersionNumber });

  const vResult = await db.execute({ sql: 'SELECT * FROM document_versions WHERE id = ?', args: [versionId] });
  return vResult.rows[0] as unknown as DocumentVersion;
}

export async function getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
  const db = getDatabase();
  const result = await db.execute({
    sql: 'SELECT * FROM document_versions WHERE document_id = ? ORDER BY version_number DESC',
    args: [documentId],
  });
  return result.rows as unknown as DocumentVersion[];
}
