import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

type CardProps = HTMLAttributes<HTMLDivElement>;

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-bg-page border border-border-standard rounded-lg p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

Card.displayName = "Card";