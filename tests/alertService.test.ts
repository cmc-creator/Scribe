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
    closeDatabase: () => {},
  };
});

import { getDatabase } from '../src/db/database';
import { initializeSchema } from '../src/db/schema';
import * as alertService from '../src/services/alertService';

beforeAll(async () => {
  await initializeSchema();
  const db = getDatabase();
  await db.execute({ sql: `INSERT INTO users (id, email, name, role) VALUES ('alert-user', 'alert@test.com', 'Alert User', 'user')`, args: [] });

  const soon = new Date();
  soon.setDate(soon.getDate() + 5);

  const far = new Date();
  far.setDate(far.getDate() + 60);

  const past = new Date();
  past.setDate(past.getDate() - 1);

  await db.execute({ sql: `INSERT INTO documents (id, title, owner_id, status, expires_at) VALUES ('alert-doc-1', 'Expiring Soon', 'alert-user', 'active', ?)`, args: [soon.toISOString()] });
  await db.execute({ sql: `INSERT INTO documents (id, title, owner_id, status, expires_at) VALUES ('alert-doc-2', 'Expiring Far', 'alert-user', 'active', ?)`, args: [far.toISOString()] });
  await db.execute({ sql: `INSERT INTO documents (id, title, owner_id, status, expires_at) VALUES ('alert-doc-3', 'Already Expired', 'alert-user', 'active', ?)`, args: [past.toISOString()] });
  await db.execute({ sql: `INSERT INTO documents (id, title, owner_id, status) VALUES ('alert-doc-4', 'No Expiry', 'alert-user', 'active')`, args: [] });
});

describe('alertService', () => {
  test('getExpiryAlerts returns documents expiring within window', async () => {
    const alerts = await alertService.getExpiryAlerts(30);
    const ids = alerts.map((a) => a.document_id);
    expect(ids).toContain('alert-doc-1');
    expect(ids).not.toContain('alert-doc-2');
    expect(ids).not.toContain('alert-doc-3');
    expect(ids).not.toContain('alert-doc-4');
  });

  test('getUpcomingExpirations returns docs expiring within 7 days', async () => {
    const alerts = await alertService.getUpcomingExpirations(7);
    const ids = alerts.map((a) => a.document_id);
    expect(ids).toContain('alert-doc-1');
    expect(ids).not.toContain('alert-doc-2');
  });

  test('alerts have correct days_until_expiry', async () => {
    const alerts = await alertService.getExpiryAlerts(30);
    const alert = alerts.find((a) => a.document_id === 'alert-doc-1');
    expect(alert).toBeDefined();
    expect(alert!.days_until_expiry).toBeGreaterThan(0);
    expect(alert!.days_until_expiry).toBeLessThanOrEqual(7);
  });

  test('markExpiredDocuments marks expired active docs', async () => {
    const count = await alertService.markExpiredDocuments();
    expect(count).toBeGreaterThan(0);
    const db = getDatabase();
    const result = await db.execute({ sql: 'SELECT status FROM documents WHERE id = ?', args: ['alert-doc-3'] });
    const doc = result.rows[0] as unknown as { status: string };
    expect(doc.status).toBe('expired');
  });

  test('acknowledgeAlert returns true for valid document', async () => {
    const result = await alertService.acknowledgeAlert('alert-doc-1');
    expect(result).toBe(true);
  });

  test('acknowledgeAlert returns false for invalid document', async () => {
    const result = await alertService.acknowledgeAlert('nonexistent-doc');
    expect(result).toBe(false);
  });
});
