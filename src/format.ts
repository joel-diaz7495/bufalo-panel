// Utilidades puras (sin React ni Supabase): dinero, fechas y zona horaria. Probadas en format.test.ts.

/** 123456 → "Bs 1.234,56" (separadores propios: no dependemos del ICU del navegador). */
export function bs(centavos: number): string {
  const neg = centavos < 0;
  const abs = Math.abs(Math.round(centavos));
  const enteros = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const dec = (abs % 100).toString().padStart(2, '0');
  return `${neg ? '−' : ''}Bs ${enteros},${dec}`;
}

/** 'YYYY-MM-DD' de AHORA en la zona horaria dada (la "fecha de hoy" de esa sucursal, no la del navegador). */
export function hoyEn(zona: string, ahora: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(ahora);
  } catch {
    return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora);
  }
}

/** Suma días a un 'YYYY-MM-DD' sin pasar por la zona horaria local (cálculo en UTC). */
export function sumarDias(dia: string, n: number): string {
  const [a, m, d] = dia.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Primer día del mes de 'YYYY-MM-DD' → 'YYYY-MM-01'. */
export function primerDiaDelMes(dia: string): string {
  return dia.slice(0, 7) + '-01';
}

/** Resta meses a un 'YYYY-MM-01'. */
export function sumarMeses(mes: string, n: number): string {
  const [a, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1 + n, 1)).toISOString().slice(0, 10);
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** '2026-11-01' → "noviembre 2026" */
export function nombreMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number);
  return `${MESES[m - 1]} ${a}`;
}

/** '2026-11-09' → "09/11" */
export function diaCorto(dia: string): string {
  return `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
}

/** '2026-11-09' → "09/11/2026" */
export function diaLargo(dia: string): string {
  return `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;
}

/** "hace 5 min", "hace 3 h", "hace 2 d" o "nunca". */
export function hace(iso: string | null, ahora: Date = new Date()): string {
  if (!iso) return 'nunca';
  const seg = Math.max(0, Math.round((ahora.getTime() - new Date(iso).getTime()) / 1000));
  if (seg < 90) return 'hace un momento';
  const min = Math.round(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

/** Fecha y hora local del navegador, formato corto. */
export function fechaHora(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Devuelve exactamente un elemento por día entre desde y hasta (incluidos); los días sin datos van en cero. */
export function rellenarDias<T extends { dia: string }>(
  filas: T[], desde: string, hasta: string, vacio: (dia: string) => T,
): T[] {
  const porDia = new Map(filas.map((f) => [f.dia, f]));
  const salida: T[] = [];
  for (let d = desde; d <= hasta; d = sumarDias(d, 1)) salida.push(porDia.get(d) ?? vacio(d));
  return salida;
}
