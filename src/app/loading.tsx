export default function Loading() {
  return (
    <div role="status" className="mx-auto flex w-full max-w-md px-5 py-8 text-sm text-muted">
      <span className="sr-only">Loading</span>
      <span aria-hidden="true">Loading…</span>
    </div>
  );
}
