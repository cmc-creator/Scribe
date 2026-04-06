import Database from 'better-sqlite3';

// Use in-memory database for tests
process.env.DB_PATH = ':memory:';

// Re-import after setting env
jest.mock('../src/db/database', () => {
  const Database = require('better-sqlite3');
  let db: InstanceType<typeof Database> | null = null;
  return {
    getDatabase: () => {
      if (!db) {
        db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
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

beforeAll(() => {
  initializeSchema();
  // Seed a user
  const db = getDatabase();
  db.prepare(`
    INSERT INTO users (id, email, name, role) VALUES ('user-1', 'alice@example.com', 'Alice', 'admin')
  `).run();
});

describe('documentService', () => {
  let docId: string;

  test('createDocument creates a document', () => {
    const doc = documentService.createDocument({
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

  test('listDocuments returns created documents', () => {
    const docs = documentService.listDocuments();
    expect(docs.length).toBeGreaterThan(0);
    expect(docs.some((d) => d.id === docId)).toBe(true);
  });

  test('listDocuments filters by status', () => {
    const docs = documentService.listDocuments({ status: 'draft' });
    expect(docs.every((d) => d.status === 'draft')).toBe(true);
  });

  test('getDocument retrieves by id', () => {
    const doc = documentService.getDocument(docId);
    expect(doc).not.toBeNull();
    expect(doc!.id).toBe(docId);
  });

  test('getDocument returns null for unknown id', () => {
    const doc = documentService.getDocument('nonexistent-id');
    expect(doc).toBeNull();
  });

  test('updateDocument updates fields', () => {
    const updated = documentService.updateDocument(docId, { title: 'Updated Title', status: 'active' });
    expect(updated).not.toBeNull();
    expect(updated!.title).toBe('Updated Title');
    expect(updated!.status).toBe('active');
  });

  test('updateDocument returns null for unknown id', () => {
    const result = documentService.updateDocument('nonexistent', { title: 'X' });
    expect(result).toBeNull();
  });

  test('archiveDocument archives a document', () => {
    const archived = documentService.archiveDocument(docId);
    expect(archived).toBe(true);
    const doc = documentService.getDocument(docId);
    expect(doc!.status).toBe('archived');
  });

  test('archiveDocument returns false for unknown id', () => {
    const result = documentService.archiveDocument('nonexistent');
    expect(result).toBe(false);
  });

  test('getDocumentVersions returns versions', () => {
    // Create a fresh doc for version testing
    const db = getDatabase();
    const vDoc = documentService.createDocument({
      title: 'Version Test Doc',
      owner_id: 'user-1',
    });
    // Insert a base version
    db.prepare(`
      INSERT INTO document_versions (id, document_id, version_number, file_path, created_by)
      VALUES ('ver-1', ?, 1, '/uploads/test.pdf', 'user-1')
    `).run(vDoc.id);

    const versions = documentService.getDocumentVersions(vDoc.id);
    expect(versions.length).toBeGreaterThanOrEqual(1);
  });
});
