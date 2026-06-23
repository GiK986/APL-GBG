'use client';

export default function ErrorPage({ error }: { error: Error & { digest?: string } }) {
  return (
    <main style={{ padding: 24 }}>
      <h1>Грешка</h1>
      <p>Нещо се обърка при зареждане на данните. Опитай отново.</p>
      <pre style={{ color: '#888', fontSize: 12 }}>{error.message}</pre>
    </main>
  );
}
