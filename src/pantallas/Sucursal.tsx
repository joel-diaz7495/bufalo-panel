import { useState } from 'react';
import {
  cajaMes, cajaRango, cargarEventos, cargarLeidos, cargarRecibos, cargarSubidasFallidas, marcarLeidos, topProductos,
} from '../datos';
import {
  bs, diaCorto, diaLargo, fechaHora, hace, hoyEn, nombreMes, primerDiaDelMes, rellenarDias, sumarDias, sumarMeses,
} from '../format';
import { useCarga, type Carga } from '../hooks';
import type { CajaDia, Evento, Sucursal as TSucursal } from '../tipos';
import { Cargando, Dinero, ErrorCaja, Etiqueta, Tarjeta, Vacio } from '../componentes/Basicos';
import { GraficoDias } from '../componentes/GraficoDias';

export type Pestana = 'hoy' | 'productos' | 'respaldos' | 'avisos';
const PESTANAS: { id: Pestana; texto: string }[] = [
  { id: 'hoy', texto: 'Hoy y mes' },
  { id: 'productos', texto: 'Productos' },
  { id: 'respaldos', texto: 'Respaldos' },
  { id: 'avisos', texto: 'Avisos' },
];

export function Sucursal({ s, pestana, email }: { s: TSucursal; pestana: Pestana; email: string }) {
  // Avisos y lecturas se cargan aquí para mostrar el contador de no leídos en la pestaña.
  const eventos = useCarga(() => cargarEventos([s.id]), [s.id]);
  const leidos = useCarga(() => cargarLeidos(email), [email]);
  const noLeidos = (eventos.datos ?? []).filter((e) => !(leidos.datos ?? new Set<number>()).has(e.id)).length;

  return (
    <>
      <div className="fila-titulo">
        <h2>{s.nombre}</h2>
        {!s.activa ? <Etiqueta tono="neutro">Desactivada</Etiqueta>
          : s.sin_conexion ? <Etiqueta tono="malo">Sin conexión · latido {hace(s.ultimo_latido_en)}</Etiqueta>
          : <Etiqueta tono="bueno">En línea · latido {hace(s.ultimo_latido_en)}</Etiqueta>}
      </div>

      <nav className="pestanas" aria-label="Secciones de la sucursal">
        {PESTANAS.map((p) => (
          <a key={p.id} href={`#/s/${s.id}/${p.id}`} className={p.id === pestana ? 'activa' : ''}
            aria-current={p.id === pestana ? 'page' : undefined}>
            {p.texto}{p.id === 'avisos' && noLeidos > 0 && <span className="contador">{noLeidos}</span>}
          </a>
        ))}
      </nav>

      {pestana === 'hoy' && <Hoy s={s} />}
      {pestana === 'productos' && <Productos s={s} />}
      {pestana === 'respaldos' && <Respaldos s={s} />}
      {pestana === 'avisos' && (
        <Avisos eventos={eventos} leidos={leidos.datos ?? new Set<number>()} email={email} alMarcar={leidos.recargar} />
      )}
    </>
  );
}

// ───────────────────────────── Hoy y mes ─────────────────────────────

function vacioDia(sucursal_id: string) {
  return (dia: string): CajaDia => ({
    sucursal_id, dia, pedidos_pagados: 0, pedidos_cancelados: 0, ventas_centavos: 0, descuentos_centavos: 0,
    efectivo_centavos: 0, tarjeta_centavos: 0, qr_centavos: 0, gastos_centavos: 0, saldo_centavos: 0,
  });
}

function Hoy({ s }: { s: TSucursal }) {
  const hoy = hoyEn(s.zona_horaria);
  const desde = sumarDias(hoy, -29);
  const mes = primerDiaDelMes(hoy);
  const dias = useCarga(() => cajaRango([s.id], desde, hoy), [s.id, hoy]);
  const delMes = useCarga(() => cajaMes(s.id, mes), [s.id, mes]);

  if (dias.cargando && !dias.datos) return <Cargando />;
  if (dias.error) return <ErrorCaja mensaje={dias.error} reintentar={dias.recargar} />;

  const serie = rellenarDias(dias.datos ?? [], desde, hoy, vacioDia(s.id));
  const d = serie[serie.length - 1];
  const m = delMes.datos;

  return (
    <>
      <p className={`nota ${s.respaldo_hoy ? '' : 'alerta'}`}>
        Datos al último respaldo: {hace(s.ultimo_respaldo_en)}.{' '}
        {s.respaldo_hoy ? '' : 'Esta sucursal aún no respaldó hoy: las cifras de hoy pueden estar incompletas.'}
      </p>

      <h3>Hoy · {diaLargo(hoy)}</h3>
      <div className="rejilla">
        <Tarjeta titulo="Ventas netas" valor={bs(d.ventas_centavos)} detalle={`${d.pedidos_pagados} pedidos pagados · ${d.pedidos_cancelados} cancelados`} />
        <Tarjeta titulo="Gastos" valor={bs(d.gastos_centavos)} />
        <Tarjeta titulo="Saldo" valor={bs(d.saldo_centavos)} tono={d.saldo_centavos < 0 ? 'malo' : undefined} detalle="ventas − gastos del día" />
        <Tarjeta titulo="Cobrado por" valor={`Efectivo ${bs(d.efectivo_centavos)}`}
          detalle={`Tarjeta ${bs(d.tarjeta_centavos)} · QR ${bs(d.qr_centavos)}`} />
      </div>

      <h3>{nombreMes(mes)}</h3>
      {delMes.error ? <ErrorCaja mensaje={delMes.error} reintentar={delMes.recargar} /> : (
        <div className="rejilla">
          <Tarjeta titulo="Ventas netas" valor={bs(m?.ventas_centavos ?? 0)} detalle={`${m?.pedidos_pagados ?? 0} pedidos pagados`} />
          <Tarjeta titulo="Gastos diarios" valor={bs(m?.gastos_diarios_centavos ?? 0)} />
          <Tarjeta titulo="Saldo" valor={bs(m?.saldo_centavos ?? 0)} tono={(m?.saldo_centavos ?? 0) < 0 ? 'malo' : undefined} />
          <Tarjeta titulo="Descuentos" valor={bs(m?.descuentos_centavos ?? 0)} />
        </div>
      )}
      <p className="nota">El saldo es ventas − gastos diarios. No incluye gastos generales (fijos) ni compras de inventario.</p>

      <h3>Últimos 30 días</h3>
      <GraficoDias filas={serie} />

      <h3>Últimos 7 días</h3>
      <div className="tabla-scroll">
        <table>
          <thead><tr><th>Día</th><th className="num">Pedidos</th><th className="num">Ventas</th><th className="num">Gastos</th><th className="num">Saldo</th></tr></thead>
          <tbody>
            {serie.slice(-7).reverse().map((f) => (
              <tr key={f.dia}>
                <td>{diaCorto(f.dia)}</td><td className="num">{f.pedidos_pagados}</td>
                <td className="num"><Dinero centavos={f.ventas_centavos} /></td>
                <td className="num"><Dinero centavos={f.gastos_centavos} /></td>
                <td className="num"><Dinero centavos={f.saldo_centavos} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ───────────────────────────── Productos ─────────────────────────────

function Productos({ s }: { s: TSucursal }) {
  const mesActual = primerDiaDelMes(hoyEn(s.zona_horaria));
  const meses = Array.from({ length: 6 }, (_, i) => sumarMeses(mesActual, -i));
  const [mes, setMes] = useState(mesActual);
  const r = useCarga(() => topProductos(s.id, mes), [s.id, mes]);

  return (
    <>
      <label className="campo">Mes{' '}
        <select value={mes} onChange={(e) => setMes(e.target.value)}>
          {meses.map((m) => <option key={m} value={m}>{nombreMes(m)}</option>)}
        </select>
      </label>
      {r.cargando && !r.datos ? <Cargando /> : r.error ? <ErrorCaja mensaje={r.error} reintentar={r.recargar} /> :
        (r.datos ?? []).length === 0 ? <Vacio>No hay ventas respaldadas en {nombreMes(mes)}.</Vacio> : (
          <div className="tabla-scroll">
            <table>
              <thead><tr><th>#</th><th>Producto</th><th className="num">Unidades</th><th className="num">Ventas brutas</th></tr></thead>
              <tbody>
                {(r.datos ?? []).map((p, i) => (
                  <tr key={`${p.producto_id}-${p.variante_id}-${p.nombre_snapshot}`}>
                    <td>{i + 1}</td><td>{p.nombre_snapshot}</td>
                    <td className="num">{p.unidades}</td><td className="num">{bs(p.bruto_centavos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      <p className="nota">Ventas brutas = antes de descuentos. Ordenado por unidades vendidas (solo pedidos pagados).</p>
    </>
  );
}

// ───────────────────────────── Respaldos ─────────────────────────────

function Respaldos({ s }: { s: TSucursal }) {
  const recibos = useCarga(() => cargarRecibos(s.id), [s.id]);
  const fallidas = useCarga(() => cargarSubidasFallidas(s.id), [s.id]);

  return (
    <>
      <div className="rejilla">
        <Tarjeta titulo="Último respaldo" valor={hace(s.ultimo_respaldo_en)} detalle={s.respaldo_hoy ? 'Respaldó hoy' : 'Aún no respaldó hoy'} />
        <Tarjeta titulo="Último latido" valor={hace(s.ultimo_latido_en)} detalle={s.sin_conexion ? 'Sin conexión (más de 30 h)' : 'La tablet está comunicándose'} tono={s.sin_conexion ? 'malo' : undefined} />
      </div>

      <h3>Recibos recientes</h3>
      {recibos.cargando && !recibos.datos ? <Cargando /> : recibos.error ? <ErrorCaja mensaje={recibos.error} reintentar={recibos.recargar} /> :
        (recibos.datos ?? []).length === 0 ? <Vacio>Todavía no hay respaldos recibidos de esta sucursal.</Vacio> : (
          <div className="tabla-scroll">
            <table>
              <thead><tr><th>Período</th><th>Tipo</th><th>Recibido</th><th>Totales</th></tr></thead>
              <tbody>
                {(recibos.datos ?? []).map((r) => (
                  <tr key={r.id}>
                    <td>{r.periodo}</td><td>{r.periodo_tipo === 'mes' ? 'Mes' : 'Día'}</td><td>{fechaHora(r.recibido_en)}</td>
                    <td>{r.coincide_tablet ? <Etiqueta tono="bueno">Coinciden</Etiqueta> : <Etiqueta tono="malo">No coinciden</Etiqueta>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {(fallidas.datos ?? []).length > 0 && (
        <>
          <h3>Subidas fallidas</h3>
          <ul className="lista">
            {(fallidas.datos ?? []).map((f) => (
              <li key={f.id}><strong>{f.periodo}</strong> · {fechaHora(f.creado_en)}<br /><span className="nota">{f.error ?? 'Sin detalle'}</span></li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

// ───────────────────────────── Avisos ─────────────────────────────

function Avisos({ eventos, leidos, email, alMarcar }: {
  eventos: Carga<Evento[]>; leidos: Set<number>; email: string; alMarcar: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  if (eventos.cargando && !eventos.datos) return <Cargando />;
  if (eventos.error) return <ErrorCaja mensaje={eventos.error} reintentar={eventos.recargar} />;
  const lista = eventos.datos ?? [];
  if (lista.length === 0) return <Vacio>No hay avisos. Aquí aparecerán productos agotados, diferencias de caja o si la sucursal pierde conexión.</Vacio>;

  const marcar = async (ids: number[]) => {
    try { setError(null); await marcarLeidos(email, ids); alMarcar(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };
  const pendientes = lista.filter((e) => !leidos.has(e.id)).map((e) => e.id);
  const tono = { info: 'neutro', importante: 'aviso', urgente: 'urgente' } as const;

  return (
    <>
      {error && <ErrorCaja mensaje={error} />}
      {pendientes.length > 0 && <button className="boton" onClick={() => marcar(pendientes)}>Marcar todos como leídos ({pendientes.length})</button>}
      <ul className="lista">
        {lista.map((e) => {
          const leido = leidos.has(e.id);
          return (
            <li key={e.id} className={leido ? 'leido' : 'nuevo'}>
              <Etiqueta tono={tono[e.severidad]}>{e.severidad}</Etiqueta> <span className="nota">{fechaHora(e.creado_en)}</span>
              <div>{e.mensaje}</div>
              {!leido && <button className="boton chico" onClick={() => marcar([e.id])}>Marcar leído</button>}
            </li>
          );
        })}
      </ul>
    </>
  );
}
