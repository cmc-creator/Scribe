import React, { useState } from 'react';
import DocumentList from './components/DocumentList';
import DocumentUpload from './components/DocumentUpload';
import AlertsPanel from './components/AlertsPanel';
import SignatureWorkflow from './components/SignatureWorkflow';
import BulkDistribution from './components/BulkDistribution';
import VersionHistory from './components/VersionHistory';
import { Document } from './types';

type Tab = 'documents' | 'upload' | 'alerts';

const DEMO_USER_ID = 'demo-user';

export default function App(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<Tab>('documents');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [docView, setDocView] = useState<'signatures' | 'distribution' | 'versions' | null>(null);

  function handleDocumentSelect(doc: Document): void {
    setSelectedDoc(doc);
    setDocView('signatures');
  }

  function handleDocumentCreated(doc: Document): void {
    setSelectedDoc(doc);
    setActiveTab('documents');
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <span style={styles.logo}>📄</span>
          <span style={styles.brandName}>NyxScribe</span>
        </div>
        <nav style={styles.nav}>
          {(['documents', 'upload', 'alerts'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedDoc(null); }}
              style={{
                ...styles.navButton,
                ...(activeTab === tab ? styles.navButtonActive : {}),
              }}
            >
              {tab === 'documents' ? '📁 Documents' : tab === 'upload' ? '➕ New Document' : '🔔 Alerts'}
            </button>
          ))}
        </nav>
      </header>

      <main style={styles.main}>
        {activeTab === 'documents' && !selectedDoc && (
          <DocumentList onSelect={handleDocumentSelect} />
        )}

        {activeTab === 'documents' && selectedDoc && (
          <div>
            <button onClick={() => setSelectedDoc(null)} style={styles.backButton}>
              ← Back to Documents
            </button>
            <h2 style={styles.docTitle}>{selectedDoc.title}</h2>
            <div style={styles.tabRow}>
              {(['signatures', 'distribution', 'versions'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setDocView(view)}
                  style={{
                    ...styles.tabButton,
                    ...(docView === view ? styles.tabButtonActive : {}),
                  }}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>

            {docView === 'signatures' && (
              <SignatureWorkflow document={selectedDoc} requesterId={DEMO_USER_ID} />
            )}
            {docView === 'distribution' && (
              <BulkDistribution document={selectedDoc} senderId={DEMO_USER_ID} />
            )}
            {docView === 'versions' && <VersionHistory documentId={selectedDoc.id} />}
          </div>
        )}

        {activeTab === 'upload' && (
          <DocumentUpload ownerId={DEMO_USER_ID} onUploaded={handleDocumentCreated} />
        )}

        {activeTab === 'alerts' && <AlertsPanel />}
      </main>

      <footer style={styles.footer}>
        NyxScribe · Every document. Signed, stored, controlled.
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: { minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', background: '#f8fafc' },
  header: { background: '#1e293b', color: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' },
  brand: { display: 'flex', alignItems: 'center', gap: '8px' },
  logo: { fontSize: '24px' },
  brandName: { fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px' },
  nav: { display: 'flex', gap: '4px' },
  navButton: { padding: '6px 14px', background: 'transparent', border: '1px solid transparent', borderRadius: '6px', color: '#cbd5e1', cursor: 'pointer', fontSize: '14px' },
  navButtonActive: { background: '#334155', borderColor: '#475569', color: '#fff' },
  main: { flex: 1, maxWidth: '900px', width: '100%', margin: '0 auto', padding: '24px 16px' },
  backButton: { background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '14px', marginBottom: '12px', padding: 0 },
  docTitle: { fontSize: '22px', fontWeight: 700, margin: '0 0 16px', color: '#1e293b' },
  tabRow: { display: 'flex', gap: '8px', marginBottom: '16px' },
  tabButton: { padding: '6px 16px', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  tabButtonActive: { background: '#3b82f6', color: '#fff' },
  footer: { textAlign: 'center', padding: '16px', fontSize: '12px', color: '#94a3b8', borderTop: '1px solid #e2e8f0' },
};
