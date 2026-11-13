import { useEffect } from 'react';
import { ProveedorAuth, useAuth } from './auth';
import { cargarSucursales } from './datos';
import { useCarga, useHash } from './hooks';
import { configuracionOk } from './supabase';
import type { Admin } from './tipos';
import { Cargando, ErrorCaja } from './componentes/Basicos';
import { Resumen } from './pantallas/Resumen';
import { Sucursal, type Pestana } from './pantallas/Sucursal';

export default function App() {
  if (!configuracionOk) {
    return (
      <Centrado>
        <h1>Falta configurar</h1>
        <p>Crea un archivo <code>.env</code> con <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> (ver <code>.env.example</code>) y vuelve a iniciar.</p>
      </Centrado>
    );
  }
  return <ProveedorAuth><Puerta /></ProveedorAuth>;
}

function Centrado({ children }: { children: React.ReactNode }) {
  return <main className="centrado"><div className="panel-centrado">{children}</div></main>;
}

/** Decide qué mostrar según la sesión: login, sin permiso, error o el panel. */
function Puerta() {
  const { estado, entrarConGoogle, salir } = useAuth();

  if (estado.tipo === 'cargando') return <Centrado><Cargando texto="Verificando tu acceso…" /></Centrado>;

  if (estado.tipo === 'sin_sesion') {
    return (
      <Centrado>
        <h1>🐃 Búfalo</h1>
        <p>Panel del dueño: ventas, caja, respaldos y avisos de tus sucursales.</p>
        <button className="boton grande" onClick={() => { void entrarConGoogle().catch((e: unknown) => alert(e instanceof Error ? e.message : String(e))); }}>
          Continuar con Google
        </button>
      </Centrado>
    );
  }

  if (estado.tipo === 'sin_permiso') {
    return (
      <Centrado>
        <h1>Sin acceso</h1>
        <p><strong>{estado.email}</strong> no está autorizado para ver este panel. Pide al dueño que agregue tu correo como administrador.</p>
        <button className="boton" onClick={() => void salir()}>Cerrar sesión</button>
      </Centrado>
    );
  }

  if (estado.tipo === 'error') {
    return (
      <Centrado>
        <ErrorCaja mensaje={estado.mensaje} />
        <button className="boton" onClick={() => void salir()}>Cerrar sesión</button>
      </Centrado>
    );
  }

  return <Panel admin={estado.admin} salir={() => void salir()} />;
}

const ETIQUETA_ROL: Record<Admin['rol'], string> = { dueno: 'Dueño', admin_sucursal: 'Admin de sucursal', lectura: 'Solo lectura' };

function Panel({ admin, salir }: { admin: Admin; salir: () => void }) {
  const [ruta] = useHash();
  const sucursales = useCarga(cargarSucursales, []);
  const lista = sucursales.datos ?? [];

  // Con una sola sucursal no hace falta la vista de resumen: se entra directo.
  const partes = ruta.split('/').filter(Boolean); // ['s', id, pestaña]
  const idActual = partes[0] === 's' ? partes[1] : undefined;
  const pestana = (['hoy', 'productos', 'respaldos', 'avisos'].includes(partes[2]) ? partes[2] : 'hoy') as Pestana;
  const unica = lista.length === 1 ? lista[0] : undefined;

  useEffect(() => {
    if (unica && !idActual) window.location.hash = `/s/${unica.id}/hoy`;
  }, [unica, idActual]);

  const sel = lista.find((s) => s.id === idActual);

  return (
    <div className="app">
      <header className="cabecera">
        <a className="marca" href="#/">🐃 Búfalo</a>
        {lista.length > 1 && (
          <select aria-label="Sucursal" value={idActual ?? ''} onChange={(e) => { window.location.hash = e.target.value ? `/s/${e.target.value}/hoy` : '/'; }}>
            <option value="">Todas las sucursales</option>
            {lista.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}
        <span className="espacio" />
        <span className="usuario" title={admin.email}>{admin.nombre ?? admin.email} · {ETIQUETA_ROL[admin.rol]}</span>
        <button className="boton chico" onClick={salir}>Salir</button>
      </header>

      <main className="contenido">
        {sucursales.cargando && !sucursales.datos ? <Cargando /> :
          sucursales.error ? <ErrorCaja mensaje={sucursales.error} reintentar={sucursales.recargar} /> :
          idActual ? (sel ? <Sucursal key={sel.id} s={sel} pestana={pestana} email={admin.email} />
            : <ErrorCaja mensaje="Esa sucursal no existe o no tienes acceso a ella." />) :
          <Resumen sucursales={lista} />}
      </main>
    </div>
  );
}
