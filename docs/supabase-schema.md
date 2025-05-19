## [Contexto actual de Mensajes al Futuro – abril 2025]

- Se migró el estado de las cápsulas programadas de `sent` a `available` para mayor claridad semántica.
- Todas las funciones Edge, lógica de backend y frontend ya operan con el nuevo estado `available`.
- Las migraciones SQL y el enum en la base de datos están actualizados y auditados.
- El receptor solo puede abrir la cápsula si el recordatorio está en estado `available`.
- Si el status es `scheduled`, se muestra cuenta regresiva y se bloquea el acceso.
- El acceso es seguro: solo el destinatario autenticado puede abrir la cápsula.
- Al abrir, la cápsula y recuerdos se transfieren al dashboard del receptor y se marca como abierta.
- Se envía email al crear el recordatorio, 1 día antes, cuando está disponible y cada 3 días si no se ha abierto.
- Todo el tracking de notificaciones y aperturas queda registrado en la base de datos.
- Aunque la migración y el backend están correctos, al abrir el link del recordatorio (tanto en producción como en localhost), el sistema sigue mostrando "la cápsula no está disponible".
- El error puede deberse a un desajuste de sesión/autenticación, validación estricta del destinatario, o diferencias entre ambientes (localhost vs producción).

---

### [2025-04-24] Control de límites de almacenamiento por plan

- Se agregó el campo `almacenamientoMaxMB` a la definición de planes en `src/lib/planFeatures.ts`.
- El dashboard administrativo muestra el uso de almacenamiento por usuario y total del sistema.
- **Limitación actual:** El límite mostrado por usuario es fijo (500MB, plan Gratis) porque la función `usuarios_por_plan_activo()` no devuelve el user_id.
- **Recomendación:** Crear una vista o función SQL que devuelva para cada usuario su plan activo (`user_id`, `plan`), para poder comparar el uso real contra el límite correcto y mostrar alertas precisas.
- Ver detalle y pendientes en `docs/vox-eternal-todo.md`.
  - Workaround con endpoint `/api/auth/set-session` y fetch con `credentials: "include"` para que la cookie de sesión se propague correctamente al SSR.
  - El SSR ahora recibe la cookie y puede autenticar al usuario en rutas protegidas.
  - Validación de rol en la tabla `usuarios` (`rol === 'admin'`) para acceso seguro a `/admin/dashboard`.
  - Fix de dependencias y errores de agrupamiento en métricas.
  - Referencia: ver detalles en `docs/vox-eternal-todo.md` y `docs/vox-eternal-changelog.md`.
- [x] Migración aplicada: `20250424181000_add_rol_to_usuarios.sql` (campo `rol` en tabla `usuarios`).
- [x] El dashboard admin ahora valida el rol y muestra métricas solo a usuarios autorizados.
- [ ] Pendiente: Mejorar la presentación visual del dashboard admin (`/admin/dashboard`), aplicar diseño más atractivo y visualizaciones.

---

Este documento describe el esquema de la base de datos PostgreSQL utilizada en Supabase para el proyecto Vox Eternal.

**Última actualización:** Basado en la consulta a `information_schema.columns` el 2025-04-14.

<!-- ... resto del archivo sin cambios ... -->
| created_at            | timestamptz | NO      | Fecha de creación del registro                                              |
| updated_at            | timestamptz | NO      | Fecha de última actualización                                               |

- Índice: user_id
- Trigger: actualiza automáticamente `updated_at` en cada modificación.

**Notas:**
- Cada usuario puede tener varias suscripciones históricas, pero solo una activa por usuario y plan.
- El campo `status` se sincroniza con Stripe mediante webhooks.
- El campo `plan` debe coincidir con los valores definidos en la lógica de negocio y la UI.
- El acceso premium se controla consultando la suscripción activa y su estado.

---

### Sincronización Stripe–Supabase

La tabla `subscriptions` se mantiene sincronizada automáticamente con Stripe mediante el webhook implementado en `supabase/functions/stripe-webhook/index.ts`.  
Cada evento relevante de Stripe actualiza los campos clave de la suscripción según el siguiente mapeo:

| Evento Stripe                  | Acción en Supabase (`subscriptions`)                                   |
|------------------------------- | ---------------------------------------------------------------------- |
| `checkout.session.completed`   | Alta de suscripción: crea o actualiza registro, status = `active`      |
| `invoice.paid`                 | Renovación: actualiza periodo y status = `active`                      |
| `invoice.payment_failed`       | Fallo de pago: status = `past_due`                                     |
| `customer.subscription.updated`| Actualiza plan, fechas y status según Stripe                           |
| `customer.subscription.deleted`| Cancela suscripción: status = `canceled`, registra fecha de fin        |
| `customer.subscription.created`| Alta directa (no vía checkout): asocia IDs y periodo                   |

**Campos clave sincronizados:**
- `stripe_subscription_id`: ID único de la suscripción en Stripe.
- `stripe_customer_id`: ID del cliente en Stripe.
- `plan`: nombre del plan según el producto/precio de Stripe.
- `status`: estado real de la suscripción (`active`, `canceled`, `past_due`, etc.).
- `started_at`: fecha de inicio de la suscripción (se mapea desde `current_period_start` de Stripe).
- `current_period_end`: fin del periodo actual (se mapea desde Stripe).
- Otros campos como `canceled_at` o `payment_method` pueden actualizarse según la lógica de negocio.

**Notas de seguridad y trazabilidad:**
- El webhook valida la firma de Stripe usando `STRIPE_WEBHOOK_SECRET` (ver `.env`).
- Solo el backend (clave de servicio) puede modificar la tabla `subscriptions`.
- Todos los cambios quedan auditados por los campos `created_at` y `updated_at`.

**Referencia técnica:**  
- Lógica centralizada en: `supabase/functions/stripe-webhook/index.ts`
- Configuración de productos/planes: `src/lib/supabase/stripeProducts.ts`
- UI y lógica de checkout: `src/components/pricing/pricing-table.tsx`
### `amistades`

Registra relaciones de amistad entre usuarios.

| Columna        | Tipo         | Nulable | Descripción                                                        |
| -------------- | ------------| ------- | ------------------------------------------------------------------ |
| id             | uuid        | NO      | Identificador único (PK)                                           |
| usuario_id     | uuid        | NO      | FK a usuarios(id) - usuario que envía la solicitud                 |
| amigo_id       | uuid        | NO      | FK a usuarios(id) - usuario receptor                               |
| estado         | text        | NO      | Estado de la relación: 'pendiente', 'aceptado', 'bloqueado'        |
| fecha_creacion | timestamptz | NO      | Fecha de creación de la relación                                   |

- UNIQUE (usuario_id, amigo_id)
- Índices: usuario_id, amigo_id

### `usuarios`

Almacena la información del perfil de los usuarios registrados.

> **Actualización 2025-04-30:**  
> Se estandarizó la tabla eliminando campos obsoletos y duplicados, y agregando los requeridos para el flujo de perfil.

| Columna      | Tipo        | Nulable | Descripción                                                        |
| ------------ | ----------- | ------- | ------------------------------------------------------------------ |
| id           | uuid        | NO      | Identificador único del usuario (FK a auth.users)                  |
| nombre       | text        | YES     | Nombre del usuario                                                 |
| apellido     | text        | YES     | Apellido del usuario                                               |
| email        | text        | NO      | Email del usuario (debe enviarse siempre en upsert, NOT NULL)      |
| pais         | text        | YES     | País del usuario (sin tilde, único campo válido)                   |
| avatar_url   | text        | YES     | URL de la foto de perfil                                           |
| bio          | text        | YES     | Biografía del usuario (opcional)                                   |
| plan         | text        | YES     | Plan informativo (la fuente real de la suscripción está en `subscriptions`) |
| rol          | text        | NO      | Rol del usuario (ej. 'admin', 'user')                              |
| created_at   | timestamptz | NO      | Fecha de creación del perfil (antes `fecha_creacion`)              |
| updated_at   | timestamptz | NO      | Fecha de última actualización (trigger automático)                  |
| es_activo    | boolean     | YES     | Indica si la cuenta está activa                                    |
| last_login_ip| text        | YES     | Última IP de login                                                 |

**Notas:**
- El campo `plan` es solo informativo; la suscripción activa y su estado real se consultan en la tabla `subscriptions`.
- El trigger `set_updated_at_usuarios` actualiza automáticamente `updated_at` en cada modificación.
- Se eliminó el campo duplicado `país` (con tilde) y el campo obsoleto `fecha_creación`.

**Policies RLS relevantes:**
- UPDATE: Solo el usuario puede modificar su propio perfil (`id = auth.uid()`).
- SELECT: El usuario puede ver su perfil y los de sus amigos aceptados.
- **INSERT:** (2025-04-23) Se agregó la policy para permitir que el usuario cree su propio perfil si no existe:
  ```sql
  CREATE POLICY insert_usuarios ON public.usuarios
    FOR INSERT
    WITH CHECK (
      id = auth.uid()
    );
  ```
  > **Nota:** El campo `email` es NOT NULL y debe enviarse siempre en el objeto de upsert desde el frontend.

### `capsulas`

Representa las cápsulas de memoria creadas por los usuarios.

| Columna        | Tipo                     | Nulable | Descripción                             |
| -------------- | ------------------------ | ------- | --------------------------------------- |
| id             | uuid                     | NO      | Identificador único de la cápsula       |
| usuario_id     | uuid                     | YES     | FK a `usuarios(id)` - Creador           |
| titulo         | text                     | YES     | Título de la cápsula                    |
| descripcion    | text                     | YES     | Descripción de la cápsula               |
| tipo           | text                     | YES     | Tipo de cápsula (ej. 'personal', 'colaborativa') |
| fecha_creacion | timestamp without time zone | YES     | Fecha de creación                       |
| publica        | boolean                  | YES     | Indica si la cápsula es pública         |
| enlace_publico | text                     | YES     | Token o URL para acceso público         |
| portada_url    | text                     | YES     | URL de la imagen de portada             |
| anclada        | boolean                  | YES     | Indica si está anclada en el dashboard  |

### `recuerdos`

Almacena los archivos individuales (fotos, videos, audios) subidos por los usuarios.

| Columna            | Tipo                     | Nulable | Descripción                               |
| ------------------ | ------------------------ | ------- | ----------------------------------------- |
| id                 | uuid                     | NO      | Identificador único del recuerdo          |
| usuario_id         | uuid                     | YES     | FK a `usuarios(id)` - Quién subió        |
| tipo               | text                     | YES     | Tipo de archivo (ej. 'foto', 'video', 'audio') |
| url_archivo        | text                     | NO      | URL del archivo en Supabase Storage       |
| nombre_archivo     | text                     | YES     | Nombre original del archivo               |
| fecha_subida       | timestamp without time zone | YES     | Fecha de subida                         |
| mejorado_por_ia    | boolean                  | YES     | Indica si se aplicó mejora IA           |
| url_mejorado       | text                     | YES     | URL relativa en Storage del archivo mejorado por IA (no borra el original, siempre es un archivo nuevo con sufijo `mejorado_`) |
| tipo_mejora_ia     | text                     | YES     | Tipo de mejora IA aplicada ('foto', 'audio', 'video') |
| fecha_mejora_ia    | timestamp with time zone | YES     | Fecha de la mejora IA                     |
| limpio_por_ia      | boolean                  | YES     | Indica si se aplicó limpieza IA           |
| tamaño             | bigint                   | YES     | Tamaño del archivo en bytes               |
| activo             | boolean                  | YES     | Indica si el recuerdo está activo         |
| capsula_id         | uuid                     | YES     | FK a `capsulas(id)` - A qué cápsula pertenece |
| ia_acceso          | boolean                  | YES     | Indica si la IA tiene acceso              |
| latitud            | numeric                  | YES     | Coordenada geográfica                   |
| longitud           | numeric                  | YES     | Coordenada geográfica                   |
| fecha_real         | date                     | YES     | Fecha real estimada o ingresada del recuerdo |
| ubicacion_manual   | boolean                  | YES     | Indica si la ubicación fue manual         |
| descripcion        | text                     | YES     | Descripción del recuerdo                  |
| anclado            | boolean                  | YES     | Indica si está anclado                  |
| titulo_personalizado | text                     | YES     | Título personalizado para el recuerdo     |
| es_favorito        | boolean                  | YES     | Indica si es un recuerdo favorito         |

### `usuarios_por_plan_activo()` (función SQL)

> **Actualización 2025-04-24:**  
> Función SQL que devuelve la distribución de usuarios únicos por plan activo:
> - Para planes pagos: cuenta usuarios únicos con suscripción activa en la tabla `subscriptions`.
> - Para "free": cuenta usuarios en la tabla `usuarios` que no tienen ninguna suscripción activa.
> - Evita duplicados y filas con cantidad 0.
> - Usada en el dashboard admin para el gráfico de distribución de planes.

### `mejoras_ia_log`

Auditoría de mejoras IA aplicadas a recuerdos.

> **Actualización 2025-04-24:**  
> Cada vez que un usuario ejecuta una mejora IA sobre una foto (Replicate/GFPGAN) o audio (Voicefixer), se inserta un registro en esta tabla, incluso si el usuario repite la mejora sobre la misma imagen.  
> El dashboard admin cuenta el total de llamadas a Replicate usando los registros con `tipo = 'foto'` y a Voicefixer con `tipo = 'audio'`.  
> El tracking es robusto y auditable, y la función edge valida y reporta errores de variables de entorno o permisos.

| Columna      | Tipo                     | Nulable | Descripción                                 |
| ------------ | ------------------------ | ------- | ------------------------------------------- |
| id           | uuid                     | NO      | Identificador único del log                 |
| usuario_id   | uuid                     | YES     | FK a `usuarios(id)`                         |
| recuerdo_id  | uuid                     | YES     | FK a `recuerdos(id)`                        |
| tipo         | text                     | NO      | Tipo de mejora ('foto', 'audio', 'video')   |
| fecha        | timestamp with time zone | NO      | Fecha de la mejora                          |
| resultado    | text                     | YES     | 'aceptada', 'descartada', 'error'           |
| url_antes    | text                     | YES     | URL del archivo original                    |
| url_despues  | text                     | YES     | URL del archivo mejorado                    |

### `mensajes_programados`

Almacena los recordatorios o mensajes programados para ser enviados en el futuro. (Refactorizada desde una estructura anterior).

| Columna               | Tipo                     | Nulable | Descripción                                               |
| --------------------- | ------------------------ | ------- | --------------------------------------------------------- |
| id                    | uuid                     | NO      | Identificador único del mensaje/recordatorio              |
| creator_user_id       | uuid                     | YES     | FK a `usuarios(id)` - Creador (ON DELETE SET NULL)        |
| recipient_email       | text                     | YES     | Email del destinatario                                    |
| recipient_name        | text                     | YES     | Nombre del destinatario (opcional)                        |
| scheduled_delivery_at | timestamp with time zone | YES     | Fecha y hora (UTC) programada para la entrega             |
| message               | text                     | YES     | Mensaje principal del recordatorio                        |
| delivery_method       | public.delivery_method   | NO      | Método de entrega ('email' o 'qr_code')                   |
| status                | public.reminder_status   | NO      | Estado actual ('scheduled', 'sent', 'failed', 'cancelled') |
| access_token          | text                     | NO      | Token único para acceso (especialmente QR), default uuid  |
| created_at            | timestamp with time zone | NO      | Fecha de creación, default now()                          |
| updated_at            | timestamp with time zone | NO      | Fecha de última actualización, default now()              |
| title                 | text                     | YES     | Título opcional para el recordatorio                      |

### `comentarios`

Almacena comentarios asociados a cápsulas o recuerdos.

| Columna     | Tipo                     | Nulable | Descripción                             |
| ----------- | ------------------------ | ------- | --------------------------------------- |
| id          | uuid                     | NO      | Identificador único del comentario      |
| usuario_id  | uuid                     | YES     | FK a `usuarios(id)` - Autor             |
| capsula_id  | uuid                     | YES     | FK a `capsulas(id)` - Cápsula comentada |
| recuerdo_id | uuid                     | YES     | FK a `recuerdos(id)` - Recuerdo comentado |
| contenido   | text                     | NO      | Texto del comentario                    |
| fecha       | timestamp without time zone | YES     | Fecha del comentario                    |

### `notificaciones`

Almacena notificaciones para los usuarios.

| Columna        | Tipo                     | Nulable | Descripción                             |
| -------------- | ------------------------ | ------- | --------------------------------------- |
| id             | uuid                     | NO      | Identificador único de la notificación  |
| usuario_id     | uuid                     | NO      | FK a `usuarios(id)` - Destinatario      |
| tipo           | text                     | NO      | Tipo de notificación (ej. 'invitacion', 'comentario') |
| mensaje        | text                     | NO      | Mensaje de la notificación              |
| leida          | boolean                  | NO      | Indica si la notificación fue leída     |
| fecha_creacion | timestamp with time zone | NO      | Fecha de creación                       |
| metadata       | jsonb                    | YES     | Datos adicionales (ej. IDs relacionados) |

### `capsule_invitations`

Almacena invitaciones para unirse a cápsulas colaborativas.

| Columna         | Tipo                     | Nulable | Descripción                             |
| --------------- | ------------------------ | ------- | --------------------------------------- |
| id              | uuid                     | NO      | Identificador único de la invitación    |
| capsule_id      | uuid                     | NO      | FK a `capsulas(id)` - Cápsula invitada  |
| inviter_user_id | uuid                     | NO      | FK a `usuarios(id)` - Quién invita      |
| invitee_email   | text                     | YES     | Email del invitado                      |
| share_token     | text                     | NO      | Token único para aceptar la invitación  |
| message         | text                     | YES     | Mensaje opcional en la invitación       |
| status          | text                     | NO      | Estado ('pending', 'accepted', 'declined', 'expired') |
| created_at      | timestamp with time zone | NO      | Fecha de creación                       |
| expires_at      | timestamp with time zone | YES     | Fecha de expiración (opcional)          |

### `capsule_contributors`

Tabla de unión que relaciona usuarios con las cápsulas en las que contribuyen.

| Columna       | Tipo                     | Nulable | Descripción                             |
| ------------- | ------------------------ | ------- | --------------------------------------- |
| id            | uuid                     | NO      | Identificador único de la contribución  |
| capsule_id    | uuid                     | NO      | FK a `capsulas(id)`                     |
| user_id       | uuid                     | NO      | FK a `usuarios(id)`                     |
| role          | text                     | NO      | Rol del usuario ('owner', 'contributor') |
| added_at      | timestamp with time zone | NO      | Fecha en que se añadió                  |
| invitation_id | uuid                     | YES     | FK a `capsule_invitations(id)` (opcional) |
| is_visible    | boolean                  | NO      | Indica si la contribución es visible    |

### `contribuciones`

(Propósito incierto, podría ser obsoleto o para contribuciones anónimas?)

| Columna            | Tipo                     | Nulable | Descripción                             |
| ------------------ | ------------------------ | ------- | --------------------------------------- |
| id                 | uuid                     | NO      | Identificador único                     |
| capsula_id         | uuid                     | YES     | FK a `capsulas(id)`                     |
| tipo               | text                     | YES     | Tipo de contribución                    |
| url_archivo        | text                     | YES     | URL del archivo                         |
| comentario         | text                     | YES     | Comentario asociado                     |
| nombre_contribuyente | text                     | YES     | Nombre (si es anónimo?)                 |
| fecha              | timestamp without time zone | YES     | Fecha de la contribución                |
| latitud            | numeric                  | YES     | Coordenada geográfica                   |
| longitud           | numeric                  | YES     | Coordenada geográfica                   |
| fuente             | text                     | YES     | Origen de la contribución               |

### `pedidos_fisicos`

Almacena información sobre pedidos de productos físicos.

| Columna             | Tipo                     | Nulable | Descripción                             |
| ------------------- | ------------------------ | ------- | --------------------------------------- |
| id                  | uuid                     | NO      | Identificador único del pedido          |
| usuario_id          | uuid                     | YES     | FK a `usuarios(id)` - Comprador         |
| tipo_producto       | text                     | YES     | Tipo de producto pedido                 |
| archivo_usado       | uuid                     | YES     | FK a `recuerdos(id)`? Archivo base      |
| personalización_texto | text                     | YES     | Texto personalizado para el producto    |
| dirección_envío     | text                     | YES     | Dirección de envío completa             |
| país                | text                     | YES     | País de envío                           |
| estado_envío        | text                     | YES     | Estado actual del envío                 |
| fecha_pedido        | timestamp without time zone | YES     | Fecha en que se realizó el pedido       |
| precio_total        | numeric                  | YES     | Costo total del pedido                  |

## Tablas de Unión para Recordatorios

### `mensajes_programados_capsulas`

Tabla de unión que asocia cápsulas con los mensajes programados (recordatorios).

| Columna     | Tipo | Nulable | Descripción                                      |
| ----------- | ---- | ------- | ------------------------------------------------ |
| reminder_id | uuid | NO      | FK a `mensajes_programados(id)` (ON DELETE CASCADE) |
| capsule_id  | uuid | NO      | FK a `capsulas(id)` (ON DELETE CASCADE)          |
| *PK*        |      |         | Clave primaria compuesta (reminder_id, capsule_id) |

### `mensajes_programados_recuerdos`

Tabla de unión que asocia recuerdos específicos con los mensajes programados (recordatorios).

| Columna     | Tipo | Nulable | Descripción                                      |
| ----------- | ---- | ------- | ------------------------------------------------ |
| reminder_id | uuid | NO      | FK a `mensajes_programados(id)` (ON DELETE CASCADE) |
| recuerdo_id | uuid | NO      | FK a `recuerdos(id)` (ON DELETE CASCADE)         |
| *PK*        |      |         | Clave primaria compuesta (reminder_id, recuerdo_id) |

---

## Endpoints HTTP personalizados

### `POST /improve-media-ia-http`

Función HTTP en Supabase para mejora de imágenes (fotos) usando Replicate (modelo xinntao/gfpgan).

**Parámetros (body JSON):**
- `img` (string, requerido): URL de la imagen original a mejorar.

**Headers requeridos:**
- `Authorization: Bearer <anon_key o JWT válido>`
- `Content-Type: application/json`

**Respuesta exitosa (200):**
```json
{
  "improved_img": "https://replicate.delivery/xxxx/imagen_mejorada.jpg",
  "replicate_raw": { ... }
}
```
- `improved_img`: URL de la imagen mejorada por IA.
- `replicate_raw`: Respuesta completa de la API de Replicate (para depuración).

**Errores comunes:**
- 400: Falta parámetro `img` o JSON inválido.
- 401: Falta o error en el header Authorization.
- 500: Error en Replicate o en la función.

**Relación con la base de datos:**
- El campo `url_mejorado` de la tabla `recuerdos` debe actualizarse con la ruta relativa del archivo mejorado generado en Storage (no sobrescribe el original).
- El campo `mejorado_por_ia` debe marcarse como `true` si se aplica la mejora.
- Se recomienda auditar la mejora en la tabla `mejoras_ia_log`.

**Notas:**
- CORS extendido: permite headers `apikey` y `x-client-info` requeridos por Supabase JS Client.
- El endpoint hace polling a Replicate y solo responde cuando la imagen mejorada está realmente disponible (status "succeeded").
- El frontend parsea la respuesta de forma robusta para evitar errores de visualización.
- En el modal de comparación, el botón "Mantener original" está a la izquierda y "Guardar mejora IA" a la derecha para consistencia UX.
- Esta función reemplaza a la Edge Function anterior para evitar problemas de CORS.
- El endpoint es síncrono: espera la respuesta de Replicate antes de responder.

---

## [2025-04-17] Notas sobre integración de mejora de audio por IA

- La función `improve-audio-ia-http` descarga el audio original, llama al microservicio voicefixer, sube el archivo mejorado a Storage con nombre único y actualiza la columna `url_mejorado` en la tabla `recuerdos`.
- El archivo original nunca se borra, el usuario puede alternar entre la versión original y la mejorada.
- Si el usuario intenta mejorar un audio ya mejorado, se le informa y puede restaurar el original.
- El sistema es extensible para otros tipos de mejora IA siguiendo el mismo patrón.
