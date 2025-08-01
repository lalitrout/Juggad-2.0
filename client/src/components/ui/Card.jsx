import React from "react";
import clsx from "clsx";

export function Card({ children, className = "" }) {
  return (
    <div
      className={clsx(
        // Base card styles: Rounded, shadowed, with dark mode support
        "rounded-2xl bg-white dark:bg-gray-800 shadow-md border border-gray-100 dark:border-gray-700 " +
        "transition-all duration-200",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardContent({ children, className = "" }) {
  return (
    <div
      className={clsx(
        "p-6", // Consistent padding
        className
      )}
    >
      {children}
    </div>
  );
}