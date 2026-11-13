import type { ReactNode } from 'react';
import { bs } from '../format';

export function Tarjeta({ titulo, valor, detalle, tono }: {
  titulo: string; valor: string; detalle?: string; tono?: 'bueno' | 'malo';
}) {
  return (
    <div className="tarjeta">
      <div className="tarjeta-titulo">{titulo}</div>
      <div className={`tarjeta-valor ${tono ?? ''}`}>{valor}</div>
      {detalle && <div className="tarjeta-detalle">{detalle}</div>}
    </div>
  );
}

export function Dinero({ centavos }: { centavos: number }) {
  return <span className={centavos < 0 ? 'malo' : ''}>{bs(centavos)}</span>;
}

export function Etiqueta({ children, tono }: { children: ReactNode; tono: 'bueno' | 'malo' | 'aviso' | 'neutro' | 'urgente' }) {
  return <span className={`etiqueta ${tono}`}>{children}</span>;
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return <p className="aviso-estado" role="status">{texto}</p>;
}

export function ErrorCaja({ mensaje, reintentar }: { mensaje: string; reintentar?: () => void }) {
  return (
    <div className="caja-error" role="alert">
      <strong>No se pudo cargar.</strong> {mensaje}
      {reintentar && <button className="boton" onClick={reintentar}>Reintentar</button>}
    </div>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="aviso-estado">{children}</p>;
}
