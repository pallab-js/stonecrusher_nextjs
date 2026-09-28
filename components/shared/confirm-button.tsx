"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ConfirmButton({
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  trigger,
  variant = "destructive",
  disabled,
  triggerClassName,
}: {
  onConfirm: () => Promise<void> | void;
  title: string;
  description?: string;
  confirmLabel?: string;
  trigger: React.ReactNode;
  variant?: "destructive" | "default";
  disabled?: boolean;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const handle = async () => {
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        disabled={disabled}
        className={
          triggerClassName ??
          "inline-flex h-8 items-center gap-1.5 rounded-md bg-destructive/15 px-3 text-xs font-semibold text-destructive outline-none transition hover:bg-destructive/25 disabled:opacity-50"
        }
      >
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent className="border-hairline bg-surface">
        <AlertDialogHeader>
          <AlertDialogTitle className="display text-base text-white">{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={handle}
            className={
              variant === "destructive"
                ? "bg-destructive font-semibold text-white hover:bg-destructive/90"
                : "bg-blurple font-semibold text-white hover:bg-blurple/90"
            }
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
