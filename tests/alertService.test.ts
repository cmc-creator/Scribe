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
import * as alertService from '../src/services/alertService';

beforeAll(() => {
  initializeSchema();
  const db = getDatabase();
  db.prepare(`INSERT INTO users (id, email, name, role) VALUES ('alert-user', 'alert@test.com', 'Alert User', 'user')`).run();

  const soon = new Date();
  soon.setDate(soon.getDate() + 5);

  const far = new Date();
  far.setDate(far.getDate() + 60);

  const past = new Date();
  past.setDate(past.getDate() - 1);

  db.prepare(`INSERT INTO documents (id, title, owner_id, status, expires_at) VALUES ('alert-doc-1', 'Expiring Soon', 'alert-user', 'active', ?)`).run(soon.toISOString());
  db.prepare(`INSERT INTO documents (id, title, owner_id, status, expires_at) VALUES ('alert-doc-2', 'Expiring Far', 'alert-user', 'active', ?)`).run(far.toISOString());
  db.prepare(`INSERT INTO documents (id, title, owner_id, status, expires_at) VALUES ('alert-doc-3', 'Already Expired', 'alert-user', 'active', ?)`).run(past.toISOString());
  db.prepare(`INSERT INTO documents (id, title, owner_id, status) VALUES ('alert-doc-4', 'No Expiry', 'alert-user', 'active')`).run();
});

describe('alertService', () => {
  test('getExpiryAlerts returns documents expiring within window', () => {
    const alerts = alertService.getExpiryAlerts(30);
    const ids = alerts.map((a) => a.document_id);
    expect(ids).toContain('alert-doc-1');
    expect(ids).not.toContain('alert-doc-2');
    expect(ids).not.toContain('alert-doc-3');
    expect(ids).not.toContain('alert-doc-4');
  });

  test('getUpcomingExpirations returns docs expiring within 7 days', () => {
    const alerts = alertService.getUpcomingExpirations(7);
    const ids = alerts.map((a) => a.document_id);
    expect(ids).toContain('alert-doc-1');
    expect(ids).not.toContain('alert-doc-2');
  });

  test('alerts have correct days_until_expiry', () => {
    const alerts = alertService.getExpiryAlerts(30);
    const alert = alerts.find((a) => a.document_id === 'alert-doc-1');
    expect(alert).toBeDefined();
    expect(alert!.days_until_expiry).toBeGreaterThan(0);
    expect(alert!.days_until_expiry).toBeLessThanOrEqual(7);
  });

  test('markExpiredDocuments marks expired active docs', () => {
    const count = alertService.markExpiredDocuments();
    expect(count).toBeGreaterThan(0);
    const db = getDatabase();
    const doc = db.prepare('SELECT status FROM documents WHERE id = ?').get('alert-doc-3') as { status: string };
    expect(doc.status).toBe('expired');
  });

  test('acknowledgeAlert returns true for valid document', () => {
    const result = alertService.acknowledgeAlert('alert-doc-1');
    expect(result).toBe(true);
  });

  test('acknowledgeAlert returns false for invalid document', () => {
    const result = alertService.acknowledgeAlert('nonexistent-doc');
    expect(result).toBe(false);
  });
});
