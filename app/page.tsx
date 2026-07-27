// Server Component — no 'use client' directive
// Entire app is client-only (IndexedDB, Web Crypto API, WebAuthn).
// We skip SSR completely to avoid hydration mismatches.
import dynamic from 'next/dynamic';

const ClientApp = dynamic(() => import('./app-client'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: '100vh',
        background: '#090d16',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '2px solid #06b6d4',
          borderTopColor: 'transparent',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  ),
});

export default function Page() {
  return <ClientApp />;
}
