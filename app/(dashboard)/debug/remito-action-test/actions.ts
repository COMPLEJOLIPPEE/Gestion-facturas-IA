'use server'

import { redirect } from "next/navigation"

export async function probarRemitoAction(formData: FormData) {
  const itemsRaw = String(formData.get("items") ?? "")
  const itemCount = itemsRaw ? JSON.parse(itemsRaw).length : 0
  const names = Array.from(formData.keys())
  console.log("[remito-debug-real-form]", { itemCount, fields: names })
  redirect("/debug/remito-action-test?ok=1&count=" + itemCount + "&fields=" + encodeURIComponent(names.join(",")))
}
