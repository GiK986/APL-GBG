'use client';

export default function ErrorPage({ error }: { error: Error & { digest?: string } }) {
  return (
    <main className="page">
      <div className="panel">
        <h1 className="page-title">Грешка</h1>
        <p className="page-subtitle">Нещо се обърка при зареждане на данните. Опитай отново.</p>
        <pre style={{ color: 'var(--color-text-tertiary)', fontSize: 12, whiteSpace: 'pre-wrap' }}>
          {error.message}
        </pre>
      </div>
    </main>
  );
}
