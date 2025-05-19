# Active Context:

**Purpose:** This file provides a concise overview of the current work focus, immediate next steps, and active decisions for the LLMRPG project. It is intended to be a frequently referenced, high-level summary to maintain project momentum and team alignment.

**Use Guidelines:**
- **Current Work Focus:**  List the 2-3 *most critical* tasks currently being actively worked on. Keep descriptions concise and action-oriented.
- **Next Steps:**  List the immediate next steps required to advance the project. Prioritize and order these steps for clarity.
- **Active Decisions and Considerations:** Document key decisions currently being considered or actively debated. Capture the essence of the decision and any open questions.
- **Do NOT include:** Detailed task breakdowns, historical changes, long-term plans (these belong in other memory bank files like `progress.md` or dedicated documentation).
- **Maintain Brevity:** Keep this file concise and focused on the *current* state of the project. Regularly review and prune outdated information.

## Current Work Focus:

- Limpieza y optimización del monorepo: eliminación de package.json duplicados y build limpio.
- Preparación de scripts y archivos para despliegue automatizado (frontend y microservicios).

## Next Steps:

1. Ejecutar `deploy_frontend.sh` para sincronizar el build estático al servidor Hetzner.
2. Ejecutar `deploy_services.sh` para construir y desplegar los microservicios vía Docker.
3. Verificar funcionamiento en producción y ajustar configuración si es necesario.

## Active Decisions and Considerations:

- `.next/cache` no se incluye en el despliegue; solo `.next/static` y `.next/server` son relevantes.
- El build estático se sincroniza desde la carpeta `out/` si se usa `next export`, o desde `.next/` según la estrategia de despliegue.
- Los scripts de despliegue requieren acceso SSH root y variables de entorno en `.env`.