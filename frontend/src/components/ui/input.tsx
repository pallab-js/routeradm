import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full px-2.5 py-1.5 bg-bg-input border border-border-standard rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:border-green-brand transition-colors",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";