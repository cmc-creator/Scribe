process.env.DB_PATH = ':memory:';

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
import * as signatureService from '../src/services/signatureService';

const TEST_DOC_ID = 'doc-sig-1';
const TEST_VERSION_ID = 'ver-sig-1';

beforeAll(() => {
  initializeSchema();
  const db = getDatabase();
  db.prepare(`INSERT INTO users (id, email, name, role) VALUES ('user-sig-1', 'bob@example.com', 'Bob', 'manager')`).run();
  db.prepare(`INSERT INTO documents (id, title, owner_id) VALUES (?, 'Sig Test Doc', 'user-sig-1')`).run(TEST_DOC_ID);
  db.prepare(`INSERT INTO document_versions (id, document_id, version_number, file_path, created_by) VALUES (?, ?, 1, '/f', 'user-sig-1')`).run(TEST_VERSION_ID, TEST_DOC_ID);
});

describe('signatureService', () => {
  let requestId: string;

  test('createSignatureRequest creates a request', () => {
    const req = signatureService.createSignatureRequest({
      document_id: TEST_DOC_ID,
      document_version_id: TEST_VERSION_ID,
      requester_id: 'user-sig-1',
      recipient_email: 'carol@example.com',
      recipient_name: 'Carol',
      message: 'Please sign',
    });

    expect(req).toBeDefined();
    expect(req.status).toBe('pending');
    expect(req.recipient_email).toBe('carol@example.com');
    requestId = req.id;
  });

  test('getSignatureRequest retrieves by id', () => {
    const req = signatureService.getSignatureRequest(requestId);
    expect(req).not.toBeNull();
    expect(req!.id).toBe(requestId);
  });

  test('getSignatureRequest returns null for unknown id', () => {
    const req = signatureService.getSignatureRequest('unknown-id');
    expect(req).toBeNull();
  });

  test('getDocumentSignatures returns all signatures for document', () => {
    const sigs = signatureService.getDocumentSignatures(TEST_DOC_ID);
    expect(sigs.length).toBeGreaterThan(0);
    expect(sigs[0].document_id).toBe(TEST_DOC_ID);
  });

  test('submitSignature marks as signed', () => {
    const updated = signatureService.submitSignature(requestId, 'base64sigdata==', '127.0.0.1', 'TestAgent/1.0');
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('signed');
    expect(updated!.signature_data).toBe('base64sigdata==');
  });

  test('submitSignature returns null for already-signed request', () => {
    const result = signatureService.submitSignature(requestId, 'sigdata2');
    expect(result).toBeNull();
  });

  test('declineSignatureRequest declines a pending request', () => {
    const newReq = signatureService.createSignatureRequest({
      document_id: TEST_DOC_ID,
      document_version_id: TEST_VERSION_ID,
      requester_id: 'user-sig-1',
      recipient_email: 'dave@example.com',
      recipient_name: 'Dave',
    });

    const declined = signatureService.declineSignatureRequest(newReq.id, '127.0.0.1');
    expect(declined).not.toBeNull();
    expect(declined!.status).toBe('declined');
  });

  test('expireStaleSignatureRequests marks expired requests', () => {
    const db = getDatabase();
    const pastDate = new Date(Date.now() - 1000 * 60 * 60).toISOString();
    db.prepare(`
      INSERT INTO signature_requests
        (id, document_id, document_version_id, requester_id, recipient_email, recipient_name, status, expires_at)
      VALUES ('exp-req-1', ?, ?, 'user-sig-1', 'exp@example.com', 'Exp User', 'pending', ?)
    `).run(TEST_DOC_ID, TEST_VERSION_ID, pastDate);

    const count = signatureService.expireStaleSignatureRequests();
    expect(count).toBeGreaterThan(0);
  });
});
