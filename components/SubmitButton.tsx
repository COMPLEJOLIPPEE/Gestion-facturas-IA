"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded px-4 py-2 text-white transition ${
        pending
          ? "cursor-not-allowed bg-gray-500"
          : "bg-black hover:bg-gray-800"
      }`}
    >
      {pending ? "⏳ Guardando..." : "Guardar producto"}
    </button>
  );
}