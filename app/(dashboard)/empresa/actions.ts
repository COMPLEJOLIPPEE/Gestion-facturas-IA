'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const COOKIE_NAME = 'factura_ia_empresa_activa'

export async function cambiarEmpresaActiva(formData: FormData) {
  const empresaId = String(formData.get('empresa_id') ?? '').trim()
  if (!empresaId) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // La autorización real la hace la base mediante usuario_empresa/RLS.
  const { data: acceso } = await supabase
    .from('usuario_empresa')
    .select('empresa_id')
    .eq('usuario_id', user.id)
    .eq('empresa_id', empresaId)
    .eq('activo', true)
    .maybeSingle()

  if (!acceso) return

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, empresaId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })

  redirect('/dashboard')
}
