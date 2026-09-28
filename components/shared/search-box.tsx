"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchBox({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={"relative " + (className ?? "")}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 bg-canvas/60 pl-8 sm:w-64"
      />
    </div>
  );
}
