import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "warning";

type ButtonSize =
  | "sm"
  | "md"
  | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  asChild?: boolean;
  icon?: React.ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",

  secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",

  success: "bg-green-600 text-white hover:bg-green-700",

  danger: "bg-red-600 text-white hover:bg-red-700",

  warning: "bg-yellow-500 text-white hover:bg-yellow-600",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      asChild = false,
      icon,
      children,
      ...props
    },
    ref
  ) => {
    const buttonContent = (
      <>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {icon}
        {children}
      </>
    );

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<any, any>;

      return React.cloneElement(
        child,
        {
          className: cn(
            "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-blue-500",
            "disabled:pointer-events-none disabled:opacity-50",
            variants[variant],
            sizes[size],
            className,
            typeof child.props.className === "string"
              ? child.props.className
              : undefined
          ),
          ...props,
        },
        buttonContent
      );
    }

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-blue-500",
          "disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {buttonContent}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;