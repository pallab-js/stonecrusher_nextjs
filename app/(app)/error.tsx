"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm">
      <p className="text-muted-foreground">Something went wrong.</p>
      <button className="rounded-md border px-3 py-1.5" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
