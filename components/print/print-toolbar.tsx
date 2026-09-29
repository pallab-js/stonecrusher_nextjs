"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

export function PrintToolbar({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <div className="mx-auto mb-5 flex max-w-3xl flex-wrap items-center justify-between gap-3 print:hidden">
      <Link
        href={backHref}
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-surface px-3.5 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-accent"
      >
        <ArrowLeft className="size-4" /> {backLabel}
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-green px-4 text-sm font-bold text-black transition hover:bg-green/90"
      >
        <Printer className="size-4" /> Print / save as PDF
      </button>
    </div>
  );
}
