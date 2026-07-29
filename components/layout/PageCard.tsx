import * as React from "react";
import { cn } from "@/lib/utils";

interface PageCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * PageCard
 *
 * Tarjeta estándar para contener tablas, formularios
 * y bloques de información de Lippee OS.
 */
export default function PageCard({
  children,
  className,
}: PageCardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-6 shadow-sm",
        className
      )}
    >
      {children}
    </section>
  );
}