'use server'

import { redirect } from "next/navigation"

export async function probarRemitoAction(formData: FormData) {
  const itemsRaw = String(formData.get("items") ?? "")
  const items = itemsRaw ? JSON.parse(itemsRaw) : null
  console.log("[remito-debug]", { variant: String(formData.get("variant") ?? ""), itemCount: Array.isArray(items) ? items.length : null, itemsLength: itemsRaw.length })
  redirect("/debug/remito-action-test?ok=1")
}
