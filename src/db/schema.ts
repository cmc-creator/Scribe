import { getDatabase } from './database';

export function initializeSchema(): void {
  const db = getDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      owner_id TEXT NOT NULL,
      current_version INTEGER DEFAULT 1,
      status TEXT DEFAULT 'draft',
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      tags TEXT,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS document_versions (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      content_hash TEXT,
      change_notes TEXT,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS signature_requests (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      document_version_id TEXT NOT NULL,
      requester_id TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      message TEXT,
      expires_at DATETIME,
      signed_at DATETIME,
      signature_data TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id),
      FOREIGN KEY (document_version_id) REFERENCES document_versions(id),
      FOREIGN KEY (requester_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS distribution_records (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      document_version_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      batch_id TEXT,
      recipient_email TEXT NOT NULL,
      recipient_name TEXT,
      status TEXT DEFAULT 'sent',
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      delivered_at DATETIME,
      opened_at DATETIME,
      FOREIGN KEY (document_id) REFERENCES documents(id),
      FOREIGN KEY (document_version_id) REFERENCES document_versions(id),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      performed_by TEXT,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS citadel_records (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      citadel_ref TEXT,
      compliance_status TEXT DEFAULT 'pending',
      last_check_at DATETIME,
      next_check_at DATETIME,
      compliance_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id)
    );
  `);
}
