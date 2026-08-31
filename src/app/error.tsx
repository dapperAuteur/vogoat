"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="mx-auto flex w-full max-w-md flex-col gap-4 px-5 py-8">
      <h1 className="font-display text-2xl italic">Something went wrong.</h1>
      <p role="alert" className="text-sm text-muted">
        Your takes are safe; nothing uploads unless you keep it. Try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="min-h-12 rounded-md bg-moss px-4 font-semibold text-on-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        Try again
      </button>
    </main>
  );
}
