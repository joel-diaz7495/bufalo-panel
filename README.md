# Búfalo — Panel del dueño (PWA)

Panel web **de solo lectura** para ver ventas, caja, productos, respaldos y avisos de tus sucursales.
Vite + React + TypeScript + `supabase-js`. Se instala como app en el celular (PWA). No tiene servidor propio:
habla directo con Supabase usando el **RLS** del esquema (cada admin ve solo sus sucursales).

## Qué incluye
- Login con Google. Entrar no basta: el correo debe estar en `public.admins` y activo; si no, "Sin acceso".
- **Resumen** (dueño con varias sucursales): total del día y una tarjeta por sucursal (en línea / sin conexión, respaldó hoy).
- **Por sucursal**: Hoy y mes (ventas netas, gastos, saldo, cobro por método), gráfico de 30 días, tabla de 7 días;
  Productos más vendidos por mes; Respaldos (recibos y subidas fallidas); Avisos con contador de no leídos y "marcar leído".
- PWA instalable. Offline solo se guarda el cascarón: **los datos nunca se cachean**.

## Importante sobre los datos
- La nube se actualiza **cuando la tablet respalda** (al cierre del día o manualmente), no en tiempo real. El panel lo avisa:
  si la sucursal no respaldó hoy, las cifras de hoy pueden estar incompletas.
- Montos en centavos, Bs. Ventas netas = total − descuento. "Hoy" se calcula en la zona horaria de **cada sucursal**.
- Saldo = ventas − gastos diarios (no incluye gastos generales ni compras de inventario).
- Es solo lectura: no puede editar menú, usuarios ni inventario de la tablet.

## Seguridad
- Usa **solo la clave pública** (anon/publishable). **Nunca** pongas la `service_role` en este proyecto: iría dentro del JS del navegador.
- `public/_headers` (Netlify/Cloudflare) y `vercel.json` traen CSP y cabeceras de seguridad.
- Verifica el RLS con un correo que no sea admin y con uno de una sola sucursal (ver Checklist).

## Puesta en marcha
```bash
cp .env.example .env     # completa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm install
npm run dev              # http://localhost:5173
npm test                 # 16 pruebas (utilidades + app completa con Supabase simulado)
npm run build            # tsc estricto + build de producción en dist/
```
- Nube: URL y clave en Supabase → Project Settings → API.
- Local: `http://127.0.0.1:55321` y la clave de `supabase status` (tu proyecto usa puertos 553xx).

## Google OAuth (lo que suele fallar)
1. Google Cloud → credenciales OAuth: agrega como URI de redirección `https://<REF>.supabase.co/auth/v1/callback`
   (y `http://127.0.0.1:55321/auth/v1/callback` para local).
2. Supabase → Authentication → Providers → Google: pega Client ID y Secret.
3. Supabase → Authentication → **URL Configuration**: Site URL = la URL de tu panel;
   en Redirect URLs agrega `http://localhost:5173` y la URL de producción. Sin esto, tras el login vuelve a otra página.
   En local: en `supabase/config.toml` pon `site_url = "http://localhost:5173"` y
   `additional_redirect_urls = ["http://localhost:5173"]`.
4. Si la app de Google está en modo "Prueba", agrega cada correo como usuario de prueba o publícala.
5. Alta del admin (SQL Editor), **antes** de que entre: `insert into public.admins (email, nombre, organizacion_id, rol) values ('correo@gmail.com','Nombre','<id-organizacion>','dueno');`
   Roles: `dueno` ve todas las sucursales de la organización; `admin_sucursal` y `lectura` solo las de `public.admin_sucursales`.

## Despliegue
Es estático. En Vercel/Netlify/Cloudflare Pages: build `npm run build`, salida `dist`, y las dos variables `VITE_*`.
Usa rutas por hash (`#/s/<id>/hoy`), así que no hacen falta reglas de reescritura.

## Estructura
```
src/format.ts            dinero (Bs), fechas, zona horaria de la sucursal (puro, con pruebas)
src/datos.ts             todas las consultas a Supabase (columnas explícitas: sucursales no admite select *)
src/auth.tsx             sesión Google + verificación contra public.admins
src/pantallas/Resumen    vista del dueño      src/pantallas/Sucursal   Hoy · Productos · Respaldos · Avisos
src/componentes/         tarjetas, etiquetas, gráfico SVG sin librerías
```

## Verificación hecha y pendiente
- Hecho: `tsc --strict` sin errores, build de producción, 16 pruebas (incluido: correo no autorizado ve "Sin acceso",
  resumen consolidado, "hoy" por zona horaria, marcar avisos leídos).
- **No probado contra tu Supabase real** (ni el login de Google ni el RLS con un JWT verdadero). Hazlo con este checklist:
  - [ ] Entrar con tu correo (dueño) y ver tus sucursales.
  - [ ] Entrar con un Gmail que NO está en `admins` → "Sin acceso".
  - [ ] Un `admin_sucursal` asignado a una sola sucursal no ve las otras.
  - [ ] Tras un respaldo real, "Hoy" coincide con la tablet y los recibos dicen "Coinciden".
  - [ ] Instalar en el celular y comprobar que abre y que sin internet no muestra cifras viejas.

## Siguiente (no incluido)
Gestión de sucursales/admins (requiere una Edge Function de administración), envío de avisos al celular,
consolidados comparativos y exportaciones.
