// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hoyEn } from './format';

// ── Supabase simulado: tablas en memoria + un constructor de consultas con los filtros que usa el panel ──
type Fila = Record<string, unknown>;
const hoy = hoyEn('America/La_Paz');
const S1 = '11111111-1111-4111-8111-111111111111';
const S2 = '22222222-2222-4222-8222-222222222222';

const estado = {
  email: 'dueno@mail.com' as string | null,
  tablas: {} as Record<string, Fila[]>,
  upserts: [] as { tabla: string; filas: Fila[] }[],
};

function constructor(tabla: string) {
  const filtros: ((f: Fila) => boolean)[] = [];
  let limite = Infinity;
  let uno = false;
  const resolver = () => {
    let datos = (estado.tablas[tabla] ?? []).filter((f) => filtros.every((p) => p(f))).slice(0, limite);
    if (uno) return { data: datos[0] ?? null, error: null };
    return { data: datos, error: null };
  };
  const b: Record<string, unknown> = {
    select: () => b,
    eq: (c: string, v: unknown) => { filtros.push((f) => f[c] === v); return b; },
    in: (c: string, vs: unknown[]) => { filtros.push((f) => vs.includes(f[c])); return b; },
    gte: (c: string, v: string) => { filtros.push((f) => String(f[c]) >= v); return b; },
    lte: (c: string, v: string) => { filtros.push((f) => String(f[c]) <= v); return b; },
    order: () => b,
    limit: (n: number) => { limite = n; return b; },
    maybeSingle: () => { uno = true; return Promise.resolve(resolver()); },
    upsert: (filas: Fila[]) => { estado.upserts.push({ tabla, filas }); return Promise.resolve({ data: null, error: null }); },
    then: (ok: (r: unknown) => unknown, ko: (e: unknown) => unknown) => Promise.resolve(resolver()).then(ok, ko),
  };
  return b;
}

vi.mock('./supabase', () => ({
  configuracionOk: true,
  supabase: {
    from: (t: string) => constructor(t),
    auth: {
      getSession: () => Promise.resolve({ data: { session: estado.email ? { user: { email: estado.email } } : null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithOAuth: vi.fn(() => Promise.resolve({ error: null })),
      signOut: vi.fn(() => Promise.resolve({})),
    },
  },
}));

import App from './App';

const suc = (id: string, nombre: string, extra: Fila = {}): Fila => ({
  id, nombre, tipo_negocio: 'restaurante', zona_horaria: 'America/La_Paz', activa: true,
  ultimo_latido_en: new Date().toISOString(), ultimo_respaldo_en: new Date().toISOString(), ...extra,
});
const caja = (sucursal_id: string, dia: string, v: number, g: number): Fila => ({
  sucursal_id, dia, pedidos_pagados: 3, pedidos_cancelados: 1, ventas_centavos: v, descuentos_centavos: 0,
  efectivo_centavos: v, tarjeta_centavos: 0, qr_centavos: 0, gastos_centavos: g, saldo_centavos: v - g,
});

beforeEach(() => {
  window.location.hash = '';
  estado.email = 'dueno@mail.com';
  estado.upserts = [];
  estado.tablas = {
    admins: [{ email: 'dueno@mail.com', nombre: 'Joel', rol: 'dueno', organizacion_id: 'o1', activo: true }],
    sucursales: [suc(S1, 'Centro'), suc(S2, 'Norte')],
    v_estado_sucursales: [
      { sucursal_id: S1, respaldo_hoy: true, sin_conexion: false },
      { sucursal_id: S2, respaldo_hoy: false, sin_conexion: true },
    ],
    v_caja_dia: [caja(S1, hoy, 100000, 20000), caja(S2, hoy, 50000, 60000)],
    v_caja_mes: [{ sucursal_id: S1, mes: hoy.slice(0, 7) + '-01', pedidos_pagados: 40, pedidos_cancelados: 2, ventas_centavos: 900000,
      descuentos_centavos: 10000, efectivo_centavos: 0, tarjeta_centavos: 0, qr_centavos: 0, gastos_diarios_centavos: 300000, saldo_centavos: 600000 }],
    v_ventas_producto_mes: [{ sucursal_id: S1, mes: hoy.slice(0, 7) + '-01', producto_id: 1, variante_id: null, nombre_snapshot: 'Pique macho', unidades: 12, bruto_centavos: 84000 }],
    recibos_nube: [], subidas: [],
    eventos: [{ id: 7, sucursal_id: S1, tipo: 'producto_agotado', severidad: 'importante', mensaje: 'Se agotó la Coca-Cola', creado_en: new Date().toISOString() }],
    eventos_lecturas: [],
  };
});
afterEach(cleanup);

// Espera a que cargue el resumen y entra a la sucursal por su tarjeta (un enlace), no por la <option> del selector.
async function entrarA(nombre: string) {
  await screen.findByText('Hoy · todas las sucursales');
  fireEvent.click(screen.getByRole('link', { name: new RegExp(nombre) }));
}

describe('Panel (integración con Supabase simulado)', () => {
  it('sin sesión muestra el botón de Google', async () => {
    estado.email = null;
    render(<App />);
    expect(await screen.findByText('Continuar con Google')).toBeTruthy();
  });

  it('un correo que NO está en admins ve "Sin acceso" y ningún dato', async () => {
    estado.email = 'intruso@mail.com';
    render(<App />);
    expect(await screen.findByText('Sin acceso')).toBeTruthy();
    expect(screen.queryByText('Centro')).toBeNull();
  });

  it('un admin desactivado tampoco entra', async () => {
    estado.tablas.admins = [{ email: 'dueno@mail.com', nombre: 'Joel', rol: 'dueno', organizacion_id: 'o1', activo: false }];
    render(<App />);
    expect(await screen.findByText('Sin acceso')).toBeTruthy();
  });

  it('el dueño con 2 sucursales ve el resumen consolidado y el estado de cada una', async () => {
    render(<App />);
    expect(await screen.findByText('Hoy · todas las sucursales')).toBeTruthy();
    expect(screen.getAllByText('Bs 1.500,00').length).toBeGreaterThan(0); // 1000 + 500 de ventas
    expect(screen.getByText('Sin conexión')).toBeTruthy();                  // Norte
    expect(screen.getByText('En línea')).toBeTruthy();                      // Centro
    expect(screen.getByText('Aún no respaldó hoy', { exact: false })).toBeTruthy();
  });

  it('entrar a una sucursal muestra hoy, mes y el contador de avisos sin leer', async () => {
    render(<App />);
    await entrarA('Centro');
    expect(await screen.findByText('Últimos 30 días')).toBeTruthy();
    expect(screen.getAllByText('Bs 1.000,00').length).toBeGreaterThan(0);   // ventas de hoy
    expect(screen.getAllByText('Bs 9.000,00').length).toBeGreaterThan(0);   // ventas del mes
    await waitFor(() => expect(document.querySelector('.contador')?.textContent).toBe('1'));
  });

  it('marcar un aviso como leído hace upsert con el correo del admin', async () => {
    render(<App />);
    await entrarA('Centro');
    fireEvent.click(await screen.findByText(/^Avisos/));
    fireEvent.click(await screen.findByText('Marcar leído'));
    await waitFor(() => expect(estado.upserts).toHaveLength(1));
    expect(estado.upserts[0]).toEqual({ tabla: 'eventos_lecturas', filas: [{ evento_id: 7, email: 'dueno@mail.com' }] });
  });

  it('con una sola sucursal entra directo al detalle', async () => {
    estado.tablas.sucursales = [suc(S1, 'Centro')];
    render(<App />);
    expect(await screen.findByText('Últimos 30 días')).toBeTruthy();
    expect(window.location.hash).toBe(`#/s/${S1}/hoy`);
  });

  it('una sucursal sin permiso en la URL muestra error, no datos', async () => {
    window.location.hash = '/s/99999999-9999-4999-8999-999999999999/hoy';
    render(<App />);
    expect(await screen.findByText(/no existe o no tienes acceso/)).toBeTruthy();
  });
});
