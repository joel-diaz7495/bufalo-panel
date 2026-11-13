import { useCallback, useEffect, useRef, useState } from 'react';

export interface Carga<T> {
  datos: T | null;
  error: string | null;
  cargando: boolean;
  recargar: () => void;
}

/** Ejecuta `fn` al montar y cada vez que cambian `deps`. Ignora respuestas de consultas ya obsoletas. */
export function useCarga<T>(fn: () => Promise<T>, deps: unknown[]): Carga<T> {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [version, setVersion] = useState(0);
  const ultima = useRef(0);

  useEffect(() => {
    const mia = ++ultima.current;
    setCargando(true);
    setError(null);
    fn().then(
      (d) => { if (mia === ultima.current) { setDatos(d); setCargando(false); } },
      (e: unknown) => {
        if (mia === ultima.current) { setError(e instanceof Error ? e.message : String(e)); setCargando(false); }
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  return { datos, error, cargando, recargar };
}

/** Ruta basada en el hash (#/s/<id>/<pestaña>): no necesita reglas de reescritura en el hosting. */
export function useHash(): [string, (nuevo: string) => void] {
  const [hash, setHash] = useState(() => window.location.hash.replace(/^#/, '') || '/');
  useEffect(() => {
    const al = () => setHash(window.location.hash.replace(/^#/, '') || '/');
    window.addEventListener('hashchange', al);
    return () => window.removeEventListener('hashchange', al);
  }, []);
  return [hash, (nuevo) => { window.location.hash = nuevo; }];
}
