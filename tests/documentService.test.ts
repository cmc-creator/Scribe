jest.mock('../src/db/database', () => {
  const { createClient } = require('@libsql/client');
  let db: ReturnType<typeof createClient> | null = null;
  return {
    getDatabase: () => {
      if (!db) {
        db = createClient({ url: ':memory:' });
      }
      return db;
    },
    closeDatabase: () => {
      if (db) {
        db.close();
        db = null;
      }
    },
  };
});

import { getDatabase } from '../src/db/database';
import { initializeSchema } from '../src/db/schema';
import * as documentService from '../src/services/documentService';

beforeAll(async () => {
  await initializeSchema();
  // Seed a user
  const db = getDatabase();
  await db.execute({
    sql: `INSERT INTO users (id, email, name, role) VALUES ('user-1', 'alice@example.com', 'Alice', 'admin')`,
    args: [],
  });
});

describe('documentService', () => {
  let docId: string;

  test('createDocument creates a document', async () => {
    const doc = await documentService.createDocument({
      title: 'Test Document',
      description: 'A test doc',
      category: 'policy',
      owner_id: 'user-1',
    });

    expect(doc).toBeDefined();
    expect(doc.title).toBe('Test Document');
    expect(doc.status).toBe('draft');
    expect(doc.current_version).toBe(1);
    docId = doc.id;
  });

  test('listDocuments returns created documents', async () => {
    const docs = await documentService.listDocuments();
    expect(docs.length).toBeGreaterThan(0);
    expect(docs.some((d) => d.id === docId)).toBe(true);
  });

  test('listDocuments filters by status', async () => {
    const docs = await documentService.listDocuments({ status: 'draft' });
    expect(docs.every((d) => d.status === 'draft')).toBe(true);
  });

  test('getDocument retrieves by id', async () => {
    const doc = await documentService.getDocument(docId);
    expect(doc).not.toBeNull();
    expect(doc!.id).toBe(docId);
  });

  test('getDocument returns null for unknown id', async () => {
    const doc = await documentService.getDocument('nonexistent-id');
    expect(doc).toBeNull();
  });

  test('updateDocument updates fields', async () => {
    const updated = await documentService.updateDocument(docId, { title: 'Updated Title', status: 'active' });
    expect(updated).not.toBeNull();
    expect(updated!.title).toBe('Updated Title');
    expect(updated!.status).toBe('active');
  });

  test('updateDocument returns null for unknown id', async () => {
    const result = await documentService.updateDocument('nonexistent', { title: 'X' });
    expect(result).toBeNull();
  });

  test('archiveDocument archives a document', async () => {
    const archived = await documentService.archiveDocument(docId);
    expect(archived).toBe(true);
    const doc = await documentService.getDocument(docId);
    expect(doc!.status).toBe('archived');
  });

  test('archiveDocument returns false for unknown id', async () => {
    const result = await documentService.archiveDocument('nonexistent');
    expect(result).toBe(false);
  });

  test('getDocumentVersions returns versions', async () => {
    // Create a fresh doc for version testing
    const db = getDatabase();
    const vDoc = await documentService.createDocument({
      title: 'Version Test Doc',
      owner_id: 'user-1',
    });
    // Insert a base version
    await db.execute({
      sql: `INSERT INTO document_versions (id, document_id, version_number, file_path, created_by)
            VALUES ('ver-1', ?, 1, '/uploads/test.pdf', 'user-1')`,
      args: [vDoc.id],
    });

    const versions = await documentService.getDocumentVersions(vDoc.id);
    expect(versions.length).toBeGreaterThanOrEqual(1);
  });
});
