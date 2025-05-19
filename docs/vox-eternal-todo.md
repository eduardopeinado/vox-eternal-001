### [2025-05-01] Compatibilidad de videos en móvil

- [x] Validación frontend: solo se permite subir videos MP4 (H.264/AAC). Se bloquea la subida de .webm y otros formatos no compatibles con móviles/iOS. (OBSOLETO, ver cambio siguiente)
- [x] Ahora se permite subir cualquier video grabado desde navegador (webm, mp4, mov, etc). La compatibilidad universal se logrará con conversión automática a MP4/H.264 en backend.
- [x] [2025-05-02] Diagnóstico: El error 401 en la función `convert-video-http` se debía a que el webhook de Supabase Storage enviaba solo parámetros personalizados (placeholders) y no el body completo del evento. Documentado en changelog.
- [ ] [2025-05-02] Pendiente: Ajustar la configuración del webhook en Supabase Storage para que envíe el body completo del evento (no solo parámetros personalizados) y probar la subida de video.

- [ ] Pendiente: implementar conversión automática a MP4/H.264 en backend o microservicio para máxima compatibilidad y experiencia de usuario. (Ideal: ffmpeg en función edge o servicio externo).
- [ ] Pendiente: lógica de frontend para mostrar advertencia si el video aún no es compatible en todos los dispositivos y fallback al video convertido cuando esté disponible.

---

### [EN PROGRESO] Roadmap de mejoras (mayo 2025)

#### 1. Previsualización de dirección textual (reverse geocoding)
- [ ] Integrar llamada a API de reverse geocoding (ej: Nominatim/OpenStreetMap) al seleccionar ubicación en el mapa.
- [ ] Mostrar la dirección textual debajo del mapa en el modal.
- [ ] Manejar estados de carga y error de la consulta.
- [ ] Modularizar lógica en un hook reutilizable (`useReverseGeocoding`).

#### 2. Búsqueda de lugares en el mapa
- [ ] Añadir input de búsqueda sobre el mapa.
- [ ] Integrar API de búsqueda de lugares (ej: Nominatim).
- [ ] Al seleccionar resultado, centrar el mapa en la ubicación.
- [ ] Mejorar UX con autocompletado y feedback visual.

#### 3. Botón “Centrar en mi ubicación”
- [ ] Agregar botón para obtener geolocalización del navegador.
- [ ] Centrar el mapa en la ubicación del usuario.
- [ ] Manejar permisos y errores de geolocalización.

#### 4. Mejor feedback visual de guardado
- [ ] Mostrar toast/mensaje visual al guardar metadata (éxito/error).
- [ ] Unificar feedback visual con otros formularios del dashboard.

#### 5. Accesibilidad por teclado
- [x] Sincronización de tipos con Supabase
- [x] Refactor de fetch/upsert
- [x] Extracción real del plan desde `subscriptions`
- [x] Mejora visual del formulario
- [x] Pruebas completas
- [x] Documentación en changelog y supabase-schema

### [2025-04-24] Admin dashboard: usuarios y suscripciones

- [x] Búsqueda de usuarios por email
- [x] Modal con scroll y detalles de archivos
- [ ] Conectar datos reales de `usuarios`, `subscriptions`, `recuerdos`

---

## 🧠 3. Inteligencia Artificial

### Auditoría y mejora de fotos (2025-04-24)

- [x] KPI reales usando clave de servicio
- [x] Gráfico por plan corregido
- [x] Edge function `improve-media-ia-http` con logs en `mejoras_ia_log`
- [x] Manejo de errores mejorado
- [x] Documentación completa

### Mejora de audio con VoiceFixer

- [x] Función IA para mejora de audio validada
- [x] Subida segura y nombrado único
- [x] No se borra el original, se puede restaurar
- [x] Migrar VoiceFixer a un endpoint en la nube (VPS)
- [x] Dockerizar y probar microservicio
- [ ] Extender lógica a video
- [ ] Mejorar mensajes de error UX

---

## 💳 4. Pagos y planes

- [x] UI de tabla de planes
- [x] Integración con Stripe Checkout
- [x] Webhook Stripe funcional (`stripe-webhook`)
- [x] Endpoint de checkout compatible con Next.js
- [ ] Validar Stripe en modo test/live
- [ ] Recibir y procesar webhooks de renovación/cancelación
- [ ] Actualizar `subscriptions` tras eventos de pago
- [ ] Lógica de upgrades post-pago
- [ ] Middleware para protección por plan
- [ ] Mostrar plan actual y upgrades en dashboard

---

## 🧩 5. Microservicios y despliegue

- [x] VoiceFixer probado en local y Docker
- [x] Migración a URL pública (VPS/cloud)
- [ ] Automatización de deploy y rollback
- [x] Integrar Replicate para mejora de imágenes
- [x] Mostrar slider antes/después (`react-compare-image`)
- [x] Lógica para planes premium y bloqueos IA
- [x] Mostrar contador de mejoras IA por plan

---

## 📨 6. Mensajes al futuro y comunicación

- [x] Asociación de archivo multimedia opcional
- [x] Generar y mostrar QR para envío
- [ ] Mejorar previews multimedia en recordatorios
- [ ] UX de apertura y dashboard receptor
- [ ] Robustecer transferencia de propiedad
- [ ] Validar casos límite y documentar

---

## 🎨 7. UI, experiencia y soporte

- [x] Mejora UX drag & drop en cápsulas
- [x] Comparación visual mejorada para fotos IA
- [x] Slider de cápsulas más claro y responsivo
- [x] Registro de IP de usuario al login
- [ ] Revisar textos legales y accesibilidad
- [ ] Permitir exportar recuerdos en ZIP
- [ ] Auditoría visual del dashboard

---

## 🔐 8. Seguridad y mantenimiento

- [x] RLS actualizadas para `usuarios`
- [ ] Auditoría de roles, endpoints y middleware
- [ ] Validación de límites favoritos según plan
- [ ] Notificaciones y alertas visuales al llegar a límites
- [ ] Documentación constante en `docs/`

---

## 🧾 Referencias técnicas

- Migraciones aplicadas:  
  - `20250424181000_add_rol_to_usuarios.sql`  
  - `20250423130000_create_subscriptions_table.sql`

- Funciones destacadas:  
  - `usuarios_por_plan_activo()`  
  - `improve-media-ia-http`  
  - `create-stripe-checkout-session`  
  - `process-scheduled-reminders`

- Documentación clave:  
  - `docs/supabase-schema.md`  
  - `docs/vox-eternal-todo.md`  
  - `docs/changelog.md`

"""

# Guardar el archivo
todo_path = Path("/mnt/data/vox-eternal-todo-refactor.md")
todo_path.write_text(todo_content)

todo_path.name
