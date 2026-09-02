export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      categorias_productos: {
        Row: { id: string; nombre: string }
        Insert: { id?: string; nombre: string }
        Update: { id?: string; nombre?: string }
        Relationships: []
      }
      categorias_proveedor: {
        Row: { id: string; nombre: string }
        Insert: { id?: string; nombre: string }
        Update: { id?: string; nombre?: string }
        Relationships: []
      }
      conceptos_factura: {
        Row: { activo: boolean; afecta_costo: boolean; created_at: string; empresa_id: string; id: string; nombre: string; orden: number; requiere_afip: boolean; tipo: string; updated_at: string }
        Insert: { activo?: boolean; afecta_costo?: boolean; created_at?: string; empresa_id: string; id?: string; nombre: string; orden?: number; requiere_afip?: boolean; tipo: string; updated_at?: string }
        Update: { activo?: boolean; afecta_costo?: boolean; created_at?: string; empresa_id?: string; id?: string; nombre?: string; orden?: number; requiere_afip?: boolean; tipo?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "conceptos_factura_empresa_id_fkey"; columns: ["empresa_id"]; isOneToOne: false; referencedRelation: "empresas"; referencedColumns: ["id"] }]
      }
      empresas: {
        Row: { created_at: string | null; id: string; razon_social: string }
        Insert: { created_at?: string | null; id?: string; razon_social: string }
        Update: { created_at?: string | null; id?: string; razon_social?: string }
        Relationships: []
      }
      factura_cargos: {
        Row: { created_at: string; id: number }
        Insert: { created_at?: string; id?: number }
        Update: { created_at?: string; id?: number }
        Relationships: []
      }
      factura_conceptos: {
        Row: { concepto_id: string; created_at: string; descripcion: string | null; factura_id: string; id: string; importe: number; updated_at: string }
        Insert: { concepto_id: string; created_at?: string; descripcion?: string | null; factura_id: string; id?: string; importe?: number; updated_at?: string }
        Update: { concepto_id?: string; created_at?: string; descripcion?: string | null; factura_id?: string; id?: string; importe?: number; updated_at?: string }
        Relationships: [
          { foreignKeyName: "factura_conceptos_concepto_id_fkey"; columns: ["concepto_id"]; isOneToOne: false; referencedRelation: "conceptos_factura"; referencedColumns: ["id"] },
          { foreignKeyName: "factura_conceptos_factura_id_fkey"; columns: ["factura_id"]; isOneToOne: false; referencedRelation: "facturas"; referencedColumns: ["id"] }
        ]
      }
      factura_impuestos: {
        Row: { created_at: string; id: number }
        Insert: { created_at?: string; id?: number }
        Update: { created_at?: string; id?: number }
        Relationships: []
      }
      factura_items: {
        Row: { "alicuota IVA": number | null; bonificacion_importe: number | null; bonificacion_tipo: string | null; cantidad: number | null; cantidad_bonificada: number | null; descuento: number; descuento_importe: number | null; descuentos_detalle: Json | null; factura_id: string | null; id: string; impuestos_internos: number | null; iva: number | null; iva_importe: number | null; precio_bruto_unitario: number | null; precio_final: number | null; precio_neto_unitario: number | null; precio_unitario: number | null; producto_id: string | null; subtotal_neto: number | null }
        Insert: { "alicuota IVA"?: number | null; bonificacion_importe?: number | null; bonificacion_tipo?: string | null; cantidad?: number | null; cantidad_bonificada?: number | null; descuento?: number; descuento_importe?: number | null; descuentos_detalle?: Json | null; factura_id?: string | null; id?: string; impuestos_internos?: number | null; iva?: number | null; iva_importe?: number | null; precio_bruto_unitario?: number | null; precio_final?: number | null; precio_neto_unitario?: number | null; precio_unitario?: number | null; producto_id?: string | null; subtotal_neto?: number | null }
        Update: { "alicuota IVA"?: number | null; bonificacion_importe?: number | null; bonificacion_tipo?: string | null; cantidad?: number | null; cantidad_bonificada?: number | null; descuento?: number; descuento_importe?: number | null; descuentos_detalle?: Json | null; factura_id?: string | null; id?: string; impuestos_internos?: number | null; iva?: number | null; iva_importe?: number | null; precio_bruto_unitario?: number | null; precio_final?: number | null; precio_neto_unitario?: number | null; precio_unitario?: number | null; producto_id?: string | null; subtotal_neto?: number | null }
        Relationships: [
          { foreignKeyName: "factura_items_factura_id_fkey"; columns: ["factura_id"]; isOneToOne: false; referencedRelation: "facturas"; referencedColumns: ["id"] },
          { foreignKeyName: "factura_items_producto_id_fkey"; columns: ["producto_id"]; isOneToOne: false; referencedRelation: "productos"; referencedColumns: ["id"] }
        ]
      }
      facturas: {
        Row: { archivo_url: string | null; confianza_ia: number | null; created_at: string | null; descuento_total: number | null; empresa_id: string | null; estado: string | null; estado_documento: string | null; estado_pago: string | null; fecha: string; fecha_vencimiento: string | null; id: string; iibb: number | null; impuestos_internos: number | null; iva: number | null; iva_105: number | null; iva_21: number | null; iva_27: number | null; iva_exento: number | null; numero: string | null; otros_cargos: number | null; otros_impuestos: number | null; percepcion_iibb_bsas: number | null; percepcion_iibb_caba: number | null; percepcion_iva: number | null; proveedor_id: string | null; subtotal: number | null; subtotal_bruto: number | null; subtotal_neto: number | null; tipo_comprobante: string | null; total: number }
        Insert: { archivo_url?: string | null; confianza_ia?: number | null; created_at?: string | null; descuento_total?: number | null; empresa_id?: string | null; estado?: string | null; estado_documento?: string | null; estado_pago?: string | null; fecha: string; fecha_vencimiento?: string | null; id?: string; iibb?: number | null; impuestos_internos?: number | null; iva?: number | null; iva_105?: number | null; iva_21?: number | null; iva_27?: number | null; iva_exento?: number | null; numero?: string | null; otros_cargos?: number | null; otros_impuestos?: number | null; percepcion_iibb_bsas?: number | null; percepcion_iibb_caba?: number | null; percepcion_iva?: number | null; proveedor_id?: string | null; subtotal?: number | null; subtotal_bruto?: number | null; subtotal_neto?: number | null; tipo_comprobante?: string | null; total: number }
        Update: { archivo_url?: string | null; confianza_ia?: number | null; created_at?: string | null; descuento_total?: number | null; empresa_id?: string | null; estado?: string | null; estado_documento?: string | null; estado_pago?: string | null; fecha?: string; fecha_vencimiento?: string | null; id?: string; iibb?: number | null; impuestos_internos?: number | null; iva?: number | null; iva_105?: number | null; iva_21?: number | null; iva_27?: number | null; iva_exento?: number | null; numero?: string | null; otros_cargos?: number | null; otros_impuestos?: number | null; percepcion_iibb_bsas?: number | null; percepcion_iibb_caba?: number | null; percepcion_iva?: number | null; proveedor_id?: string | null; subtotal?: number | null; subtotal_bruto?: number | null; subtotal_neto?: number | null; tipo_comprobante?: string | null; total?: number }
        Relationships: [
          { foreignKeyName: "facturas_empresa_id_fkey"; columns: ["empresa_id"]; isOneToOne: false; referencedRelation: "empresas"; referencedColumns: ["id"] },
          { foreignKeyName: "facturas_proveedor_id_fkey"; columns: ["proveedor_id"]; isOneToOne: false; referencedRelation: "proveedores"; referencedColumns: ["id"] }
        ]
      }
      formas_pago: {
        Row: { id: string; nombre: string }
        Insert: { id?: string; nombre: string }
        Update: { id?: string; nombre?: string }
        Relationships: []
      }
      ia_procesamientos: {
        Row: { accion_usuario: string | null; created_at: string; estado: string; factura_id: string | null; finalizado_en: string | null; ia_secundaria: string | null; id: string; iniciado_en: string; lineas_detectadas: number | null; motivo_error: string | null; proveedor_ia: string }
        Insert: { accion_usuario?: string | null; created_at?: string; estado?: string; factura_id?: string | null; finalizado_en?: string | null; ia_secundaria?: string | null; id?: string; iniciado_en?: string; lineas_detectadas?: number | null; motivo_error?: string | null; proveedor_ia: string }
        Update: { accion_usuario?: string | null; created_at?: string; estado?: string; factura_id?: string | null; finalizado_en?: string | null; ia_secundaria?: string | null; id?: string; iniciado_en?: string; lineas_detectadas?: number | null; motivo_error?: string | null; proveedor_ia?: string }
        Relationships: [{ foreignKeyName: "ia_procesamientos_factura_id_fkey"; columns: ["factura_id"]; isOneToOne: false; referencedRelation: "facturas"; referencedColumns: ["id"] }]
      }
      pagos: {
        Row: { created_at: string | null; factura_id: string | null; fecha: string; forma_pago_id: string | null; id: string; monto: number; remito_id: string | null }
        Insert: { created_at?: string | null; factura_id?: string | null; fecha: string; forma_pago_id?: string | null; id?: string; monto?: number; remito_id?: string | null }
        Update: { created_at?: string | null; factura_id?: string | null; fecha?: string; forma_pago_id?: string | null; id?: string; monto?: number; remito_id?: string | null }
        Relationships: [
          { foreignKeyName: "pagos_factura_id_fkey"; columns: ["factura_id"]; isOneToOne: false; referencedRelation: "facturas"; referencedColumns: ["id"] },
          { foreignKeyName: "pagos_forma_pago_id_fkey"; columns: ["forma_pago_id"]; isOneToOne: false; referencedRelation: "formas_pago"; referencedColumns: ["id"] },
          { foreignKeyName: "pagos_remito_id_fkey"; columns: ["remito_id"]; isOneToOne: false; referencedRelation: "remitos"; referencedColumns: ["id"] }
        ]
      }
      producto_aliases: {
        Row: { codigo_proveedor: string | null; confianza: number; created_at: string | null; descripcion_normalizada: string; descripcion_original: string; id: string; producto_id: string; proveedor_id: string; ultima_fecha: string | null; updated_at: string | null; veces_usado: number }
        Insert: { codigo_proveedor?: string | null; confianza?: number; created_at?: string; descripcion_normalizada: string; descripcion_original: string; id?: string; producto_id: string; proveedor_id: string; ultima_fecha?: string | null; updated_at?: string | null; veces_usado?: number }
        Update: { codigo_proveedor?: string | null; confianza?: number; created_at?: string; descripcion_normalizada?: string; descripcion_original?: string; id?: string; producto_id?: string; proveedor_id?: string; ultima_fecha?: string | null; updated_at?: string | null; veces_usado?: number }
        Relationships: [
          { foreignKeyName: "producto_aliases_producto_id_fkey"; columns: ["producto_id"]; isOneToOne: false; referencedRelation: "productos"; referencedColumns: ["id"] },
          { foreignKeyName: "producto_aliases_proveedor_id_fkey"; columns: ["proveedor_id"]; isOneToOne: false; referencedRelation: "proveedores"; referencedColumns: ["id"] }
        ]
      }
      productos: {
        Row: { activo: boolean | null; categoria_id: string | null; codigo: string | null; costo_actual: number | null; created_at: string | null; id: string; nombre: string; precio_venta: number | null; ultimo_costo: number | null; unidad_medida: string | null }
        Insert: { activo?: boolean | null; categoria_id?: string | null; codigo?: string | null; costo_actual?: number | null; created_at?: string | null; id?: string; nombre: string; precio_venta?: number | null; ultimo_costo?: number | null; unidad_medida?: string | null }
        Update: { activo?: boolean | null; categoria_id?: string | null; codigo?: string | null; costo_actual?: number | null; created_at?: string | null; id?: string; nombre?: string; precio_venta?: number | null; ultimo_costo?: number | null; unidad_medida?: string | null }
        Relationships: [{ foreignKeyName: "productos_categoria_id_fkey"; columns: ["categoria_id"]; isOneToOne: false; referencedRelation: "categorias_productos"; referencedColumns: ["id"] }]
      }
      proveedores: {
        Row: { activo: boolean | null; categoria_id: string | null; condicion_iva: string | null; condicion_pago: string | null; created_at: string | null; cuit: string | null; email: string | null; etiqueta_1: string | null; etiqueta_2: string | null; id: string; iibb_bsas: number | null; iibb_caba: number | null; nombre_fantasia: string; otros_cargos: string | null; razon_social: string | null; telefono: string | null }
        Insert: { activo?: boolean; categoria_id?: string | null; condicion_iva?: string | null; condicion_pago?: string | null; created_at?: string | null; cuit?: string | null; email?: string | null; etiqueta_1?: string | null; etiqueta_2?: string | null; id?: string; iibb_bsas?: number | null; iibb_caba?: number | null; nombre_fantasia: string; otros_cargos?: string | null; razon_social?: string | null; telefono?: string | null }
        Update: { activo?: boolean | null; categoria_id?: string | null; condicion_iva?: string | null; condicion_pago?: string | null; created_at?: string | null; cuit?: string | null; email?: string | null; etiqueta_1?: string | null; etiqueta_2?: string | null; id?: string; iibb_bsas?: number | null; iibb_caba?: number | null; nombre_fantasia?: string; otros_cargos?: string | null; telefono?: string | null }
        Relationships: [{ foreignKeyName: "proveedores_categoria_id_fkey"; columns: ["categoria_id"]; isOneToOne: false; referencedRelation: "categorias_proveedor"; referencedColumns: ["id"] }]
      }
      remito_items: {
        Row: { bonificacion_importe: number; bonificacion_tipo: string | null; cantidad: number | null; cantidad_bonificada: number | null; descuento: number; descuento_importe: number; descuentos_detalle: Json | null; id: string; precio_bruto_unitario: number | null; precio_final: number | null; precio_neto_unitario: number | null; precio_unitario: number | null; producto_id: string | null; remito_id: string | null; subtotal_neto: number | null }
        Insert: { bonificacion_importe?: number; bonificacion_tipo?: string | null; cantidad?: number | null; cantidad_bonificada?: number | null; descuento?: number; descuento_importe?: number; descuentos_detalle?: Json | null; id?: string; precio_bruto_unitario?: number | null; precio_final?: number | null; precio_neto_unitario?: number | null; precio_unitario?: number | null; producto_id?: string | null; remito_id?: string | null; subtotal_neto?: number | null }
        Update: { bonificacion_importe?: number; bonificacion_tipo?: string | null; cantidad?: number | null; cantidad_bonificada?: number | null; descuento?: number; descuento_importe?: number; descuentos_detalle?: Json | null; id?: string; precio_bruto_unitario?: number | null; precio_final?: number | null; precio_neto_unitario?: number | null; precio_unitario?: number | null; producto_id?: string | null; remito_id?: string | null; subtotal_neto?: number | null }
        Relationships: [
          { foreignKeyName: "remito_items_producto_id_fkey"; columns: ["producto_id"]; isOneToOne: false; referencedRelation: "productos"; referencedColumns: ["id"] },
          { foreignKeyName: "remito_items_remito_id_fkey"; columns: ["remito_id"]; isOneToOne: false; referencedRelation: "remitos"; referencedColumns: ["id"] }
        ]
      }
      remitos: {
        Row: { archivo_url: string | null; codigo_interno: number; created_at: string | null; empresa_id: string | null; estado: string | null; fecha: string; fecha_vencimiento: string | null; id: string; monto_total: number; numero: string | null; proveedor_id: string | null }
        Insert: { archivo_url?: string | null; codigo_interno?: number; created_at?: string | null; empresa_id?: string | null; estado?: string | null; fecha: string; fecha_vencimiento?: string | null; id?: string; monto_total: number; numero?: string | null; proveedor_id?: string | null }
        Update: { archivo_url?: string | null; codigo_interno?: number; created_at?: string | null; empresa_id?: string | null; estado?: string | null; fecha?: string; fecha_vencimiento?: string | null; id?: string; monto_total?: number; numero?: string | null; proveedor_id?: string | null }
        Relationships: [
          { foreignKeyName: "remitos_empresa_id_fkey"; columns: ["empresa_id"]; isOneToOne: false; referencedRelation: "empresas"; referencedColumns: ["id"] },
          { foreignKeyName: "remitos_proveedor_id_fkey"; columns: ["proveedor_id"]; isOneToOne: false; referencedRelation: "proveedores"; referencedColumns: ["id"] }
        ]
      }
      usuario_empresa: {
        Row: { activo: boolean; created_at: string; empresa_id: string; rol: string; usuario_id: string }
        Insert: { activo?: boolean; created_at?: string; empresa_id: string; rol?: string; usuario_id?: string }
        Update: { activo?: boolean; created_at?: string; empresa_id?: string; rol?: string; usuario_id?: string }
        Relationships: [{ foreignKeyName: "usuario_empresa_empresa_id_fkey"; columns: ["empresa_id"]; isOneToOne: false; referencedRelation: "empresas"; referencedColumns: ["id"] }]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      generar_codigo_producto: { Args: never; Returns: string }
      guardar_alias: { Args: { p_codigo_proveedor: string; p_confianza?: number; p_descripcion_normalizada: string; p_descripcion_original: string; p_producto_id: string; p_proveedor_id: string }; Returns: string }
      incrementar_uso_alias: { Args: { p_alias_id: string }; Returns: undefined }
      usuario_puede_acceder_empresa: { Args: { p_empresa_id: string }; Returns: boolean }
      usuario_puede_gestionar_catalogo: { Args: never; Returns: boolean }
      usuario_puede_modificar_empresa: { Args: { p_empresa_id: string }; Returns: boolean }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<Name extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][Name]["Row"]
export type TablesInsert<Name extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][Name]["Insert"]
export type TablesUpdate<Name extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][Name]["Update"]
export type Enums<Name extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][Name]
export type CompositeTypes<Name extends keyof DefaultSchema["CompositeTypes"]> = DefaultSchema["CompositeTypes"][Name]

export const Constants = { public: { Enums: {} } } as const
