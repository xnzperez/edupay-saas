# Documentación Técnica de Arquitectura: EduPay SaaS

**Rol:** Principal Software Architect & Senior Technical Writer
**Clasificación:** Confidencial / Proyecto de Grado / Arquitectura Empresarial
**Fecha de Actualización:** Mayo 2026

---

Esta documentación representa la "Biblia Arquitectónica" de **EduPay SaaS**. Se ha diseñado como una especificación técnica profunda, exhaustiva y académica que sustenta las decisiones de ingeniería detrás del ecosistema B2B (Business-to-Business) y Multi-Tenant de la plataforma. El documento está dirigido a ingenieros de software, DevOps, y auditores técnicos que busquen comprender los patrones de diseño, las estrategias de escalabilidad y los protocolos de resiliencia del software.

---

## 1. VISIÓN GENERAL Y ARQUITECTURA DEL SISTEMA

### 1.1 Naturaleza del Producto (SaaS Multi-Tenant)
EduPay es un motor financiero *Software as a Service* (SaaS) diseñado para instituciones de educación superior. Funciona como una plataforma unificada para la emisión de billeteras digitales de circuito cerrado (closed-loop digital wallets), procesamiento de pagos, micro-transferencias P2P (Peer-to-Peer) entre estudiantes, y gestión de cartera/cuotas (installments) por parte de la administración.

En términos arquitectónicos, el sistema emplea una **topología de base de datos compartida, pero aislada lógicamente**. Un único despliegue backend y una única base de datos PostgreSQL soportan a docenas de universidades (Tenants) de manera concurrente, maximizando el ROI en infraestructura en la nube, pero sin comprometer en lo más mínimo la segregación y privacidad de los datos financieros.

### 1.2 Stack Tecnológico Definitivo
La selección tecnológica de EduPay SaaS prioriza estrictamente la seguridad tipada, la predictibilidad de rendimiento bajo cargas pesadas (High Throughput) y la experiencia de usuario (UX):
*   **Backend Core:** **Go (Golang)** + framework **Fiber** + **SQLX**. Go fue seleccionado frente a ecosistemas como Node.js por su compilación AOT (Ahead-of-Time) a binarios estáticos, su recolección de basura hiperoptimizada y sus primitivas nativas de concurrencia.
*   **Frontend Core:** **React 19** + **TypeScript** + **Vite**. Esta combinación habilita un *Developer Experience* inigualable y un proceso de empaquetado ultra rápido (bundling), junto a chequeos estrictos en tiempo de compilación.
*   **Data Tier:** **PostgreSQL 16+**. El motor relacional open-source más adherente a los estándares ACID, esencial para el rigor del ecosistema Fintech.
*   **Infraestructura:** Contenerización con **Docker** orquestada sobre **Microsoft Azure**.

### 1.3 Gestión Termodinámica de Entornos (`APP_ENV`)
La aplicación implementa el patrón "Doce Factores" (Twelve-Factor App) para su inyección de configuración. Nunca hay credenciales quemadas (*hardcoded*) en el código fuente.
Toda la parametrización ocurre vía un archivo `.env` o variables de entorno en el SO. La bandera principal, `APP_ENV=production` o `APP_ENV=development`, altera el comportamiento basal del sistema:
*   En `development`, se encienden los logs de consultas SQL puras, se exponen *stack traces* completos en la interfaz de error de Fiber, y las políticas de CORS son permisivas.
*   En `production`, Fiber opera en modo *prefork* para maximizar hilos en el procesador físico, el logging se reduce a niveles de `ERROR/WARN` (vía bibliotecas como `zerolog` o el default configurado) estructurados en JSON, las rutas de Swagger se apagan o limitan, y se activa el *Graceful Shutdown* estricto ante señales SIGTERM del orquestador de Azure.

---

## 2. ARQUITECTURA FRONTEND (REACT 19 + VITE)

La construcción de la SPA (Single Page Application) repudia el concepto de un monolito frontal acoplado, favoreciendo metodologías modulares, responsivas y de bajo consumo de red.

### 2.1 Feature-Sliced Design (FSD) y Modularización
Para sostener la escalabilidad del lado del cliente, se implementó el patrón arquitectónico **Feature-Sliced Design**. El código fuente (`src/`) ya no es una bolsa plana de archivos. Está dividido jerárquicamente:
*   **Features/Pages:** Separación vertical absoluta de responsabilidades. La lógica de negocio pesada ya no contamina los componentes JSX. Todos los cálculos, validaciones asíncronas y *fetching* de datos están abstraídos dentro de **Custom Hooks** estrictamente tipados.
*   **Erradicación del tipo `any`:** Cada *response* de Axios, y cada estado de Zustand obedece a interfaces formales de TypeScript sincronizadas mentalmente con los *Structs* de Golang del backend.
*   **Fragmentación UI:** Módulos gigantes (ej. `AdminDashboard`) fueron rotos en componentes granulares (átomos y moléculas de la UI), logrando reutilización a lo largo del tablero financiero.
*   **Separación de Vistas por Contexto de Uso:** En el flujo operativo de los Cajeros, se impuso una separación estricta de las responsabilidades de renderizado. Por ejemplo, `StudentsList.tsx` aísla el dominio exclusivo de las matrículas y la gestión del ciclo de vida de los estudiantes, mientras que `Deposit.tsx` se consagra puramente como un componente de operaciones de Caja y recargas transaccionales, evitando el acoplamiento de lógicas mixtas.

### 2.2 Optimización Radical de Rendimiento (Vercel Best Practices)
La auditoría de rendimiento (Profiled against Vercel Engineering Standards) impuso directivas críticas:
1.  **Prevención de "Stale Closures":** Identificamos que las actualizaciones de estados basados en asincronía en React generaban dependencias fantasma. Ahora, toda mutación de estado dependiente de un estado previo utiliza el patrón de **setState Funcional**. En lugar de `setBalance(balance + 5)`, se impone arquitectónicamente `setBalance(prev => prev + 5)`. Esto blinda la UI contra sobrescrituras por condiciones de carrera en renders simultáneos.
2.  **Eliminación de *Barrel Imports*:** Para reducir el tamaño del paquete JS final (*Bundle Size*), se prohíbe el uso de indexadores (`export * from ...`) en librerías pesadas (ej. iconos o UI kits). Las importaciones son atómicas y directas (ej. `import Alert from 'library/Alert'`), permitiendo a Vite y a Rollup ejecutar un *Tree-Shaking* perfecto, enviando al navegador solo los KBs indispensables.
3.  **Erradicación de Request Waterfalls:** Los bloqueos de *Time To Interactive* (TTI) originados por peticiones secuenciales (`await A; await B;`) fueron reemplazados por el patrón `Promise.all([A, B])`. El motor de JavaScript ahora satura la red de forma concurrente para hidratar el dashboard del estudiante en la mitad del tiempo.
4.  **Uso de *Derived State*:** En lugar de sincronizar variables con redundantes hooks `useEffect` (lo que causa la "cascada de re-renders" o *render-tearing*), la lógica de distribución financiera y cálculos estadísticos del panel de administración se efectúa síncronamente durante el ciclo de render principal (Derived State).

### 2.3 Manejo de UI y Centralización del Estado (Axios Interceptors)
Previamente, la aplicación sufría de una dispersión masiva de bloques `try/catch` y llamadas repetitivas de notificaciones (`sileo.error()`) en cada petición. Este *anti-patrón* fue refactorizado mediante **Intercepción de Transporte HTTP**:
*   **Limpieza y DRY (Don't Repeat Yourself):** Se configuró la instancia global de Axios (`src/services/api.ts`) para atrapar todos los códigos de estado `4xx` y `5xx`.
*   El interceptor extrae semánticamente el mensaje de error normalizado provisto por la API REST de Go, y despliega **globalmente** la micro-notificación de error de la librería Sileo, liberando a los componentes React de preocuparse por manejar el fracaso de red.
*   **Arquitectura de Feedback Dual (Sileo + Zustand):** El sistema consolida la coexistencia estratégica de dos motores de estado. El store global de `Zustand` se conserva exclusivamente para mantener el historial persistente y la bitácora auditable de los eventos en el cliente. Paralelamente, `Sileo` gestiona íntegramente los *Toasts* de feedback temporal e inmediato en pantalla. Esta separación de intereses garantiza que las notificaciones efímeras no polucionen el estado de auditoría.
*   **Manejo determinista del `401 Unauthorized`:** Si el backend revoca o expira el JWT, el interceptor fuerza la mutación asíncrona de Zustand (limpiando los tokens de LocalStorage) y despacha un *hard-redirect* hacia `/login`, impidiendo que peticiones huérfanas sigan consumiendo banda ancha en el DOM inerte.

---

## 3. ARQUITECTURA BACKEND (GO + FIBER)

El backend no es simplemente una capa CRUD; es un motor de transacciones ACID diseñado bajo las máximas del *Site Reliability Engineering* (SRE).

### 3.1 Patrones de Concurrencia de Nivel Enterprise
La asincronía en Golang es barata (cada Goroutine cuesta < 2KB), pero si no se domina, resulta catastrófica.
*   Para procesamientos masivos no dependientes (ej. notificaciones asíncronas de comprobantes, exportaciones CSV para admins), utilizamos **Goroutines coordinadas mediante `sync.WaitGroup`**.
*   **Context Propagation:** El ciclo vital de cada request de Fiber está anclado a `c.Context()`. Si un estudiante aborta la petición HTTP (cierra la pestaña), el contexto de Go invoca una cancelación recursiva (`context.Canceled`). Esto viaja a la capa de base de datos interrumpiendo el *Query* de PostgreSQL instantáneamente, previniendo cuellos de botella por procesos zombies (Memory Leaks).

### 3.2 Seguridad Perimetral y "Defense-in-Depth" (Mitigación de Vectores de Ataque)
Aplicamos el patrón militar de Defensa en Profundidad, estratificando las validaciones para que la intrusión falle estrepitosamente en la capa más externa posible (*Fail-Fast Principle*).

*   **Capa 1: Edge Validation (Frontera HTTP).** No confiamos ciegamente en las rutas. Por ejemplo, en el `PayInstallmentHandler`, el parámetro `:id` extraído mediante `c.Params("id")` es auditado contra una Expresión Regular de formato **UUIDv4**. Si un actor malicioso inyecta texto aleatorio o inyecciones SQL ciegas, el *Request* rebota con un `400 Bad Request` antes de que siquiera se adquiera una conexión del *Connection Pool* de base de datos.
*   **Validación de Autenticación (`LoginHandler`):** La validación del estado del usuario no delega responsabilidades a la capa de frontend. La propiedad `is_active` es extraída e inspeccionada directamente desde PostgreSQL en el momento del login. Si se detecta un usuario suspendido (`is_active = false`), el servidor interrumpe la ejecución con un rechazo inmediato de estado `403 Forbidden`, bloqueando preventivamente el costoso procesamiento de emisión del token JWT.
*   **Capa 2: Idempotencia y Lógica de Negocio Core.** Cuando un pago ingresa, validamos estrictamente que la cuota (`installment`) se encuentre en estado `PENDING`. Si ya es `PAID`, se aborta inmediatamente (Idempotencia). Aseguramos que la Billetera tenga saldo `>=` a la deuda (Integridad).
*   **Robustez de Pánico (`recover`):** En transacciones complejas, usamos `defer` con wrappers transaccionales que implementan `recover()`. Si un puntero nulo (Nil Pointer Dereference) causa un *Panic* en tiempo de ejecución, nuestra arquitectura captura el crash, efectúa el `tx.Rollback()` obligatorio, y retorna un error `500` formal al cliente, manteniendo el servidor de Fiber 100% disponible.
*   **Go 1.13+ Error Wrapping:** Usamos `fmt.Errorf("...: %w", err)` para encadenar trazas de errores, permitiendo auditorías profundas desde el Handler hasta el query SQL original sin perder el contexto.

### 3.3 Diseño y Estandarización de la API (RESTful Mastery)
*   Transición completa de endpointsRPC/Verbos (`/pagar`, `/crearCuota`) a un diseño **Estrictamente Orientado a Recursos** (`POST /installments/:id/payments`, `POST /installments`).
*   Los códigos de estado HTTP se devuelven con precisión de cirujano: `200 OK` para consultas, `201 Created` exclusivo para génesis de registros y pagos, `403 Forbidden` en barreras de rol RBAC, y `409 Conflict` ante colisiones de estado.
*   La API está unificada mediante **Swagger/OpenAPI**. El uso de `swaggo/swag` extrae los comentarios del código Go en build-time, permitiendo la generación dinámica de una UI de postman interactiva en `/swagger`.

### 3.4 Modelo de Dominio y Flujos Transaccionales (SuperAdmin y Cajeros)
El diseño arquitectónico establece barreras sólidas de responsabilidad operativa y estricta integridad en las mutaciones de estado, segmentadas por roles:

*   **Módulo de SuperAdmin Local:** Gobierna el ciclo de vida (CRUD) de los Cajeros (Admins) de cada institución. Para la revocación de accesos, se instrumenta un mecanismo de "Suspensión" a través de una mutación `PATCH` sobre el estado `is_active`. Este enfoque de *Soft Delete* lógico cancela las credenciales de ingreso del Cajero sin incurrir en la destrucción física del registro, preservando de manera inviolable la integridad de la auditoría y los historiales de caja.
*   **Módulo de Cajero y Matrículas bajo Transacción ACID:** El registro de nuevos alumnos (`EnrollStudentHandler`) es tratado como una operación financiera crítica. El flujo opera rigurosamente bajo una transacción atómica (`db.Beginx()`). Esta directiva garantiza la creación paralela y unificada del usuario en la tabla `users` y su respectiva billetera (con saldo `0`) en la tabla `wallets`. Si ocurre el mínimo fallo (por ejemplo, en la instanciación de la billetera virtual), la transacción invoca un *rollback* completo, descartando al usuario e imposibilitando estados huérfanos o inconsistencias de datos.
*   **Gestión Evolutiva del Estudiante:** La API expone capacidades para que el Cajero mantenga la exactitud del directorio mediante la edición de datos básicos (`UpdateStudentHandler`) y conserve facultades de administración del ciclo de vida a través de la suspensión o reactivación explícita de las cuentas estudiantiles (`UpdateStudentStatusHandler`).

---

## 4. INGENIERÍA DE BASE DE DATOS (POSTGRESQL)

### 4.1 Row-Level Security y Multi-Tenancy Lógico
La base de datos es la última y más importante muralla de seguridad. La arquitectura **Multi-Tenant (Inquilino Compartido)** segrega las universidades a nivel de fila.
*   No basta con hacer un `WHERE tenant_id = X` en Golang (eso está sujeto a errores de programador). 
*   Mediante el RLS nativo de PostgreSQL, el middleware inyecta la variable de sesión de la transacción `SET LOCAL app.current_tenant = X`. Las políticas RLS (`CREATE POLICY ...`) dictan que cualquier operación `SELECT`, `UPDATE` o `DELETE` automáticamente enmascara el resto del mundo. Un estudiante de la Universidad "Alfa" literalmente no puede ver la existencia técnica de un estudiante de la "Universidad Omega", erradicando de raíz las vulnerabilidades de *Cross-Tenant Data Leak*.

### 4.2 Optimización Extrema de Queries e Índices B-Tree
Durante la auditoría de rendimiento SQL, remediamos un talón de Aquiles clásico: *Postgres no indexa Llaves Foráneas por defecto*.
*   **Erradicación de Sequential Scans:** Todas las columnas referenciales críticas (`tenant_id`, `user_id`, `wallet_id`) fueron dotadas de índices explícitos `CREATE INDEX ON table (col)`. Las búsquedas del administrador, los JOINs de recibos y las proyecciones financieras ahora operan en orden algorítmico `O(log N)` (buscando sobre el B-Tree en RAM) en lugar de degradarse a `O(N)` (escaneo masivo de disco).

### 4.3 Estrictez de Tipos y Precisión Numérica Absoluta
El esquema de datos es rígidamente conservador. Postulados arquitectónicos:
1.  **Montos Financieros:** Todo saldo o débito usa `NUMERIC(15,2)`. Se vetaron totalmente los flotantes IEEE-754 (`FLOAT`, `DOUBLE PRECISION`) para eludir errores microscópicos de redondeo binario de céntimos.
2.  **Husos Horarios Inmutables:** Los eventos en el tiempo transaccional y pagos no usan simples *Timestamps*. Implementamos la directiva `TIMESTAMPTZ` y `now()` para unificar el historial de auditoría de la base de datos bajo UTC absoluto.
3.  **Restricciones de Cadena (Strings):** Eliminación de la sintaxis legada `VARCHAR(255)`. Se emplea `TEXT` junto con constricciones rigurosas de nivel de motor `CHECK (LENGTH(column) <= 255)`.

### 4.4 Decisión Arquitectónica Clave: Llaves Primarias (UUID vs BIGINT)
Aunque las buenas prácticas de bases de datos de alto volumen pudiesen sugerir la migración a `BIGINT GENERATED ALWAYS AS IDENTITY` por compactación en índices B-Tree, **la arquitectura de EduPay tomó una decisión deliberada de Seguridad por encima de la Micrométrica del Caché**. 
Se mantiene rigurosamente el formato **UUID v4** (`gen_random_uuid()`) para las llaves primarias en todas las entidades expuestas. Esta resolución arquitectónica fue dictada para inyectar *Opacidad Crítica* a los registros del sistema. Evita absolutamente el **IDOR (Insecure Direct Object Reference)** y los ataques cibernéticos de recolección secuencial (scraping) en rutas públicas, previniendo que analistas externos puedan deducir la magnitud o la tasa de creación de transacciones/clientes del SaaS.

---

## 5. INFRAESTRUCTURA, DESPLIEGUE Y DEVOPS

El pipeline hacia el entorno de producción integra herramientas Cloud-Native modernas, asegurando alta disponibilidad (SLA del 99.9%) y despliegues sin interrupción (Zero-Downtime Deployments).

### 5.1 Docker y Contenerización Optimizada (Multi-Stage)
El Backend de Go se despliega a través de **Docker**. Se utiliza un paradigma de *Multi-Stage Build*:
1.  **Stage de Compilación (Builder):** Usa una imagen base como `golang:1.23-alpine`. Descarga dependencias de red de módulos, valida los chequeos de suma (`go.sum`) para asegurar que el Supply Chain no haya sido envenenado, y finalmente compila estáticamente (CGO_ENABLED=0).
2.  **Stage de Producción (Runner):** La imagen final es frecuentemente la de `alpine` pura o `scratch` (completamente vacía, conteniendo solo el binario). El contenedor de la API pesa apenas ~15-20MB, garantizando *Cold-Starts* casi instantáneos y eliminando por completo la superficie de vulnerabilidad del Sistema Operativo de la imagen (Shell attacks, OpenSSL CVEs, etc.).

### 5.2 Despliegue en Microsoft Azure
La infraestructura general del SaaS descansa en el ecosistema Microsoft Azure:
*   **App Service Containers / Azure Container Instances (ACI):** Ejecución del Backend de manera serverless o dedicada, con reglas de Auto-Scaling horizontal basadas en picos de telemetría de CPU y Memoria (para días de corte de facturación donde miles de alumnos pagan cuotas).
*   **Azure Database for PostgreSQL (Flexible Server):** Se terceriza la responsabilidad de backups automatizados, replicación Read/Write geográfica y mitigación de desastres (Point-in-time recovery) al motor paaS de Azure.
*   **Azure Static Web Apps (O CDN Vercel/Cloudflare):** El binario final destilado de Vite (`dist/`) se envía a los Edge Servers, pre-cacheando estáticos e imágenes, logrando latencias de UI sub-milisegundo. 

### 5.3 Integración Continua y Flujos Operativos (CI/CD)
Ningún commit llega al servidor principal a menos de pasar un riguroso *Pipeline* (e.g. GitHub Actions):
*   `linting`: `golangci-lint` en backend y `eslint` con pre-commit de TypeScript en el frontend.
*   Pruebas Unitarias.
*   Ejecución y generación nativa y segura del contenedor hacia un Container Registry, para finalmente hacer el *Rolling Update* en Azure de modo progresivo.

---
*Este documento sustenta intelectual y matemáticamente las defensas en profundidad, la integridad financiera ACID y la resiliencia UI/UX que la arquitectura de software "EduPay SaaS" provee a escala corporativa.*
