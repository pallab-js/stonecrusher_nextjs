"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SelectOption {
  value: string;
  label: string;
}

function FieldShell({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={"grid gap-1.5 " + (className ?? "")}>
      {label ? (
        <Label htmlFor={htmlFor} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </Label>
      ) : null}
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TextField({
  label,
  className,
  ...props
}: React.ComponentProps<"input"> & { label: string }) {
  const id = React.useId();
  return (
    <FieldShell label={label} htmlFor={id} className={className}>
      <Input id={id} {...props} className="h-9 bg-canvas/60" />
    </FieldShell>
  );
}

export function NumberField({
  label,
  className,
  step,
  ...props
}: React.ComponentProps<"input"> & { label: string; step?: string }) {
  const id = React.useId();
  return (
    <FieldShell label={label} htmlFor={id} className={className}>
      <Input
        id={id}
        type="number"
        step={step ?? "any"}
        inputMode="decimal"
        {...props}
        className="h-9 bg-canvas/60"
      />
    </FieldShell>
  );
}

export function DateField({
  label,
  className,
  ...props
}: React.ComponentProps<"input"> & { label: string }) {
  const id = React.useId();
  return (
    <FieldShell label={label} htmlFor={id} className={className}>
      <Input id={id} type="date" {...props} className="h-9 bg-canvas/60" />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  className,
  ...props
}: React.ComponentProps<"textarea"> & { label: string }) {
  const id = React.useId();
  return (
    <FieldShell label={label} htmlFor={id} className={className}>
      <Textarea id={id} {...props} className="min-h-20 bg-canvas/60" />
    </FieldShell>
  );
}

export function SelectField({
  label,
  name,
  value,
  options,
  placeholder = "Select…",
  className,
  onChange,
}: {
  label?: string;
  name: string;
  value?: string | number | null;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  onChange?: (value: string) => void;
}) {
  const initial = value != null && value !== "" ? String(value) : undefined;
  const [selected, setSelected] = React.useState<string | null>(initial ?? null);
  return (
    <FieldShell label={label} className={className}>
      <Select
        name={name}
        value={selected}
        items={options.map((o) => ({ value: o.value, label: o.label }))}
        onValueChange={(v) => {
          setSelected(v as string);
          onChange?.(v as string);
        }}
      >
        <SelectTrigger className="h-9 w-full bg-canvas/60">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  );
}
