import * as React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * PageContainer
 *
 * Contenedor principal de todas las páginas de Lippee OS.
 * Define el ancho, padding y separación vertical estándar.
 */
export default function PageContainer({
  children,
  className,
}: PageContainerProps) {
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-7xl space-y-6 p-6",
        className
      )}
    >
      {children}
    </main>
  );
}