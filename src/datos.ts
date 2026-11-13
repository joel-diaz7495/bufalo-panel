// Todas las consultas del panel, en un solo lugar. Solo LECTURA (más "marcar como leído").
// El RLS del esquema filtra por las sucursales del administrador: aquí no se filtra por permisos.
import { supabase } from './supabase';
import type { Admin, CajaDia, CajaMes, Evento, ProductoMes, Recibo, Sucursal, SubidaFallida } from './tipos';

function ok<T>(r: { data: T | null; error: { message: string } | null }, que: string): T {
  if (r.error) throw new Error(`${que}: ${r.error.message}`);
  return (r.data ?? ([] as unknown)) as T;
}

export async function cargarAdmin(email: string): Promise<Admin | null> {
  const r = await supabase.from('admins').select('email,nombre,rol,organizacion_id,activo')
    .eq('email', email.toLowerCase()).maybeSingle();
  if (r.error) throw new Error(`No se pudo verificar tu acceso: ${r.error.message}`);
  return (r.data as Admin | null) ?? null;
}

/** Sucursales visibles + su estado. Se piden columnas explícitas: `select *` falla por los permisos por columna. */
export async function cargarSucursales(): Promise<Sucursal[]> {
  const [base, estado] = await Promise.all([
    supabase.from('sucursales')
      .select('id,nombre,tipo_negocio,zona_horaria,activa,ultimo_latido_en,ultimo_respaldo_en').order('nombre'),
    supabase.from('v_estado_sucursales').select('sucursal_id,respaldo_hoy,sin_conexion'),
  ]);
  const filas = ok<Omit<Sucursal, 'respaldo_hoy' | 'sin_conexion'>[]>(base, 'Sucursales');
  const est = new Map(ok<{ sucursal_id: string; respaldo_hoy: boolean; sin_conexion: boolean }[]>(estado, 'Estado')
    .map((e) => [e.sucursal_id, e]));
  return filas.map((s) => ({
    ...s,
    respaldo_hoy: est.get(s.id)?.respaldo_hoy ?? false,
    sin_conexion: est.get(s.id)?.sin_conexion ?? true,
  }));
}

export async function cajaRango(ids: string[], desde: string, hasta: string): Promise<CajaDia[]> {
  if (ids.length === 0) return [];
  const r = await supabase.from('v_caja_dia').select('*')
    .in('sucursal_id', ids).gte('dia', desde).lte('dia', hasta).order('dia');
  return ok<CajaDia[]>(r, 'Caja por día');
}

export async function cajaMes(id: string, mes: string): Promise<CajaMes | null> {
  const r = await supabase.from('v_caja_mes').select('*').eq('sucursal_id', id).eq('mes', mes).maybeSingle();
  if (r.error) throw new Error(`Caja del mes: ${r.error.message}`);
  return (r.data as CajaMes | null) ?? null;
}

export async function topProductos(id: string, mes: string, limite = 15): Promise<ProductoMes[]> {
  const r = await supabase.from('v_ventas_producto_mes')
    .select('producto_id,variante_id,nombre_snapshot,unidades,bruto_centavos')
    .eq('sucursal_id', id).eq('mes', mes).order('unidades', { ascending: false }).limit(limite);
  return ok<ProductoMes[]>(r, 'Productos');
}

export async function cargarRecibos(id: string, limite = 30): Promise<Recibo[]> {
  const r = await supabase.from('recibos_nube').select('id,periodo_tipo,periodo,recibido_en,coincide_tablet')
    .eq('sucursal_id', id).order('recibido_en', { ascending: false }).limit(limite);
  return ok<Recibo[]>(r, 'Recibos');
}

export async function cargarSubidasFallidas(id: string, limite = 10): Promise<SubidaFallida[]> {
  const r = await supabase.from('subidas').select('id,periodo_tipo,periodo,error,creado_en')
    .eq('sucursal_id', id).eq('estado', 'fallida').order('creado_en', { ascending: false }).limit(limite);
  return ok<SubidaFallida[]>(r, 'Subidas fallidas');
}

export async function cargarEventos(ids: string[], limite = 50): Promise<Evento[]> {
  if (ids.length === 0) return [];
  const r = await supabase.from('eventos').select('id,sucursal_id,tipo,severidad,mensaje,creado_en')
    .in('sucursal_id', ids).order('creado_en', { ascending: false }).limit(limite);
  return ok<Evento[]>(r, 'Avisos');
}

export async function cargarLeidos(email: string): Promise<Set<number>> {
  const r = await supabase.from('eventos_lecturas').select('evento_id').eq('email', email.toLowerCase());
  return new Set(ok<{ evento_id: number }[]>(r, 'Lecturas').map((x) => x.evento_id));
}

export async function marcarLeidos(email: string, eventoIds: number[]): Promise<void> {
  if (eventoIds.length === 0) return;
  const filas = eventoIds.map((evento_id) => ({ evento_id, email: email.toLowerCase() }));
  // upsert idempotente: marcar dos veces el mismo aviso no es un error.
  const r = await supabase.from('eventos_lecturas').upsert(filas, { onConflict: 'evento_id,email', ignoreDuplicates: true });
  if (r.error) throw new Error(`No se pudo marcar como leído: ${r.error.message}`);
}
