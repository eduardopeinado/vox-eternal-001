# 🎨 Guía de Estilos – Vox Eternal

Este documento centraliza las definiciones y convenciones de estilo visual del proyecto Vox Eternal.

## 🖋️ Fuentes (Tipografía)

Las familias de fuentes se definen en `tailwind.config.ts` y se cargan globalmente (probablemente en `src/app/layout.tsx`).

| Uso                  | Fuente           | Características                        | Clase Tailwind | Variable CSS                  |
| :------------------- | :--------------- | :------------------------------------- | :------------- | :---------------------------- |
| Títulos / frases     | Playfair Display | Elegante, emocional, ideal para énfasis | `font-serif`   | `var(--font-playfair-display)` |
| Texto general / UI   | Inter            | Moderna, altamente legible, limpia     | `font-sans`    | `var(--font-inter)`           |
| Alternativa opcional | Poppins          | Redondeada, amigable, buena pantallas | *(No definida)* | *(No definida)*              |

**Notas:**

*   Priorizar **Inter** (`font-sans`) para la legibilidad general de la interfaz.
*   Usar **Playfair Display** (`font-serif`) con moderación para títulos clave y elementos que necesiten destacar emocionalmente.
*   La fuente Poppins es una alternativa mencionada pero no está configurada actualmente en `tailwind.config.ts`.

## 🎨 Paleta de Colores Oficial

Definida en `tailwind.config.ts`.

| Elemento                     | Color         | Código HEX          | Clase Tailwind      | Uso sugerido                               |
| :--------------------------- | :------------ | :------------------ | :------------------ | :----------------------------------------- |
| Fondo principal              | Blanco Hueso  | `#F4F2EB`           | `bg-blanco-hueso`   | Fondo de página, cards, modales            |
| Texto principal              | Azul Profundo | `#1E3A4F`           | `text-azul-profundo`| Títulos, párrafos importantes              |
| Color de acento primario     | Dorado Claro  | `#D4AF37`           | `bg-dorado-claro`   | Botones principales, íconos de acción      |
| Acento secundario / detalles | Celeste Cielo | `#A4DDEE`           | `bg-celeste-cielo`  | Resaltes, elementos flotantes, botón FAB   |
| Botones secundarios          | Verde Agua    | `#61D0BE`           | `bg-verde-agua`     | Para botones de acción secundaria (p. ej. “Tour de la página”) |
| Texto gris / secundario      | Gris Cálido   | `#888888`           | `text-gris-calido`  | Descripciones, fechas, leyendas            |
| Acción destructiva           | Rojo Alerta    | #E53E3E           | text-rojo-alerta / border-rojo-alerta | Para botones como “Cerrar Sesión” y acciones críticas |
| Sombra suave / fondo difuso  | Gris transl.  | `rgba(0, 0, 0, 0.06)` | *(Clase custom)*    | Para sombras de cards (`shadow-sm`, etc.) |

**Notas:**

*   La sombra suave (`rgba(0, 0, 0, 0.06)`) generalmente se aplica a través de las utilidades de sombra de Tailwind (`shadow-sm`, `shadow-md`, etc.) que pueden ser personalizadas en el `theme.extend.boxShadow` de `tailwind.config.ts` si es necesario.

## 💡 Estilo de Interfaz

| Elemento          | Detalle                                                                 | Clases Tailwind (Ejemplos)                     |
| :---------------- | :---------------------------------------------------------------------- | :--------------------------------------------- |
| Cards             | Bordes redondeados grandes, fondo blanco hueso, sombra suave            | `rounded-2xl bg-blanco-hueso shadow-sm`        |
| Botones Principales | Fondo dorado, texto azul profundo, hover con sombra clara               | `bg-dorado-claro text-azul-profundo hover:shadow-md` |
| Tipografía        | Títulos grandes en Playfair (`font-serif`), contenido general en Inter (`font-sans`) | `font-serif text-2xl`, `font-sans text-base` |
| Íconos            | Estilo minimalista, línea fina (Lucide recomendado)                     | `<Icon size={16} />`                           |
| Botón flotante (FAB)| Ícono "+", esquina inferior derecha, color celeste cielo, animado       | `fixed bottom-4 right-4 bg-celeste-cielo ...` |
| Resaltado IA      | Etiqueta "✨" o marco dorado suave                                      | *(Estilo a definir)*                           |
| Animaciones       | Transiciones sutiles al hacer hover (propiedad, color, transform)       | `transition-colors duration-200 ease-in-out`   |
| Diseño Responsive | Mobile-first, uso de grid/flex con `gap`, `md:`, `lg:` prefijos         | `grid gap-4 md:grid-cols-2`, `flex flex-col md:flex-row` |

## 🖼️ Fondos y Atmósfera

| Zona                | Detalle visual                                                          |
| :------------------ | :---------------------------------------------------------------------- |
| Fondo general       | Blanco hueso `#F4F2EB`, opcionalmente con motas suaves o degradado sutil |
| Hero principal      | Imagen con luz cálida o tonos cielo/dorado, sensación de esperanza      |
| Secciones destacadas| Degradados suaves (ej. celeste a dorado), efecto de elevación sutil     |

## 🌐 Layout y Diseño

*   Distribución general basada en **grid** o **flexbox** para las cards y secciones principales.
*   Usar **padding** consistente en contenedores principales (ej. `px-4 md:px-6 lg:px-8`, `py-6 md:py-10`).
*   Asegurar **alto contraste** visual para botones y formularios, especialmente sobre fondos claros.
*   En **dispositivos móviles**:
    *   Preferir apilado vertical (`flex-col`).
    *   Utilizar menús colapsables o acordeones para secciones densas.

## 🧩 Ejemplos Clave de Estilo en Uso

| Componente / Página | Estilo Aplicado (Resumen)                                               |
| :------------------ | :---------------------------------------------------------------------- |
| Login / Registro    | Fondo limpio (`bg-blanco-hueso`), logo centrado, botones grandes (`bg-dorado-claro`), íconos visibles. |
| Dashboard           | Títulos `font-serif`, cards `rounded-2xl bg-blanco-hueso shadow-sm`, FAB `bg-celeste-cielo`. |
| Página de Planes    | Cards con tabla, resaltado `bg-dorado-claro`/`border-dorado-claro` en columnas clave, textos grandes. |
| Cómo funciona       | Imagen/diagrama con pasos, íconos en colores de acento, texto breve.    |
| Cápsula Pública     | Estética suave, mensaje emocional, fondo difuso, logo discreto.         |

---

## 📄 Descripción comercial y misión

Consulta la descripción inspiradora, misión y lema de Vox Eternal en [docs/descripcion-comercial.md](./descripcion-comercial.md).

*Este documento debe mantenerse actualizado a medida que evoluciona el diseño.*
