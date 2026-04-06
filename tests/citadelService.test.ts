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
    closeDatabase: () => {},
  };
});

import { getDatabase } from '../src/db/database';
import { initializeSchema } from '../src/db/schema';
import * as citadelService from '../src/services/citadelService';

const DOC_ID = 'citadel-doc-1';

beforeAll(() => {
  initializeSchema();
  const db = getDatabase();
  db.prepare(`INSERT INTO users (id, email, name, role) VALUES ('citadel-user', 'citadel@test.com', 'Citadel User', 'admin')`).run();
  db.prepare(`INSERT INTO documents (id, title, owner_id, status) VALUES (?, 'Citadel Doc', 'citadel-user', 'active')`).run(DOC_ID);
});

describe('citadelService', () => {
  test('checkCompliance creates a compliance record', async () => {
    const record = await citadelService.checkCompliance(DOC_ID);
    expect(record).toBeDefined();
    expect(record.document_id).toBe(DOC_ID);
    expect(['compliant', 'non_compliant']).toContain(record.compliance_status);
    expect(record.citadel_ref).toMatch(/^CITADEL-/);
  });

  test('checkCompliance updates an existing record', async () => {
    const record1 = await citadelService.checkCompliance(DOC_ID);
    const record2 = await citadelService.checkCompliance(DOC_ID);
    // Should be the same document row (upsert)
    expect(record1.document_id).toBe(record2.document_id);
  });

  test('getComplianceStatus returns existing record', async () => {
    await citadelService.checkCompliance(DOC_ID);
    const record = citadelService.getComplianceStatus(DOC_ID);
    expect(record).not.toBeNull();
    expect(record!.document_id).toBe(DOC_ID);
  });

  test('getComplianceStatus returns null for untracked document', () => {
    const record = citadelService.getComplianceStatus('nonexistent-doc');
    expect(record).toBeNull();
  });

  test('syncAllDocuments syncs all active documents', async () => {
    const db = getDatabase();
    db.prepare(`INSERT INTO documents (id, title, owner_id, status) VALUES ('citadel-doc-2', 'Doc 2', 'citadel-user', 'active')`).run();
    db.prepare(`INSERT INTO documents (id, title, owner_id, status) VALUES ('citadel-doc-3', 'Doc 3', 'citadel-user', 'archived')`).run();

    const result = await citadelService.syncAllDocuments();
    expect(result.synced).toBeGreaterThanOrEqual(2);
    expect(result.errors).toBe(0);
  });
});
