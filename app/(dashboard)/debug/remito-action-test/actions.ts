'use server'

import { redirect } from "next/navigation"

export async function probarRemitoAction(formData: FormData) {
  const variant = String(formData.get("variant") ?? "")
  const itemsRaw = String(formData.get("items") ?? "")
  const items = itemsRaw ? JSON.parse(itemsRaw) : null
  const itemCount = Array.isArray(items) ? items.length : 0

  console.log("[remito-debug] action received", {
    variant,
    itemsType: Array.isArray(items) ? "array" : typeof items,
    itemCount,
    itemsLength: itemsRaw.length,
  })

  redirect(`/debug/remito-action-test?ok=1&variant=${encodeURIComponent(variant)}&count=${itemCount}`)
}
