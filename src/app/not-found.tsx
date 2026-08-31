import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-md flex-col gap-4 px-5 py-8">
      <h1 className="font-display text-2xl italic">Not observed.</h1>
      <p className="text-sm text-muted">That page is not in the field guide.</p>
      <Link href="/" className="text-sm font-semibold text-moss underline-offset-4 hover:underline">
        Back to today
      </Link>
    </main>
  );
}
