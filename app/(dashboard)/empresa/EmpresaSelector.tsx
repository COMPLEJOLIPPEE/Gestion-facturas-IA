'use client'

import { useTransition } from 'react'
import { cambiarEmpresaActiva } from './actions'

type Empresa = { id: string; razon_social: string }

type Props = {
  empresas: Empresa[]
  empresaActivaId: string | null
}

export default function EmpresaSelector({ empresas, empresaActivaId }: Props) {
  const [pending, startTransition] = useTransition()

  if (empresas.length === 0) return null

  return (
    <form action={(formData) => startTransition(() => cambiarEmpresaActiva(formData))} className="mb-6">
      <label htmlFor="empresa-activa" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
        Empresa activa
      </label>
      <select
        id="empresa-activa"
        name="empresa_id"
        defaultValue={empresaActivaId ?? empresas[0].id}
        disabled={pending}
        onChange={(event) => {
          const form = event.currentTarget.form
          if (form) form.requestSubmit()
        }}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:border-gray-500"
      >
        {empresas.map((empresa) => (
          <option key={empresa.id} value={empresa.id}>
            {empresa.razon_social}
          </option>
        ))}
      </select>
      {pending && <p className="mt-1 text-xs text-gray-500">Cambiando empresa…</p>}
    </form>
  )
}
