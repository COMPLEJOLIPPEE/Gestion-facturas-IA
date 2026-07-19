// app/productos/[id]/page.tsx
type Props = {
  params: Promise<{ id: string }>
}

export default async function ProductoDetalle({ params }: Props) {
  const { id } = await params
  
  const supabase = createServerClient(...)
  const { data: producto, error } = await supabase
    .from('productos')
    .select('*')
    .eq('id', id)   // ojo: id, no codigo
    .single()

  if (error || !producto) {
    return <div>Producto no encontrado</div>
  }

  return (
    // tu JSX acá
  )
}