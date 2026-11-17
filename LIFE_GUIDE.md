# Mi guía de vida

Web: https://finance.blueberrieslab.com · MCP: https://finance.blueberrieslab.com/mcp

## Uso

Hoy reúne pendientes, próxima clase con fecha, finanzas del mes y progreso semanal. Registrar captura movimientos, tareas, notas, entrenamientos, comidas y prácticas. Organización permite proyectos y prospectos; Mi mes conserva la planeación. Los importes son MXN y las fechas usan Ciudad de México.

En Preferencias → Integraciones se generan claves personales. La clave completa se muestra una vez; Django guarda su huella SHA-256. Cada área permite lectura y escritura por separado. Revocar bloquea las siguientes peticiones. El login web sigue usando JWT y las claves personales sólo funcionan en `/api/integrations/` y `/mcp`.

## Codex y scripts

Configura `LIFE_GUIDE_API_KEY` en el entorno del usuario, sin guardarla en el repositorio:

```toml
[mcp_servers.life_guide]
url = "https://finance.blueberrieslab.com/mcp"
bearer_token_env_var = "LIFE_GUIDE_API_KEY"
```

Si Codex ya estaba abierto al configurar la variable, `scripts/mcp_headers.ps1` puede leerla del entorno de usuario mediante `http_headers_helper`. El auxiliar devuelve el encabezado a Codex sin guardar la clave en TOML.

El MCP ofrece esquemas, consulta de registros y resúmenes, creación y edición. Una escritura requiere `request_id` UUID, reutilizado para cualquier reintento. Los lotes financieros deben pasar por `preview_import`, presentar filas, advertencias y totales, y esperar confirmación antes de `confirm_import`. Confirmar el mismo borrador devuelve los mismos IDs; la transacción se revierte entera ante un fallo.

## Matemáticas

La fuente de verdad es `C:\Users\Bmo\Matematicas`. Después de cada reporte ejecuta:

```powershell
python scripts/sync_math.py --root C:\Users\Bmo\Matematicas
```

Usa `LIFE_GUIDE_MATH_KEY` con sólo `math:write`. `--dry-run` valida los archivos y muestra cantidades sin publicar. En Windows también lee la variable del entorno de usuario para sesiones abiertas antes de configurarla. Publica `PANEL.md`, `*/seguimiento.md` y `*/*/plan_clase.md`, conservando los estados originales. Repetir contenido no crea duplicados. Un fallo conserva la última copia válida; reintenta tras corregirlo.

## Despliegue y recordatorios

Coolify construye `main` con Docker Compose. Backend aplica migraciones antes de estar saludable; frontend, MCP y programador esperan esa comprobación. Configura `DJANGO_SECRET_KEY`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST` y `DB_PORT` en los secretos de Coolify. El cambio de firma invalida los JWT anteriores: vuelve a iniciar sesión.

Antes de migrar, respalda PostgreSQL con `pg_dump -Fc`. Las migraciones añadidas son aditivas. Comprueba `/api/health/`, la respuesta 401 de `/mcp` sin clave y el estado saludable de los cuatro servicios. Evita revertir el esquema para volver a una imagen previa; conserva el respaldo.

El programador consulta cada minuto. La meditación se envía a las 07:00 `America/Mexico_City`, con una ventana de recuperación de dos horas. Hora y pausa se editan en Preferencias. Cada intento se reserva por usuario y fecha antes de contactar al proveedor: reiniciar no duplica el mensaje; un envío de resultado incierto no se reintenta automáticamente. La aceptación del proveedor no acredita recepción en el teléfono. Una clave rechazada aparece como Requiere configuración.

Telegram se conecta en Preferencias. Crea un bot exclusivo con `@BotFather` y `/newbot`, pega el token en el campo privado y abre el enlace que genera la guía. Pulsa Iniciar en Telegram y luego comprueba la conexión en la web. El enlace dura diez minutos, se usa una sola vez y sólo acepta el inicio desde un chat privado. El token se cifra con Fernet, usando una clave derivada del secreto de Django, y nunca se devuelve al navegador. Si cambias ese secreto tendrás que volver a ingresar el token. El bot no debe tener otro webhook o programa leyendo sus actualizaciones.

Selecciona Telegram como canal de meditación y guarda el horario. La prueba de envío conserva un UUID para evitar duplicados si se reintenta. El recordatorio diario usa el mismo registro de intentos y continúa aunque los avisos de WhatsApp estén pausados. Desconectar Telegram borra el token y pausa su recordatorio. La cuenta Bmo411 usa Telegram por solicitud del propietario; las demás cuentas conservan su canal.

## Verificación

```powershell
cd backend
python manage.py test users.test_telegram integrations life --noinput
python manage.py makemigrations --check --dry-run
cd ../frontend
npm run lint
npm run build
```

Ejecuta Django con PostgreSQL para incluir la prueba de solicitudes simultáneas (SQLite omite esa prueba). Comprueba también captura rápida y navegación a 390 px y escritorio. El acceso móvil a Codex requiere emparejar el teléfono desde la aplicación de escritorio y mantener la PC encendida y en línea: https://learn.chatgpt.com/docs/remote-connections.
