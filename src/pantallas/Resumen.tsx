import { cajaRango } from '../datos';
import { bs, hace, hoyEn, sumarDias } from '../format';
import { useCarga } from '../hooks';
import type { CajaDia, Sucursal } from '../tipos';
import { Cargando, ErrorCaja, Etiqueta, Tarjeta, Vacio } from '../componentes/Basicos';

/** Vista del dueño: una tarjeta por sucursal + total consolidado del día. */
export function Resumen({ sucursales }: { sucursales: Sucursal[] }) {
  const ids = sucursales.map((s) => s.id);
  const hoyUtc = new Date().toISOString().slice(0, 10);
  // Se piden ayer..mañana (UTC) para cubrir cualquier zona horaria; luego cada sucursal toma SU "hoy".
  const caja = useCarga(() => cajaRango(ids, sumarDias(hoyUtc, -1), sumarDias(hoyUtc, 1)), [ids.join(','), hoyUtc]);

  if (sucursales.length === 0) return <Vacio>No tienes sucursales asignadas todavía. Pide al dueño que te asigne una.</Vacio>;
  if (caja.cargando && !caja.datos) return <Cargando />;
  if (caja.error) return <ErrorCaja mensaje={caja.error} reintentar={caja.recargar} />;

  const filas: CajaDia[] = caja.datos ?? [];
  const deHoy = (s: Sucursal): CajaDia | undefined => {
    const hoy = hoyEn(s.zona_horaria);
    return filas.find((f) => f.sucursal_id === s.id && f.dia === hoy);
  };
  const suma = (k: 'ventas_centavos' | 'gastos_centavos' | 'saldo_centavos') =>
    sucursales.reduce((a, s) => a + (deHoy(s)?.[k] ?? 0), 0);

  return (
    <>
      <h2>Hoy · todas las sucursales</h2>
      <div className="rejilla">
        <Tarjeta titulo="Ventas netas" valor={bs(suma('ventas_centavos'))} />
        <Tarjeta titulo="Gastos" valor={bs(suma('gastos_centavos'))} />
        <Tarjeta titulo="Saldo" valor={bs(suma('saldo_centavos'))} tono={suma('saldo_centavos') < 0 ? 'malo' : undefined} />
      </div>
      <p className="nota">Las cifras de hoy aparecen cuando cada tablet respalda (al cierre del día). Si una sucursal no respaldó, su día puede verse incompleto.</p>

      <h2>Sucursales</h2>
      <div className="rejilla sucursales">
        {sucursales.map((s) => {
          const d = deHoy(s);
          return (
            <a key={s.id} className="tarjeta enlace" href={`#/s/${s.id}/hoy`}>
              <div className="fila-titulo">
                <strong>{s.nombre}</strong>
                {!s.activa ? <Etiqueta tono="neutro">Desactivada</Etiqueta>
                  : s.sin_conexion ? <Etiqueta tono="malo">Sin conexión</Etiqueta>
                  : <Etiqueta tono="bueno">En línea</Etiqueta>}
              </div>
              <div className="tarjeta-valor">{bs(d?.ventas_centavos ?? 0)}</div>
              <div className="tarjeta-detalle">
                {d ? `${d.pedidos_pagados} pedidos · gastos ${bs(d.gastos_centavos)}` : 'Sin ventas respaldadas hoy'}
              </div>
              <div className="tarjeta-detalle">
                {s.respaldo_hoy ? 'Respaldó hoy' : 'Aún no respaldó hoy'} · último respaldo {hace(s.ultimo_respaldo_en)}
              </div>
            </a>
          );
        })}
      </div>
    </>
  );
}
