This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## 🏗️ Estructura del Proyecto (Vox Eternal)

Este proyecto sigue una estructura basada en Next.js App Router, organizada de la siguiente manera:

-   **`/` (Raíz):**
    -   Archivos de configuración (`next.config.mjs`, `tailwind.config.ts`, `tsconfig.json`, `package.json`, etc.).
    -   `middleware.ts`: Middleware de Next.js (probablemente para gestión de sesiones/rutas protegidas).
    -   `README.md`: Este archivo.
-   **`/src/app/`:** Contiene las rutas principales de la aplicación usando App Router.
    -   `/src/app/layout.tsx`: Layout principal de la aplicación.
    -   `/src/app/page.tsx`: Página de inicio (landing page).
    -   `/src/app/login/page.tsx`: Página de inicio de sesión.
    -   `/src/app/dashboard/`: Rutas protegidas del panel de control.
        -   `layout.tsx`: (Si existe) Layout específico para el dashboard.
        -   `page.tsx`: Página principal del dashboard.
        -   `capsule/[id]/page.tsx`: Página de detalle de una cápsula específica.
    -   `/src/app/join/[token]/page.tsx`: Página para aceptar invitaciones a cápsulas.
    -   Otros archivos `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` según las convenciones de App Router.
-   **`/src/components/`:** Componentes reutilizables de React.
    -   `auth/`: Componentes relacionados con la autenticación (ej. `auth-form.tsx`).
    -   `dashboard/`: Componentes específicos para las vistas del dashboard (ej. `capsule-card.tsx`, `capsule-list.tsx`, `messages-section.tsx`, `fab-button.tsx`, `share-modal.tsx`).
    -   `layout/`: Componentes estructurales de la página (ej. `header.tsx`, `footer.tsx`).
    -   Otros componentes UI generales.
-   **`/src/lib/`:** Módulos de utilidad y lógica compartida.
    -   `supabase/client.ts`: Cliente Supabase para el lado del cliente.
    -   Otras utilidades (ej. formateo de fechas, helpers).
-   **`/supabase/`:** Configuración y código relacionado con Supabase Backend.
    -   `functions/`: Contiene las Edge Functions de Supabase.
        -   `_shared/`: Código compartido entre funciones (ej. `cors.ts`).
        -   Directorios individuales para cada función (ej. `create-invitation/`, `accept-invitation/`, `get-invitation-details/`).
        -   **Nota:** Las funciones que manejan subida de archivos (fotos, videos, audios) deben usar el bucket de Supabase Storage llamado `capsules`. La tabla `recuerdos` almacena los metadatos, mientras que el bucket `capsules` almacena los archivos físicos. (Actualización: Se corrigió un problema relacionado con el tipo MIME incorrecto al subir archivos).
    -   `migrations/`: Contiene las migraciones de la base de datos gestionadas por la CLI de Supabase.
    -   **Configuración:**
        -   Project ID (Remoto): `fyauxlcfktjegtqurffj`
-   **`/docs/`:** Documentación del proyecto.
    -   `supabase-schema.md`: Descripción del esquema de la base de datos Supabase, funciones y triggers.
    -   `vox-eternal-todo.md`: Lista de tareas pendientes.
-   **`/public/`:** Archivos estáticos (imágenes, fuentes, etc.) servidos directamente.

---

## ✨ Funcionalidades Implementadas

### Recordatorios Futuros (Implementación Parcial)

Permite a los usuarios programar el envío de cápsulas a un destinatario en una fecha y hora futuras.

**Estado Actual:**
-   **Backend:**
    -   Tablas `future_reminders` y `future_reminder_capsules` creadas en la base de datos.
    -   Funciones Supabase desplegadas:
        -   `create-future-reminder`
        -   `update-future-reminder`
        -   `cancel-future-reminder`
        -   `get-my-future-reminders`
        -   `get-reminder-details-public`
        -   `process-scheduled-reminders` (con envío de email simulado)
-   **Frontend:**
    -   Botón "Nuevo" añadido al dashboard (`/dashboard/page.tsx`).
    -   Página de creación (`/dashboard/reminders/new/page.tsx`) implementada con:
        -   Selector de fecha/hora (`react-datepicker`).
        -   Selector de cápsulas.
        -   Selector de método de entrega (Email/QR).
        -   Campos de destinatario, título y mensaje.
        -   Llamada a la función `create-future-reminder`.

**Próximos Pasos:**
-   Implementar la visualización de la lista de recordatorios en el dashboard.
-   Crear la página pública `/reminder/[access_token]` para los destinatarios.
-   Configurar el Cron Job en Supabase para `process-scheduled-reminders`.
-   Implementar el envío real de emails.
-   Implementar la generación/visualización de códigos QR.
