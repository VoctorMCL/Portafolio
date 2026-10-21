# Portafolio — Victor Manuel Córdoba Larez

Portafolio interactivo en 3D: una habitación completa —con pasillo, ascensor, escritorio, estantería y un mueble de medios— construida **100 % en código** con [Angular 22](https://angular.dev) y [Babylon.js](https://www.babylonjs.com/). No hay modelos glTF/GLB: todos los objetos son geometría procedural generada en tiempo de ejecución.

Explora la habitación con el ratón (o el dedo), abre los paneles tocando los objetos, pon un "disco" en el reproductor para ver un proyecto y, si quieres, abre la consola del PC y escribe comandos.

---

## Contenido del portafolio

### a. Información personal

- **Nombre:** Victor Manuel Córdoba Larez
- **Rol:** Ingeniero Informático / Desarrollador de Software
- **Ubicación:** Colombia
- **Correo:** [cordobavictorml@gmail.com](mailto:cordobavictorml@gmail.com)
- **GitHub:** [github.com/VoctorMCL](https://github.com/VoctorMCL)

Los datos viven en `src/app/data/portfolio.ts` (constante `ROOM_CONTENT`) y alimentan tanto los paneles HTML como la consola 3D.

### b. Estudios realizados

| Título | Institución | Periodo |
| --- | --- | --- |
| Ingeniería de Software | Corporación Universitaria Lasallista | 4.º semestre |
| Técnico en Programación de Software | SENA | 2023–2024 |
| Mejor bachiller | I.E. Alejandro Vélez Barrientos | 2024 |

### c. Proyectos y experiencia

Cada proyecto se muestra como un **disco** en la estantería del mueble de medios; al seleccionarlo se carga en el reproductor y aparece su ficha. Definidos en `src/app/data/portfolio.ts` (`PROJECTS`):

| Proyecto | Año | Descripción | Stack |
| --- | --- | --- | --- |
| Control de Acceso RFID | 2026 | Control de acceso con lector RFID RC522 sobre CrowPi3, valida tarjetas contra Supabase y registra intentos | Python, RFID/NFC, Supabase, Angular |
| SensorLang | 2026 | Lenguaje propio y mini compilador que interpreta instrucciones y controla un Arduino Nano | Python, Arduino Nano, ESP32 |
| Proyecto Invernadero (Macollo) | 2026 | Aplicación web para monitoreo de cultivos, desarrollada en equipo con base de datos PostgreSQL | Astro, PostgreSQL, IoT, pnpm |
| SGP Parqueadero | 2026 | Sistema de gestión de parqueaderos: ingresos, reportes y control de accesos | MongoDB, Express, Angular, Node.js |
| Lazo | 2026 | Chatbot 100 % IA, probado con ~50 casos, con marco teórico y análisis ético | IA generativa, Gemini, Angular |
| CFSV | 2026 | Calculadora física de siniestros viales: ralentiza y recrea choques, calcula velocidades y fuerzas | HTML, CSS, JavaScript, three.js |
| SISV | 2025 | Sistema informático de siniestros viales con mapa en tiempo real, registro y reportes | PHP, MySQL, JavaScript, Leaflet.js |
| Kongelados | 2025 | E-commerce de productos congelados con catálogo, carrito y pagos | PHP, Tailwind, JavaScript, Wompi |
| SILL23EC | 2024 | Gestión de inventario y logística para una tienda real | PHP, MySQL, JavaScript, CSS |

### d. Lenguajes y tecnologías

**Lenguajes:** JavaScript, TypeScript, PHP, Python, Java, HTML, CSS.
**Frontend:** Angular, Astro, Vite, Tailwind, three.js.
**Bases de datos:** MySQL, PostgreSQL, MongoDB, Supabase.
**Hardware / IoT:** Arduino, ESP32, RFID/NFC, CrowPi3.
**Sistemas y herramientas:** Linux, Git, Kali Linux, Nmap, sqlmap, Wireshark.

La lista completa (usada por el panel *Sobre mí* y por el comando `skills`) está en `ROOM_CONTENT.skills`.

### e. Áreas de interés profesional

Desarrollo de software que combina hardware y software (IoT: control de acceso con RFID, sensores con Arduino/ESP32), compiladores y lenguajes propios, desarrollo frontend e interfaces, bases de datos, y **ciberseguridad** en formación (Kali Linux, Nmap, sqlmap, Wireshark).

---

## Funcionalidad

### La habitación interactiva

- **Entrada cinematográfica:** la escena arranca frente al ascensor; las puertas se abren y la cámara entra al cuarto. Al cargar, una pantalla de arranque con ruido VHS y scanlines cubre el montaje.
- **Navegación:** mueve la cámara con el ratón; se recorre la habitación y el pasillo.
- **Objetos "hotspot" (clic/tap):**
  - **Estantería →** panel *Sobre mí* (información personal, educación y skills).
  - **Escritorio / monitor →** abre la **consola** interactiva.
  - **TV / mueble de medios →** vista de **proyectos**.
  - **Puerta →** entra a la casa.
- **Mueble de medios y discos:** los proyectos se ordenan como discos físicos. Elige uno y viaja hasta el reproductor, donde queda plano sobre el plato; su ficha aparece en una barra inferior. Pulsa *Expulsar disco* o `Esc` para devolverlo.
- **Mando (GamePad):** sobre la consola hay dos mandos con enlaces Demo y Repo cuando el proyecto los tiene; los LEDs laten cuando están disponibles.
- **Vistas de cámara (móvil):** botones `‹ ›` para alternar entre *Vista general*, *Proyectos*, *PC* y *Estantería* (`ROOM_VIEWS` en `room.ts`).

### La consola

La consola es un terminal dentro de la habitación (su pantalla 3D refleja lo que escribes). Acepta comandos en `console-engine.ts`:

| Comando | Qué hace |
| --- | --- |
| `help` / `ayuda` | Lista de comandos |
| `whoami` | Identidad |
| `about` / `perfil` / `sobre` | Sobre mí |
| `skills` / `habilidades` / `tecnologias` | Tecnologías |
| `projects` / `proyectos` | Proyectos |
| `contact` / `contacto` | Datos de contacto |
| `ls`, `pwd`, `date`, `echo` | Utilidades de shell |
| `clear` / `limpiar` | Limpia la salida |
| `salir` / `exit` | Cierra la consola |

En escritorio se escribe directamente; en móvil se abre un input "fantasma" que dispara el teclado nativo mientras el texto se refleja en la pantalla 3D. Guarda historial de comandos (flechas ↑/↓).

### Los carteles (aleatoriedad de los pósteres)

El pasillo y la habitación se decoran con **pósteres de tecnologías** que se generan en tiempo real:

- Los logos se cargan una vez desde `assets/skills-logos.json` (`loadSkillLogos`).
- `posterPoolShuffled()` baraja la lista con Fisher–Yates y la cachea por sesión.
- El pasillo toma 4 pósteres (`slice(0, 4)`) y la habitación los siguientes 6 (`slice(4, 10)`).
- Cada póster se pinta en un canvas (`logoPosterCanvas`) con el color propio de cada logo y se usa como textura emisiva.

Resultado: **la decoración de cada carga es distinta**, pero siempre con las mismas tecnologías del perfil.

### Los perfiles ligeros (calidad adaptativa)

La escena detecta la capacidad del dispositivo y ajusta la calidad para no ahogar equipos modestos (`device-tier.ts` y `applyQualityLevel`):

- **Detección:** usa `navigator.deviceMemory` y `hardwareConcurrency` → tier `low`, `mid` o `high`; con puntero táctil limita el nivel inicial.
- **5 niveles de calidad (0 = extremo … 4 = completo):** controlan resolución (`RESOLUTION_SCALE`), SSAO, sombras, glow, bloom, sharpen, anisotropía, VHS y muestras de antialiasing.
- **Comportamiento idempotente e invertible:** subir un nivel restaura todo lo que bajar apagó (reconstruye la cadena de post-procesos).
- **Calibración inicial:** `calibrate()` mide el tiempo por fotograma (objetivo 40 fps) y baja el nivel automáticamente hasta que la escena se mueve fluida.
- **Arranque diferido:** en equipos de gama baja el pasillo/elevador no se construyen hasta que hacen falta (`ensureHallway`), aligerando el arranque.

---

## Responsive

- **Escritorio:** navegación con ratón, consola con teclado, hover con etiquetas sobre cada objeto.
- **Móvil / táctil** (`pointer: coarse`, `any-hover: none` o `max-width: 900px`, ver `COMPACT_NAV_QUERY`): aparecen los botones de vistas `‹ ›`, la consola usa un input fantasma para el teclado nativo, y el teclado físico global se desactiva (`setKeyboardEnabled`).
- **CSS adaptativo:** puntos de corte para reducir tamaño bajo `640px`, `480px` y `max-height: 520px`, además de respetar `prefers-reduced-motion` en las animaciones de la interfaz.

---

## Arquitectura

```
src/app/
├── app.ts                 # Shell: pantalla de carga con ruido VHS + analytics
├── loading.service.ts     # Controla la pantalla de arranque
├── data/
│   ├── portfolio.ts       # Información personal, educación, skills y proyectos
│   └── github.ts          # Proyectos → discos (color de acento por proyecto)
├── room/
│   ├── room.ts / .html    # Componente que monta el canvas y la UI de la sala
│   ├── room-scene.ts      # Escena Babylon completa (geometría, luces, cámara)
│   ├── console-engine.ts  # Parser y lógica de la consola
│   ├── device-tier.ts     # Detección de capacidad → tier de calidad
│   ├── textures.ts        # Texturas y pósteres procedurales (canvas 2D)
│   ├── vhs-post.ts        # Post-proceso VHS
│   ├── normal-map.ts / .worker.ts  # Normal maps generados en un Web Worker
│   └── room.css
└── ui/
    ├── info-panel/        # Panel lateral (Sobre mí / Contacto)
    └── vhs-hud/           # HUD superior con fecha, hora y contador
```

- **Sin assets 3D:** toda la geometría se genera en `room-scene.ts`. Botones, libros, globo terráqueo, bola antiestrés, mandos, discos, etc. son mallas procedurales con materiales PBR.
- **Texturas procedurales:** madera, paredes, césped, pantallas, pósteres y el mapamundi del globo se dibujan en canvas 2D (`textures.ts`).
- **Plano de la escena:** left-handed — `+X` es la izquierda en pantalla; la estantería (`x = -3.9`) se ve a la derecha de la imagen.
- **Rendimiento:** geometría estática fusionada por material (`mergeStaticMeshes`), luces locales acotadas a su zona (`scopeLocalLights`), normal maps en un Web Worker y matrices congeladas.

---

## Desarrollo

Requisitos: Node.js y npm.

```bash
npm install
npm run start      # servidor de desarrollo en http://localhost:4200/
npm run build      # build de producción en dist/
npm test           # pruebas unitarias (Vitest / Karma)
```

Comandos de Angular CLI:

```bash
ng generate component nombre-componente
ng generate --help
```

## Despliegue

El proyecto está preparado para **Vercel** (build `npm run build` → `dist/`) e incluye [@vercel/analytics](https://vercel.com/docs/analytics).
