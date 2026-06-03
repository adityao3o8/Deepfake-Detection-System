import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  strong?: boolean;
}

export function GlassCard({
  className,
  strong,
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl",
        strong ? "glass-strong" : "glass",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
