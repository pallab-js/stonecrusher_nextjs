import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-surface/50 px-6 py-16 text-center ring-1 ring-white/5">
      <span className="mb-4 flex size-14 items-center justify-center rounded-feature bg-blurple/15 text-blurple ring-1 ring-blurple/30">
        <Icon className="size-7" />
      </span>
      <h3 className="display text-lg text-white">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
