"use client";

import { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui";

type Props = {
  children?: ReactNode;
};

export default function SubmitButton({ children }: Props) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      loading={pending}
      disabled={pending}
    >
      {children ?? "Guardar"}
    </Button>
  );
}