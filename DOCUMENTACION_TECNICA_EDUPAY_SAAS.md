# Documento de Especificación Técnica: EduPay SaaS

**Autor:** Arquitecto de Software Principal
**Fecha:** 30 de Abril de 2026
**Propósito:** Sustentación de Proyecto de Ingeniería de Software (9no Semestre)
**Estado:** Implementación y Refinamiento

---

## 1. Resumen Ejecutivo y Visión del Producto (SaaS B2B)

**EduPay SaaS** se conceptualiza como una plataforma financiera *Business-to-Business* (B2B) bajo el modelo *Software as a Service* (SaaS) Multi-Tenant. El objetivo central de la aplicación es proveer a instituciones educativas (universidades, colegios, institutos) una infraestructura tecnológica "llave en mano" para la gestión de billeteras digitales de circuito cerrado (closed-loop wallets) para sus estudiantes.

### Arquitectura Multi-Tenant (Aislamiento de Datos)

El núcleo del producto es su capacidad para operar de forma centralizada pero asegurando un aislamiento total entre organizaciones. Cada universidad se representa como un *Tenant* autónomo en la base de datos PostgreSQL. 

En lugar de utilizar bases de datos separadas (lo que aumentaría exponencialmente el costo de infraestructura), se adoptó una **arquitectura lógica Multi-Tenant utilizando Row-Level Security (RLS)** nativo de PostgreSQL. En el script de inicialización (`001_init_schema.sql`), se habilitó y forzó RLS (`ALTER TABLE ... FORCE ROW LEVEL SECURITY`) en las tablas críticas (`users`, `wallets`, `wallet_txs`). 

Las políticas de Postgres garantizan matemáticamente que un Tenant (ej. Universidad A) no pueda bajo ninguna circunstancia leer o alterar registros de otro Tenant (ej. Universidad B), validando cada transacción a nivel de motor contra el identificador del entorno (`tenant_id`).

---

## 2. Arquitectura del Sistema (Tech Stack)

La selección del *stack* tecnológico se realizó basándose estrictamente en requerimientos no funcionales como tolerancia a fallos, concurrencia masiva, seguridad tipada y alta disponibilidad.

### Backend: Go, Fiber y SQLX
*   **Go (Golang):** Seleccionado como lenguaje central por su modelo de concurrencia nativa (*Goroutines*), recolección de basura ultra-optimizada y compilación a binarios estáticos sin dependencias externas. Esto garantiza un bajo consumo de memoria RAM y latencias predecibles bajo estrés.
*   **Fiber:** Micro-framework web inspirado en Express.js pero impulsado por el motor HTTP *Fasthttp*. Fiber nos proporciona un rendimiento de ruteo y parsing de JSON sustancialmente superior a la librería estándar `net/http`, esencial para una API financiera de alta transaccionalidad.
*   **SQLX:** Optamos por un mapeador relacional ligero en lugar de un ORM pesado (como GORM). SQLX proporciona la seguridad de mapeo a *Structs* de Go pero manteniendo el control absoluto y explícito sobre las consultas SQL en texto plano, crucial para auditar el rendimiento y los bloqueos transaccionales.

### Frontend: React 18, TypeScript, Zustand y React Router
*   **React y TypeScript:** La interfaz de usuario es una *Single Page Application* (SPA) construida con React, encapsulada bajo un rigoroso control de tipos estático con TypeScript. Esto previene un amplio espectro de errores en tiempo de compilación.
*   **Zustand:** Seleccionado para el manejo de estado global debido a su diseño minimalista y libre de *boilerplate* (a diferencia de Redux), manteniendo la eficiencia en los re-renderizados.
*   **React Router:** Encargado de gestionar la navegación del cliente con *guards* avanzados (ver sección UI/UX) para prevenir accesos no autorizados en el DOM.

### Base de Datos: PostgreSQL
*   Seleccionado por ser el motor SQL open-source más avanzado y compatible con principios **ACID** (Atomicidad, Consistencia, Aislamiento, Durabilidad). 
*   **Rigor Financiero:** Se prohibió arquitectónicamente el uso de tipos de coma flotante (`FLOAT` o `REAL`) para almacenar dinero debido a imprecisiones de representación binaria. Todos los saldos y montos se procesan mediante `NUMERIC(15,2)`, garantizando precisión contable exacta.

---

## 3. Mecanismos de Seguridad y Concurrencia (El núcleo duro)

Dado que EduPay gestiona saldos y transacciones, la integridad del dato no es negociable. La concurrencia asíncrona de Go requirió estrategias específicas en la capa de datos.

### Transacciones ACID y Row-Level Locking (Prevención de *Race Conditions*)
Un problema clásico en sistemas de billetera ocurre cuando múltiples solicitudes asíncronas intentan modificar el saldo de un usuario exactamente al mismo tiempo (ej. dos compras simultáneas). Si no se maneja correctamente, la aplicación lee un saldo desactualizado y ocurre un "doble gasto" (*Race Condition*).

Para resolver esto, implementamos bloqueos pesimistas a nivel de fila (*Pessimistic Row-Level Locking*) utilizando la cláusula **`FOR UPDATE`** de PostgreSQL dentro de transacciones de SQLX (ej. `tx.Beginx()`).

*   **En Pagos (`ProcessPurchase` en `store/service.go`):** Al iniciar el cobro, se ejecuta `SELECT w.id ... FOR UPDATE`. Esto bloquea la fila del saldo en la BD; cualquier otra petición de compra queda en espera encolada por la base de datos hasta que el hilo actual haga `tx.Commit()` o `tx.Rollback()`.
*   **Prevención de Deadlocks en P2P (`TransferHandler` en `wallet/handler.go`):** En transacciones cruzadas (A le envía a B, y al mismo tiempo B le envía a A), un bloqueo bidireccional causa un *Deadlock* infinito. Para neutralizar este vector matemático, el query `SELECT ... FOR UPDATE` agrupa a los involucrados y **siempre bloquea las filas en el mismo orden lexicográfico** (`ORDER BY user_id FOR UPDATE`). Así, los bloqueos cruzados quedan serializados automáticamente.

### Autenticación y Autorización (Middlewares)
*   La aplicación carece de estado (*Stateless*). La autenticación opera sobre el estándar de **JSON Web Tokens (JWT)**.
*   Las contraseñas de los usuarios nunca se guardan en texto plano; son inyectadas a una función de *hash* algorítmico **Bcrypt** con generación de *Salt* nativa antes del `INSERT`.
*   **Autorización RBAC (`RequireRole` en `auth/rbac.go`):** Diseñamos un Middleware de control de acceso basado en roles mediante parámetros variádicos en Go (`...string`). El *guardia* intercepta la petición, verifica si el rol encriptado en el *payload* del JWT pertenece a la lista VIP del *endpoint*, delegando el `c.Next()` o retornando un *StatusForbidden (403)* instantáneamente, blindando la lógica de negocio.

### Libro Mayor Inmutable (Audit Trail)
El sistema financiero opera sobre una tabla transaccional diseñada como "Append-Only" (Solo escritura, jamás eliminación ni alteración). 
*   **Tabla `wallet_txs`:** Cada vez que el saldo muta en la tabla `wallets`, la misma transacción de SQL inyecta forzosamente un registro en `wallet_txs` con el delta (`amount`), tipo de operación y referencia.
*   **Tipos Soportados:** `DEPOSIT`, `PURCHASE`, `FEE`, `TRANSFER_IN`, `TRANSFER_OUT`.
*   Esto garantiza un flujo de caja reconstruible para peritajes informáticos e integra a la plataforma con estándares contables de auditoría (Doble Entrada conceptual mediante *logs* transaccionales).

---

## 4. Ecosistema de Usuarios y Flujos Implementados

La arquitectura define tres entornos de usuarios asimétricos, completamente desacoplados en el Frontend e inferidos lógicamente en el Backend:

### 1. SuperAdmin (Modo Dios)
Es el *sysadmin* del ecosistema general. A través de este perfil, EduPay incorpora nuevas entidades jurídicas al software.
*   **Creación de Tenants (`CreateTenant`):** El SuperAdmin genera los nuevos entornos (Universidades), configurando parámetros fundacionales como el identificador de dominio y tasas de interés (`default_interest_rate`) base para futuros módulos de crédito.

### 2. Administrador (Cajero de Universidad)
Opera bajo las fronteras de un `tenant_id` específico. Es el gerente financiero de la institución en el software.
*   **Auditoría Global (`Transactions` / `GetAdminTransactions`):** Posee vistas analíticas con consultas SQL que cruzan (*JOIN*) el historial de movimientos (`wallet_txs`) con datos de usuarios (`users`) para obtener un flujo de caja global. Optimizamos estas vistas incorporando **paginación algorítmica** (`LIMIT` y `OFFSET`) calculando el total de páginas (`totalPages`) matemáticamente desde la base de datos, garantizando rendimiento O(1) relativo sin saturar la memoria RAM.
*   **Inyección de Fondos (`DepositHandler`):** Único actor capaz de inyectar "dinero fiat" al ecosistema, permitiendo digitalizar efectivo físico o depósitos bancarios de los estudiantes.

### 3. Estudiante (Usuario Final)
Dispone de las primitivas financieras para transaccionar en el ecosistema de su universidad.
*   **Dashboard (`GetWalletDashboardHandler`):** Consulta su billetera personal unificando saldo y transacciones paginadas.
*   **Transferencias P2P (`TransferHandler`):** Envío de fondos inter-estudiantiles. El backend efectúa validaciones del DTO con `go-playground/validator` (mínimo de envío de $5,000 COP, existencia de destinatario, validación de autotransferencia y verificación estricta de saldos).
*   **Módulo Store (`ProcessPurchase`):** Simula puntos de venta o cobros institucionales directos en formato de tienda.

---

## 5. Arquitectura UI/UX

El Frontend está estructurado para soportar un mantenimiento evolutivo (*Scalability*) y maximizar la resiliencia en tiempo de ejecución.

### Sistema de Diseño (Tailwind CSS y "Nord Theme")
Descartamos librerías monolíticas de componentes a favor de **Tailwind CSS**. La directriz estética impuesta se basa en el **"Nord Theme"**, un sistema de colores glaciar y corporativo definido rigurosamente mediante *Design Tokens* e inyectado como clases utilitarias de Tailwind (ej. `bg-nord-0`, `text-nord-4`).
Esta inyección atómica previene el CSS-in-JS (que castigaría el rendimiento del *Runtime* de JavaScript) y asegura la consistencia gráfica, entregando un producto SaaS B2B de aspecto *Premium* y minimalista. Las interacciones dinámicas de éxito y error están orquestadas mediante micro-notificaciones usando la librería *Sileo*.

### Composición y Layouts
React Router DOM se emplea de forma declarativa, abstrayendo el contenedor maestro (*Shell*) y delegando las vistas internas al `<Outlet />`.
*   Existen Layouts especializados que determinan el *Navbar*, *Sidebar* y contenedor de fondos base de acuerdo al entorno de ejecución: `StudentLayout`, `AdminLayout` y `SuperAdminLayout`.

### Enrutamiento Protegido basado en Roles (Security via UI)
El flujo de navegación está blindado mediante componentes de Alto Orden (*Higher-Order Components / Guards*) orquestados en el árbol de rutas principal (`App.tsx`):
1.  **`<ProtectedRoute />`**: Intercepta la solicitud y verifica que la sesión (token JWT del *LocalStorage* o estado en Zustand) exista. Si hay ausencia, emite un *redirect* duro hacia `/login`.
2.  **`<RoleRoute allowedRole="..." />`**: Segundo filtro algorítmico que cruza el `role` decodificado con la lista de permisos de esa área (ej. `"STUDENT"`, `"ADMIN"` o `"SUPERADMIN"`). Si un estudiante trata de mutar la URL directamente en el navegador hacia `/admin`, React intercepta la violación e impide el renderizado del Árbol del DOM, garantizando que el usuario únicamente interaccione con la interfaz a la que está constitucionalmente autorizado a ingresar.

---
*Este documento atestigua las métricas de madurez de ingeniería de software aplicadas en la planeación y programación de la arquitectura EduPay SaaS, cumpliendo con los estándares de rigor técnico, optimización de recursos y seguridad integral.*
