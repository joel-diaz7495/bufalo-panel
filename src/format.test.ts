import { describe, expect, it } from 'vitest';
import { bs, diaCorto, hace, hoyEn, nombreMes, primerDiaDelMes, rellenarDias, sumarDias, sumarMeses } from './format';

describe('bs', () => {
  it('formatea centavos con separadores bolivianos', () => {
    expect(bs(0)).toBe('Bs 0,00');
    expect(bs(5)).toBe('Bs 0,05');
    expect(bs(123456)).toBe('Bs 1.234,56');
    expect(bs(100000000)).toBe('Bs 1.000.000,00');
  });
  it('negativos con signo menos', () => {
    expect(bs(-1050)).toBe('−Bs 10,50');
  });
});

describe('hoyEn', () => {
  it('usa la zona de la sucursal, no la del navegador', () => {
    const instante = new Date('2026-11-12T02:30:00Z'); // 11 nov 22:30 en La Paz (UTC-4)
    expect(hoyEn('America/La_Paz', instante)).toBe('2026-11-11');
    expect(hoyEn('UTC', instante)).toBe('2026-11-12');
  });
  it('zona inválida no rompe', () => {
    expect(hoyEn('Zona/Falsa', new Date('2026-11-12T12:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('fechas', () => {
  it('sumarDias cruza meses y años', () => {
    expect(sumarDias('2026-11-30', 1)).toBe('2026-12-01');
    expect(sumarDias('2026-01-01', -1)).toBe('2025-12-31');
    expect(sumarDias('2028-02-28', 1)).toBe('2028-02-29');
  });
  it('meses', () => {
    expect(primerDiaDelMes('2026-11-17')).toBe('2026-11-01');
    expect(sumarMeses('2026-01-01', -1)).toBe('2025-12-01');
    expect(nombreMes('2026-03-01')).toBe('marzo 2026');
    expect(diaCorto('2026-11-09')).toBe('09/11');
  });
  it('hace()', () => {
    const ahora = new Date('2026-11-12T12:00:00Z');
    expect(hace(null, ahora)).toBe('nunca');
    expect(hace('2026-11-12T11:59:30Z', ahora)).toBe('hace un momento');
    expect(hace('2026-11-12T11:30:00Z', ahora)).toBe('hace 30 min');
    expect(hace('2026-11-12T06:00:00Z', ahora)).toBe('hace 6 h');
    expect(hace('2026-11-09T12:00:00Z', ahora)).toBe('hace 3 d');
  });
});

describe('rellenarDias', () => {
  it('completa los días sin datos con ceros y conserva los que hay', () => {
    const filas = [{ dia: '2026-11-02', v: 5 }];
    const r = rellenarDias(filas, '2026-11-01', '2026-11-03', (dia) => ({ dia, v: 0 }));
    expect(r.map((x) => x.v)).toEqual([0, 5, 0]);
    expect(r).toHaveLength(3);
  });
});
