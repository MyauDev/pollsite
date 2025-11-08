import type { ReactNode, ButtonHTMLAttributes } from "react";
import { clsx } from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
   variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
   size?: "sm" | "md" | "lg";
   children: ReactNode;
   fullWidth?: boolean;
}

export const Button = ({
   variant = "primary",
   size = "md",
   fullWidth = false,
   className,
   children,
   disabled,
   ...props
}: ButtonProps) => {
   const baseStyles = "font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

   const variantStyles = {
      primary: "bg-pink text-black hover:bg-pink-alpha focus:ring-pink uppercase",
      secondary: "bg-gray text-white hover:bg-pink-alpha focus:ring-gray",
      outline: "border-2 border-pink text-pink hover:bg-pink-light focus:ring-pink",
      danger: "bg-pink text-white hover:bg-pink-alpha focus:ring-pink",
      ghost: "text-white hover:bg-gray focus:ring-gray",
   };

   const sizeStyles = {
      sm: "px-4 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
   };

   return (
      <button
         className={clsx(
            baseStyles,
            variantStyles[variant],
            sizeStyles[size],
            fullWidth && "w-full",
            className
         )}
         disabled={disabled}
         {...props}
      >
         {children}
      </button>
   );
};
