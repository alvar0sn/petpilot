# VETRKT — Documento de Requerimientos: Migración a SaaS Multi-Tenant

**Versión:** 1.0  
**Fecha:** Junio 2026  
**Stack objetivo:** Laravel 11 + PostgreSQL + Inertia.js + React + Railway  
**Referencia de arquitectura:** fitrkt (forzo.app)

---

## 1. Contexto y Decisión

VETRKT existe hoy como un plugin de WordPress instalado por cliente en subdominios de `rkt360.com`. El sistema funciona pero no escala: cada cliente nuevo requiere provisionar un subdomain, instalar WordPress, configurar el plugin, crear una subcuenta GHL manualmente.

La decisión es migrar a un SaaS multi-tenant donde:
- Un solo sistema central corre en Railway
- Cada negocio veterinario / pet service es un **tenant**
- El super admin (Alvaro) administra todos los tenants desde un panel central
- Los tenants no saben que comparten infraestructura

El cliente actual (Kindogs en `kindogs.rkt360.com`) **permanece en WordPress** durante la transición. El nuevo sistema incluye una herramienta de importación de clientes desde el plugin WP.

---

## 2. Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Backend | Laravel 11 (PHP 8.3) |
| Base de datos | PostgreSQL (Railway) |
| Frontend | Inertia.js + React 18 |
| Estilos | Tailwind CSS |
| Autenticación | Laravel Breeze / Sanctum |
| Deploy | Railway (misma configuración que fitrkt) |
| Storage archivos | Railway Volume o S3-compatible |
| Queue | Laravel Queue + Redis (Railway) |
| Cron | Laravel Scheduler (Railway cron) |
| WebSockets (futuro) | Pusher / Soketi |

---

## 3. Modelo Multi-Tenant

### 3.1 Estrategia de tenancy

**Un esquema PostgreSQL compartido con columna `tenant_id`** en todas las tablas de negocio. Mismo patrón que fitrkt con `studio_id`.

Cada tenant tiene:
- Un registro en la tabla `tenants`
- Un subdominio propio: `{slug}.vetrkt.com` (o dominio custom en futuro)
- Su propia configuración de GHL (API key + Location ID + webhooks)
- Sus propios usuarios (admin + colaboradores)
- Sus propios datos completamente aislados

### 3.2 Resolución del tenant

Middleware `ResolveTenant` que detecta el tenant por:
1. Subdominio en el request (`kindogs.vetrkt.com` → tenant `kindogs`)
2. Columna `tenant_id` en el usuario autenticado (igual que `studio_id` en fitrkt)

El tenant se bindea en el container: `app('current_tenant')`.

**Regla crítica aprendida de fitrkt:** Todo usuario tiene `tenant_id` como columna directa en `users`, NO solo como pivot. Esto es obligatorio para que los jobs de queue y el scheduler funcionen sin contexto HTTP.

### 3.3 Roles por tenant

| Rol | Descripción |
|-----|-------------|
| `super_admin` | Alvaro — acceso total a todos los tenants |
| `tenant_admin` | Dueño del negocio — administra su tenant |
| `colaborador` | Empleado — acceso operativo (configurable por módulo) |

Los permisos de colaborador son configurables por tenant admin: qué módulos puede ver/editar.

---

## 4. Módulos del Sistema

### 4.1 CRM — Clientes y Mascotas

**Migrado de:** `vet_owners`, `vet_pets`, `vet_events`, `vet_event_types`, `vet_pet_service_config`, `vet_pet_files`, `vet_checklist_items`, `vet_event_checklist`

#### Tabla `owners`
```
id, tenant_id, ghl_contact_id, ghl_sync_status (enum: synced/pending/failed),
nombre, telefono, email, direccion, notas, created_at, updated_at
```

#### Tabla `pets`
```
id, tenant_id, owner_id, nombre, foto_url, raza, tipo (enum: perro/gato/roedor/reptil/otro),
tamanio (enum: pequeño/mediano/grande), sexo (enum: macho/hembra), esterilizado,
peso (decimal), nivel_agresividad (enum: tranquilo/precaucion/agresivo),
fecha_nacimiento, alergias, padecimientos, obs_comportamiento, num_expediente,
estado (enum: activo/inactivo), created_at, updated_at
```

#### Tabla `event_types`
```
id, tenant_id, nombre, intervalo_dias, es_configurable, activo
```
Seed por tenant al crearlo: Estética, Vacuna, Desparasitación, Consulta.

#### Tabla `events`
```
id, tenant_id, pet_id, event_type_id, fecha, notas, foto_url,
peso, proximo_recordatorio, recordatorio_enviado,
-- campos clínicos:
vacuna_nombre, vacuna_lote, vacuna_laboratorio,
despa_producto, despa_via,
consulta_peso, consulta_temperatura, consulta_motivo, consulta_diagnostico,
consulta_medicamentos, consulta_proxima_cita,
-- estética visual:
est_verrugas, est_pulgas, est_secreciones, est_lesiones, est_alergias, est_manto,
created_by, created_at, updated_at
```

#### Tabla `pet_service_config`
```
id, tenant_id, pet_id, event_type_id, frecuencia_dias
UNIQUE(tenant_id, pet_id, event_type_id)
```

#### Tabla `pet_files`
```
id, tenant_id, pet_id, event_id, nombre, tipo_mime, tamanio_bytes,
archivo_url, uploaded_by, created_at
```

#### Tabla `checklist_items`
```
id, tenant_id, nombre, orden, activo
```
Seed por tenant: Baño, Secado, Cepillado, Corte de pelo, Corte de uñas, Limado de uñas, Corte de patas, Limpieza de orejas, Limpieza de glándulas, Corte de pelo en orejas, Bow/moño, Perfume.

#### Tabla `event_checklist`
```
id, tenant_id, event_id, checklist_item_id
UNIQUE(tenant_id, event_id, checklist_item_id)
```

---

### 4.2 POS — Punto de Venta

**Migrado de:** `pos_configuracion`, `pos_metodos_pago`, `pos_categorias`, `pos_catalog_items`, `pos_descuentos`, `pos_turnos`, `pos_caja_movimientos`, `pos_tickets`, `pos_ticket_lines`, `pos_pagos`, `pos_stock_movimientos`

#### Tabla `pos_config`
```
id, tenant_id, clave, valor
UNIQUE(tenant_id, clave)
```
Keys: nombre_negocio, direccion, telefono, mensaje_pie, color_principal, logo_url, folio_siguiente, ticket_promedio_mxn.

#### Tabla `pos_categories`
```
id, tenant_id, nombre, orden, activo, es_grooming
```

#### Tabla `pos_catalog_items`
```
id, tenant_id, categoria_id, sku, nombre, tipo (enum: producto/servicio),
precio, costo, stock, activo, comision_tipo (enum: porcentaje/fijo), comision_valor,
created_at, updated_at
```

#### Tabla `pos_payment_methods`
```
id, tenant_id, nombre, activo, orden
```

#### Tabla `pos_discounts`
```
id, tenant_id, nombre, tipo (enum: porcentaje/monto/cupon), valor,
codigo, fecha_inicio, fecha_fin, enviar_whatsapp, activo
```

#### Tabla `pos_shifts` (turnos)
```
id, tenant_id, user_id, fecha_apertura, fecha_cierre,
fondo_inicial, efectivo_contado, estado (enum: abierto/cerrado)
```

#### Tabla `pos_cash_movements`
```
id, tenant_id, shift_id, user_id, tipo (enum: deposito/salida),
monto, comentario, created_at
```

#### Tabla `pos_tickets`
```
id, tenant_id, folio, token, owner_id, estado (enum: abierto/pagado/cancelado),
shift_open_id, shift_close_id, user_open_id, user_close_id, user_last_edit_id,
discount_id, discount_amount, subtotal, total,
comentario_cancelacion, created_at, updated_at, cobrado_at
```

#### Tabla `pos_ticket_lines`
```
id, tenant_id, ticket_id, item_id, nombre_snapshot,
precio_snapshot, costo_snapshot, cantidad, subtotal
```

#### Tabla `pos_payments`
```
id, tenant_id, ticket_id, payment_method_id, monto
```

#### Tabla `pos_stock_movements`
```
id, tenant_id, item_id, ticket_id, tipo (enum: venta/cancelacion/ajuste/import),
cantidad, stock_anterior, stock_nuevo, user_id, created_at
```

---

### 4.3 Membresías Multi-Servicio ⭐ NUEVO

Este módulo reemplaza y extiende el sistema de membresías de hotel del plugin WP. El dueño del negocio crea planes configurables con créditos por tipo de servicio.

#### 4.3.1 Planes de membresía

Un plan tiene:
- Nombre y precio
- Vigencia en días
- Una o más líneas de créditos — cada línea define cuántos créditos se otorgan para qué tipo de servicio

**Ejemplo real:**
```
Plan "Todo Incluido" — $2,500 MXN — 30 días de vigencia
  └─ 20 créditos de Guardería (1 crédito = 1 día)
  └─ 4 créditos de Hotel (1 crédito = 1 noche)
  └─ 2 créditos de Estética (1 crédito = 1 sesión)
  └─ 8 créditos de Paseo (1 crédito = 1 paseo)

Plan "Solo Guardería" — $900 MXN — 30 días de vigencia
  └─ 15 créditos de Guardería
```

#### Tabla `membership_plans`
```
id, tenant_id, nombre, precio, vigencia_dias,
pos_item_id (FK a pos_catalog_items para cobro en POS),
activo, created_at, updated_at
```

#### Tabla `membership_plan_credits`
```
id, tenant_id, plan_id, servicio_tipo (enum: guarderia/hotel/estetica/paseo),
creditos (int)
UNIQUE(tenant_id, plan_id, servicio_tipo)
```

#### Tabla `memberships` (membresías asignadas a mascota)
```
id, tenant_id, pet_id, plan_id, fecha_inicio, fecha_vencimiento,
activa, aviso_enviado, pos_ticket_id, created_at, updated_at
```

#### Tabla `membership_credits` (saldo actual por servicio)
```
id, tenant_id, membership_id, servicio_tipo, saldo_inicial, saldo_actual
UNIQUE(tenant_id, membership_id, servicio_tipo)
```

#### Tabla `membership_credit_movements` (auditoría de cada consumo/recarga)
```
id, tenant_id, membership_id, credit_id, servicio_tipo,
tipo (enum: consumo/recarga/ajuste/vencimiento),
cantidad, saldo_antes, saldo_despues,
referencia_tipo (enum: estancia/appointment/manual),
referencia_id, user_id, notas, created_at
```

#### 4.3.2 Reglas de negocio

- Al asignar una membresía: se crea un ticket en POS por el `precio` del plan, con el `pos_item_id` del plan.
- Al hacer check-in en guardería u hotel: el sistema verifica si la mascota tiene membresía activa con créditos del tipo correspondiente. Si tiene → descuenta 1 crédito y marca `cobro_membresia = true`. Si no tiene → cobra a precio de tarifa normal.
- Al completar una cita de estética o paseo: mismo check.
- Un crédito de guardería = 1 día. Un crédito de hotel = 1 noche. Un crédito de estética = 1 sesión. Un crédito de paseo = 1 paseo.
- Una mascota puede tener una sola membresía activa vigente por plan simultáneamente. Puede renovar generando una nueva membresía con fecha inicio configurable.
- Si `saldo_actual <= 2` en cualquier servicio: marcar alerta visible en la UI y disparar webhook de aviso (si configurado).
- Al vencer `fecha_vencimiento`: la membresía se marca `activa = false` en el cron diario. Los créditos no usados se pierden (configurable por tenant en futuro).

---

### 4.4 Hotel / Guardería

**Migrado de:** `vet_hotel_espacios`, `vet_hotel_tarifas`, `vet_hotel_estancias`, `vet_hotel_fotos`, `vet_hotel_cargos`

#### Tabla `hotel_spaces`
```
id, tenant_id, nombre, activo, created_at
```

#### Tabla `hotel_rates`
```
id, tenant_id, nombre, tipo (enum: guarderia/hotel),
unidad (enum: horas/dias), cantidad, precio, pos_item_id, activa
```

#### Tabla `hotel_stays`
```
id, tenant_id, pet_id, space_id, tipo (enum: guarderia/hotel),
estado (enum: reservado/activo/completado/cancelado/no_presento),
fecha_entrada, fecha_salida, alimentacion, medicacion, notas,
estado_fisico (enum: ok/lesion), nota_lesion,
objetos_recibidos, motivo_cancelacion, rate_id, precio_por_noche,
cobro_membresia, membership_id, pos_ticket_id,
created_by, created_at, updated_at
```

#### Tabla `hotel_stay_photos`
```
id, tenant_id, stay_id, tipo (enum: cara/cuerpo), url, created_at
```

#### Tabla `hotel_stay_charges`
```
id, tenant_id, stay_id, pos_item_id, concepto,
precio_unitario, cantidad, subtotal, created_by, created_at
```

---

### 4.5 Grooming / Calendario

**Migrado de:** `vet_appointments`, `vet_appointment_items`, `vet_grooming_estaciones`

#### Tabla `grooming_stations`
```
id, tenant_id, nombre, activo, orden, created_at
```

#### Tabla `appointments`
```
id, tenant_id, pet_id, owner_id, tipo_servicio_id, fecha,
hora_inicio, hora_fin,
estado (enum: pendiente/confirmada/completada/cancelada/no_show),
groomer_id (user), station_id, notas_internas,
created_via (enum: operador/formulario_web/whatsapp),
event_id, stay_id, pos_ticket_id,
cobro_membresia, membership_id,
created_by, created_at, updated_at
```

#### Tabla `appointment_items`
```
id, tenant_id, appointment_id, catalog_item_id, nombre,
precio, cantidad, created_at
```

---

### 4.6 Paseos ⭐ NUEVO (soporte de crédito de membresía)

Módulo simple para registrar paseos — principalmente para consumo de créditos de membresía.

#### Tabla `walks`
```
id, tenant_id, pet_id, owner_id, fecha, hora_inicio, hora_fin,
walker_id (user), notas, estado (enum: pendiente/completado/cancelado),
cobro_membresia, membership_id, pos_ticket_id,
created_by, created_at, updated_at
```

---

## 5. GHL — GoHighLevel

### 5.1 Configuración por tenant (NO por tenant admin)

Los webhooks y la API key de GHL se configuran **desde el super admin** para cada tenant. El tenant admin no ve nada de GHL en su panel.

#### Tabla `tenant_ghl_configs`
```
id, tenant_id,
api_key (encrypted), location_id,
webhook_recordatorios, webhook_cumpleanos, webhook_reviews,
webhook_membresia_vencimiento,
webhook_checkin_hotel, webhook_checkout_hotel,
activo, created_at, updated_at
```

**Nota de implementación:** Encriptar `api_key` con `encrypt()` de Laravel. Nunca almacenar en texto plano.

### 5.2 Webhooks disponibles por evento

| Evento | Payload |
|--------|---------|
| Recordatorio de servicio | tipo, tipo_servicio, ghl_contact_id, owner_nombre, owner_telefono, pet_nombre, pet_raza, fecha_servicio |
| Cumpleaños | tipo, ghl_contact_id, owner_nombre, owner_telefono, pet_nombre, edad_anos |
| Review post-servicio | tipo, ghl_contact_id, owner_nombre, owner_telefono, pet_nombre, tipo_servicio |
| Membresía por vencer | tipo, ghl_contact_id, owner_nombre, owner_telefono, pet_nombre, plan_nombre, saldo_por_servicio, fecha_vencimiento, dias_para_vencer |
| Check-in hotel/guardería | tipo, ghl_contact_id, owner_nombre, owner_telefono, pet_nombre, tipo_estancia, fecha_entrada, fecha_salida |
| Check-out hotel/guardería | tipo, ghl_contact_id, owner_nombre, owner_telefono, pet_nombre, tipo_estancia |

### 5.3 Logs de GHL

#### Tabla `ghl_contact_logs`
```
id, tenant_id, owner_id, action (enum: create/update/sync),
status (enum: success/failed/skipped), ghl_contact_id,
http_code, error_message, payload_sent (json), created_at
```

#### Tabla `ghl_webhook_logs`
```
id, tenant_id, webhook_type, status (enum: success/failed),
http_code, payload_sent (json), error_message, created_at
```

---

## 6. Cron / Scheduler

El scheduler de Laravel corre diario a las 8:00 AM (hora Mexico City configurada como timezone del proyecto).

**Jobs diarios:**
1. `ProcessReminders` — para cada tenant activo, busca eventos con `proximo_recordatorio = hoy` y `recordatorio_enviado = false`, dispara webhook de recordatorio, marca enviado.
2. `ProcessBirthdays` — busca mascotas con cumpleaños hoy, dispara webhook.
3. `ProcessMembershipExpiry` — marca membresías vencidas, dispara webhook de aviso X días antes (configurable por tenant en su settings).
4. `ProcessReviews` — busca eventos de ayer elegibles para review, dispara webhook.

Cada job itera por tenant y usa su `TenantGhlConfig` correspondiente.

---

## 7. Super Admin

Accesible en `/super-admin` — solo para usuarios con rol `super_admin`.

### 7.1 Gestión de tenants

**Lista de tenants** con:
- Nombre del negocio, slug (subdominio), fecha de creación
- Estado: activo / inactivo / trial
- Contadores: owners, pets, tickets del mes, estancias activas
- Acciones: Ver detalle, Editar configuración GHL, Impersonar, Desactivar

**Crear tenant:**
- Nombre del negocio
- Slug (subdominio) — se valida único
- Email y contraseña del tenant admin
- Plan de precios (campo libre por ahora)
- Configuración GHL inicial (API key, Location ID, webhooks)

**Editar tenant:**
- Todos los campos de configuración GHL
- Activar/desactivar webhooks individuales
- Cambiar plan / estado
- Ver logs de GHL del tenant

### 7.2 Importar clientes desde VETRKT WordPress (Kindogs)

Botón en el detalle del tenant: **"Importar desde WordPress"**.

El flujo:
1. Super admin sube un archivo CSV exportado del plugin WP (mismo formato que la importación GHL existente en el plugin)
2. El sistema parsea el CSV y hace una vista previa: N owners, N pets encontrados, N duplicados detectados (por teléfono)
3. Confirmación → importación
4. Los owners importados quedan con `ghl_sync_status = 'pending'` para que el job de sync los procese

**Formato CSV esperado:** el mismo que exporta GHL (nombre, telefono, email, tags) — ya existe el parser en el plugin WP, se porta a Laravel.

**Alternativa futura:** Endpoint REST en el plugin WP que el nuevo sistema consume directamente. Por ahora el CSV manual es suficiente.

### 7.3 Logs centralizados

Vista de logs con filtros por:
- Tenant
- Tipo: GHL Contact, GHL Webhook, Cron, Error
- Estado: success / failed
- Rango de fechas

### 7.4 Impersonar tenant

Botón "Acceder como tenant" que genera una sesión temporal autenticada como el `tenant_admin` del tenant seleccionado. El super admin ve exactamente lo que ve el cliente. Banner visible en la UI: "Estás viendo el panel de [Nombre negocio] — [Salir]".

---

## 8. Tenants — Panel Principal

### 8.1 Dashboard

Métricas del período (semana / mes / 3 meses / personalizado):
- Ingresos estimados generados (eventos × ticket promedio configurable)
- Recordatorios enviados / fallidos
- Reactivaciones (clientes que regresaron tras recordatorio)
- Estéticas, consultas, vacunas registradas
- Perros nuevos
- Créditos de membresía consumidos por tipo

Alertas sin filtro de período:
- Clientes sin mascota registrada
- Recordatorios vencidos sin atender
- Membresías con saldo bajo (≤2 créditos en cualquier servicio)
- Membresías vencidas esta semana

Recordatorios programados para hoy.

### 8.2 Clientes (Owners)

- Lista con búsqueda por nombre, teléfono, mascota
- Indicador de sync GHL (verde/amarillo/rojo)
- Perfil del owner: datos, lista de mascotas, historial de tickets
- Botón "Reintentar sync GHL" en owners con status `failed` o `pending`
- Crear / editar owner → sync automático a GHL

### 8.3 Mascotas

Desde el perfil del owner:
- Ficha completa de la mascota
- Foto de perfil editable
- Observaciones médicas y de comportamiento
- Cards resumen: última vacuna, última desparasitación, última estética, cumpleaños
- Timeline cronológico de eventos
- Adjuntos (archivos / fotos por evento)
- Membresía activa con saldo por servicio

### 8.4 Historial / Eventos

- Formulario de nuevo evento por tipo (estética, vacuna, desparasitación, consulta)
- Campos específicos según tipo (lote de vacuna, diagnóstico en consulta, checklist en estética)
- Cálculo automático de próximo recordatorio al guardar
- Foto adjunta por evento

### 8.5 Grooming / Calendario

- Vista semanal de citas por estación
- Nueva cita: mascota + tipo de servicio + fecha/hora + estación + groomer
- Estados: pendiente → confirmada → completada | cancelada | no_show
- Completar cita: genera evento en historial + ticket POS (o cargo a membresía)
- Configuración de estaciones físicas
- Vista de pendientes (citas sin confirmar)

### 8.6 Hotel / Guardería

- Disponibilidad por espacio y rango de fechas
- Check-in: selección de mascota, espacio, tipo (hotel/guardería), tarifa
  - Si tiene membresía con créditos del tipo → pregunta si usar membresía o cobrar normal
  - Si usa membresía → descuenta 1 crédito, marca `cobro_membresia = true`
- Detalle de estancia: fotos check-in (cara + cuerpo), cargos adicionales, notas
- Check-out: calcula total, genera ticket POS si no fue por membresía
- Lista de estancias activas con estado visual

### 8.7 Membresías

- Lista de membresías activas por mascota
- Saldo visual por tipo de servicio (barra de progreso + número)
- Estados: Activa / Saldo bajo / Agotada / Vencida
- Historial completo de movimientos de crédito
- Asignar nueva membresía → seleccionar plan → elegir fecha inicio → genera ticket POS
- Renovar → nueva membresía encadenada
- Ajuste manual de créditos (solo tenant admin)

### 8.8 POS

- Nuevo ticket → buscar cliente → agregar productos/servicios del catálogo
- Aplicar descuento (porcentaje, monto fijo, cupón)
- Cobro: selección de método de pago (puede dividir en múltiples métodos)
- Recibo imprimible / PDF
- Gestión de turno: apertura con fondo, cierre con conteo de efectivo
- Movimientos de caja (depósitos / retiros)
- Reportes por turno

### 8.9 Configuración del Tenant

Lo que el tenant admin puede configurar (GHL NO aparece aquí):
- Datos del negocio (nombre, dirección, teléfono, logo)
- Ticket promedio para métricas de ROI
- Colaboradores: crear usuarios, asignar permisos por módulo
- Catálogo POS: categorías, productos, servicios, precios
- Métodos de pago
- Descuentos y cupones
- Tipos de servicio y frecuencias de recordatorio
- Checklist de estética (ítems configurables)
- Hotel: espacios, tarifas
- Membresías: crear y editar planes con créditos por servicio
- Días de aviso de vencimiento de membresía
- Configuración de grooming: estaciones, horarios

---

## 9. Tablas Globales (sin tenant_id)

#### Tabla `tenants`
```
id, nombre, slug, dominio_custom, estado (enum: activo/inactivo/trial),
plan_precio, notas_internas, created_at, updated_at
```

#### Tabla `users`
```
id, tenant_id (obligatorio, no null), nombre, apellido, email,
password, role (enum: super_admin/tenant_admin/colaborador),
permisos_modulos (json), activo, remember_token, created_at, updated_at
```

**Nota:** `tenant_id = null` solo para `super_admin`. Para `tenant_admin` y `colaborador` es obligatorio y no nulo. Esto evita el bug de fitrkt donde los users sin `studio_id` rompían los jobs de queue.

---

## 10. Migraciones — Orden de Creación

1. `tenants`
2. `users`
3. `tenant_ghl_configs`
4. `owners`
5. `pets`
6. `event_types`
7. `events`
8. `pet_service_config`
9. `pet_files`
10. `checklist_items`
11. `event_checklist`
12. `pos_config`
13. `pos_categories`
14. `pos_catalog_items`
15. `pos_payment_methods`
16. `pos_discounts`
17. `pos_shifts`
18. `pos_cash_movements`
19. `pos_tickets`
20. `pos_ticket_lines`
21. `pos_payments`
22. `pos_stock_movements`
23. `membership_plans`
24. `membership_plan_credits`
25. `memberships`
26. `membership_credits`
27. `membership_credit_movements`
28. `hotel_spaces`
29. `hotel_rates`
30. `hotel_stays`
31. `hotel_stay_photos`
32. `hotel_stay_charges`
33. `grooming_stations`
34. `appointments`
35. `appointment_items`
36. `walks`
37. `ghl_contact_logs`
38. `ghl_webhook_logs`

---

## 11. Seeders por Tenant (al crear cada tenant)

Al crear un tenant, el sistema ejecuta automáticamente:

```
TenantSeeder::run($tenant_id):
  - event_types: Estética (configurable), Vacuna (365d), Desparasitación (90d), Consulta (sin recordatorio)
  - pos_categories: General, Grooming
  - pos_payment_methods: Efectivo, Tarjeta, Transferencia
  - pos_config: nombre_negocio='', folio_siguiente='1', ticket_promedio_mxn='400', mensaje_pie='¡Gracias por tu preferencia!'
  - checklist_items: [lista de 12 ítems de estética]
  - grooming_stations: Estación 1, Estación 2
  - hotel_spaces: (vacío, el tenant configura)
```

---

## 12. Reglas de Implementación para el Agente de Claude

### 12.1 tenant_id en todo

- **Toda tabla de negocio** tiene `tenant_id NOT NULL` con índice.
- **Todo query** filtra por `tenant_id` usando el helper `currentTenant()` o el scope global `TenantScope`.
- **Nunca** hacer un `Model::find($id)` sin `where('tenant_id', ...)`. Usar siempre `Model::forTenant()->find($id)`.

### 12.2 Pattern de GHL (aprendido de fitrkt)

- Los jobs de queue reciben `tenant_id` como parámetro explícito, **no** lo leen del contexto HTTP.
- Antes de encolar cualquier job de GHL, capturar `app('current_tenant')->id` en el controller y pasarlo al job.
- `GhlService` recibe `$tenantId` como parámetro, hace `TenantGhlConfig::where('tenant_id', $tenantId)->first()` para obtener las credenciales.
- Si no hay config de GHL → loguear como `skipped`, no lanzar excepción.

### 12.3 ActivityLogger

- `ActivityLog` tiene `tenant_id NOT NULL`.
- `ActivityLogger::log()` resuelve `tenant_id` de `app('current_tenant')` si el modelo no lo tiene directamente.
- Nunca lanzar excepción si `tenant_id` no resuelve — loguear el error y continuar.

### 12.4 Membresías — consumo de créditos

- `MembershipService::consumeCredit($petId, $servicioTipo, $referenciaId, $referenciaTipo)` es el único punto de entrada para descontar créditos.
- El método verifica membresía activa, verifica créditos disponibles, descuenta, registra en `membership_credit_movements`, retorna `true/false`.
- Nunca descontar créditos directamente desde un controller.

### 12.5 Impersonación de tenant

- Implementar con `session(['impersonating_tenant_id' => $id])`.
- Middleware `HandleImpersonation` detecta la sesión y bindea el tenant correspondiente.
- Banner visible: no puede ocultarse.
- El super admin no pierde su sesión original al impersonar.

### 12.6 Importación CSV

- El parser de CSV es tolerante a errores: si una fila falla, la saltea y continúa.
- Deduplicación por teléfono (campo único por tenant).
- Preview antes de confirmar: mostrar tabla con owners nuevos / actualizados / duplicados / con error.
- La importación corre como Job en background para archivos grandes.

### 12.7 Encriptación de API Keys

- Usar `encrypt()` / `decrypt()` de Laravel para `tenant_ghl_configs.api_key`.
- Nunca loguear la API key completa — solo los últimos 4 caracteres.

---

## 13. Entregables Esperados del Agente

Cuando se pida construir este sistema, el agente debe entregar en este orden:

1. **Estructura base del proyecto** — Laravel 11 instalado, Inertia + React configurado, Railway setup, `APP_KEY`, variables de entorno documentadas
2. **Todas las migraciones** en el orden de la sección 10
3. **Middleware de tenancy** (`ResolveTenant`, `TenantScope`, `HandleImpersonation`)
4. **Modelos** con relaciones y scopes
5. **Seeders** (global + por tenant)
6. **Autenticación** (login, logout, roles)
7. **Super Admin** — tenants CRUD + GHL config + logs + impersonación + importación CSV
8. **CRM** — owners + pets + events + timeline
9. **POS** — turnos + tickets + catálogo + pagos + reportes
10. **Membresías** — planes + asignación + consumo de créditos + historial
11. **Hotel / Guardería** — espacios + tarifas + estancias + check-in/out + fotos
12. **Grooming / Calendario** — estaciones + citas + vista semanal + completar→POS
13. **Paseos** — registro + consumo de membresía
14. **GHL Service** — sync de contactos + webhooks + logs
15. **Scheduler** — recordatorios + cumpleaños + membresías + reviews
16. **Configuración del tenant** — settings completo
17. **Dashboard** — métricas + alertas + período personalizable

---

## 14. Lo que NO se construye en v1

- Portal del dueño de mascota (login propio)
- App móvil
- Multi-idioma
- Dominio custom por tenant (el slug es suficiente)
- Integración con Google Reviews directa
- Sistema de paseos avanzado (rutas, GPS, fotos en tiempo real)
- Facturación / CFDI
- Inventario avanzado con proveedores

---

## 15. Variables de Entorno Requeridas

```env
APP_NAME=VETRKT
APP_ENV=production
APP_KEY=
APP_URL=https://vetrkt.com
APP_TIMEZONE=America/Mexico_City

DB_CONNECTION=pgsql
DB_HOST=
DB_PORT=5432
DB_DATABASE=
DB_USERNAME=
DB_PASSWORD=

QUEUE_CONNECTION=redis
REDIS_URL=

FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=
AWS_BUCKET=

MAIL_MAILER=smtp

TENANT_DOMAIN=vetrkt.com
```
