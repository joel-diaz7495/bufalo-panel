// Tipos de lo que devuelve Supabase. Los bigint de Postgres llegan como número JSON (aquí son montos
// en centavos y conteos pequeños: caben de sobra en un number).

export type Rol = 'dueno' | 'admin_sucursal' | 'lectura';

export interface Admin {
  email: string;
  nombre: string | null;
  rol: Rol;
  organizacion_id: string;
  activo: boolean;
}

export interface Sucursal {
  id: string;
  nombre: string;
  tipo_negocio: string;
  zona_horaria: string;
  activa: boolean;
  ultimo_latido_en: string | null;
  ultimo_respaldo_en: string | null;
  respaldo_hoy: boolean;
  sin_conexion: boolean;
}

export interface CajaDia {
  sucursal_id: string;
  dia: string; // 'YYYY-MM-DD' en la zona horaria de la sucursal
  pedidos_pagados: number;
  pedidos_cancelados: number;
  ventas_centavos: number; // netas: total - descuento
  descuentos_centavos: number;
  efectivo_centavos: number;
  tarjeta_centavos: number;
  qr_centavos: number;
  gastos_centavos: number;
  saldo_centavos: number;
}

export interface CajaMes {
  sucursal_id: string;
  mes: string; // 'YYYY-MM-01'
  pedidos_pagados: number;
  pedidos_cancelados: number;
  ventas_centavos: number;
  descuentos_centavos: number;
  efectivo_centavos: number;
  tarjeta_centavos: number;
  qr_centavos: number;
  gastos_diarios_centavos: number;
  saldo_centavos: number;
}

export interface ProductoMes {
  producto_id: number | null;
  variante_id: number | null;
  nombre_snapshot: string;
  unidades: number;
  bruto_centavos: number;
}

export interface Recibo {
  id: string;
  periodo_tipo: 'dia' | 'mes';
  periodo: string;
  recibido_en: string;
  coincide_tablet: boolean;
}

export interface SubidaFallida {
  id: string;
  periodo_tipo: 'dia' | 'mes';
  periodo: string;
  error: string | null;
  creado_en: string;
}

export type Severidad = 'info' | 'importante' | 'urgente';

export interface Evento {
  id: number;
  sucursal_id: string;
  tipo: string;
  severidad: Severidad;
  mensaje: string;
  creado_en: string;
}
