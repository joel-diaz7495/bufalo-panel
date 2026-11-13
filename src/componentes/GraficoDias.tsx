import { bs, diaCorto } from '../format';
import type { CajaDia } from '../tipos';

/** Barras de ventas y gastos por día, en SVG puro (sin librerías). El detalle exacto está en las tablas de abajo. */
export function GraficoDias({ filas }: { filas: CajaDia[] }) {
  const W = 720, H = 220, padL = 8, padR = 8, padT = 12, padB = 26;
  const max = Math.max(1, ...filas.flatMap((f) => [f.ventas_centavos, f.gastos_centavos]));
  const ancho = (W - padL - padR) / Math.max(1, filas.length);
  const barra = Math.max(2, ancho * 0.36);
  const alto = (v: number) => ((H - padT - padB) * Math.max(0, v)) / max;
  const total = filas.reduce((a, f) => a + f.ventas_centavos, 0);

  return (
    <figure className="grafico">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Ventas y gastos de los últimos ${filas.length} días. Ventas totales ${bs(total)}.`}>
        <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} className="eje" />
        {filas.map((f, i) => {
          const x = padL + i * ancho + ancho / 2;
          return (
            <g key={f.dia}>
              <title>{`${diaCorto(f.dia)} — ventas ${bs(f.ventas_centavos)} · gastos ${bs(f.gastos_centavos)}`}</title>
              <rect x={x - barra - 1} y={H - padB - alto(f.ventas_centavos)} width={barra} height={alto(f.ventas_centavos)} className="b-ventas" rx={1.5} />
              <rect x={x + 1} y={H - padB - alto(f.gastos_centavos)} width={barra} height={alto(f.gastos_centavos)} className="b-gastos" rx={1.5} />
              {i % 5 === 0 && <text x={x} y={H - 8} textAnchor="middle" className="etq">{diaCorto(f.dia)}</text>}
            </g>
          );
        })}
      </svg>
      <figcaption>
        <span className="leyenda ventas" /> Ventas netas <span className="leyenda gastos" /> Gastos
        <span className="max"> · escala máx. {bs(max)}</span>
      </figcaption>
    </figure>
  );
}
