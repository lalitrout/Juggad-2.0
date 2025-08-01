import React from "react";
import clsx from "clsx";

export function Button({
  children,
  className = "",
  variant = "default",
  size = "md",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center font-medium rounded-xl transition focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2";

  const sizeClass = {
    lg: "text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4",
    md: "text-sm sm:text-base px-4 sm:px-5 py-2 sm:py-2.5",
    sm: "text-xs sm:text-sm px-2.5 py-1.5",
    responsive:
      "text-[10px] sm:text-sm md:text-base lg:text-sm px-2 sm:px-4 md:px-6 py-1 sm:py-2 md:py-3",
  }[size] ?? "text-sm sm:text-base px-4 py-2";

  const variants = {
    default:
      "bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow hover:from-emerald-600 hover:to-blue-600",
    ghost:
      "bg-transparent text-emerald-700 hover:bg-emerald-50",
    outline:
      "bg-transparent border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50",
    secondary:
      "bg-white text-emerald-600 border border-gray-200 hover:bg-gray-50 shadow",
  };

  return (
    <button
      className={clsx(
        base,
        variants[variant] || variants.default,
        sizeClass,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}