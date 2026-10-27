// Platzhalter bis zum UI-Umbau (Tag 4, siehe docs/PLAN.md). Backend: POST /api/inspect.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold">Fair Deposit</h1>
      <p className="text-neutral-600">
        Move-out inspection agent on Meta&apos;s models. The new interface is being built — the
        inspection API is available at <code>POST /api/inspect</code>.
      </p>
    </main>
  );
}
