import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "font-medium rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" && "px-4 py-1.5 text-sm",
        size === "md" && "px-8 py-2 text-sm",
        variant === "primary" && "bg-bg-deep text-text-primary border border-text-primary hover:bg-text-primary hover:text-bg-deep focus:ring-2 focus:ring-green-brand/50",
        variant === "secondary" && "bg-bg-deep text-text-primary border border-border-standard opacity-80 hover:opacity-100",
        variant === "ghost" && "bg-transparent text-text-primary border border-transparent hover:bg-bg-elevated",
        variant === "destructive" && "bg-red-brand/20 text-red-brand border border-red-brand/50 hover:bg-red-brand/30",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);

Button.displayName = "Button";