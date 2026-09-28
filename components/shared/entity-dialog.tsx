"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { FormState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function EntityDialog({
  title,
  description,
  trigger,
  triggerLabel = "Add",
  action,
  children,
  submitLabel = "Save",
  open: controlledOpen,
  onOpenChange,
  onSuccess,
  footer,
  triggerClassName,
}: {
  title: string;
  description?: string;
  trigger?: React.ReactNode;
  triggerClassName?: string;
  triggerLabel?: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  children: React.ReactNode;
  submitLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  footer?: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (o: boolean) => {
    if (isControlled) onOpenChange?.(o);
    else setInternalOpen(o);
  };

  const wrappedAction = async (_prev: FormState, formData: FormData): Promise<FormState> => {
    const result = await action(_prev, formData);
    if (result?.success) {
      toast.success(result.success);
      setOpen(false);
      onSuccess?.();
    } else if (result?.error) {
      toast.error(result.error);
    }
    return result;
  };

  const [, formAction, pending] = useActionState<FormState, FormData>(wrappedAction, null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={
          triggerClassName ??
          "inline-flex h-9 items-center gap-1.5 rounded-md bg-blurple px-3.5 text-sm font-semibold text-white outline-none transition hover:bg-blurple/90 active:translate-y-px"
        }
      >
        {trigger ?? `+ ${triggerLabel}`}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-hairline bg-surface sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="display text-lg text-white">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-muted-foreground">{description}</DialogDescription>
          )}
        </DialogHeader>
        <form action={formAction} className="grid gap-4 py-2">
          {children}
          <DialogFooter className="gap-2 pt-2">
            {footer}
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-muted-foreground"
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="rounded-md bg-blurple font-semibold text-white hover:bg-blurple/90"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
