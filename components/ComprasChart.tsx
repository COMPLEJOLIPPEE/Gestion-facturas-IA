"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export type ComprasPorMes = {
  mes: string
  total: number
}

export function ComprasChart({ data }: { data: ComprasPorMes[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={12}
          tickFormatter={(value) => `$${Number(value).toLocaleString("es-AR")}`}
          width={80}
        />
        <Tooltip
          formatter={(value) => [`$${Number(value ?? 0).toLocaleString("es-AR")}`, "Compras"]}
          cursor={{ fill: "#f3f4f6" }}
        />
        <Bar dataKey="total" fill="#111827" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
