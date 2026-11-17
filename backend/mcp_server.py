"""Streamable HTTP facade. Django owns authentication, permissions and writes."""
import os
import uuid
from typing import Literal

import httpx
from mcp.server.fastmcp import FastMCP, Context
from mcp.server.transport_security import TransportSecuritySettings
from mcp.types import ToolAnnotations
from starlette.requests import Request
from starlette.responses import JSONResponse

API_URL = os.environ.get('INTERNAL_API_URL', 'http://127.0.0.1:8000/api/integrations/').rstrip('/') + '/'
PUBLIC_URL = os.environ.get('PUBLIC_URL', 'https://finance.blueberrieslab.com').rstrip('/')
PUBLIC_HOST = PUBLIC_URL.split('://', 1)[-1]
Resource = Literal['transactions', 'accounts', 'categories', 'debts', 'recurring-incomes', 'recurring-expenses', 'projects', 'tasks', 'notes', 'prospects', 'workouts', 'meals', 'meditations']
Area = Literal['finance', 'organization', 'health', 'meditation', 'math']
READ = ToolAnnotations(readOnlyHint=True, destructiveHint=False, openWorldHint=False)
WRITE = ToolAnnotations(readOnlyHint=False, destructiveHint=False, idempotentHint=True, openWorldHint=False)

server = FastMCP(
    'Mi guía de vida',
    instructions='Registra datos explícitos del usuario. Consulta el esquema antes de escribir. Presenta la vista previa y totales de todo lote financiero y espera confirmación antes de confirm_import. Conserva request_id para reintentar una escritura. Fechas locales America/Mexico_City, importes MXN. El panel de matemáticas se actualiza desde sus Markdown con el sincronizador.',
    stateless_http=True, json_response=True,
    transport_security=TransportSecuritySettings(allowed_hosts=[PUBLIC_HOST, '127.0.0.1:*', 'localhost:*', 'mcp:8002'], allowed_origins=[PUBLIC_URL, 'http://localhost:*', 'http://127.0.0.1:*']),
)


async def api(ctx, method, path, data=None, request_id=None):
    headers = {'Authorization': ctx.request_context.request.headers.get('authorization', '')}
    if request_id:
        headers['Idempotency-Key'] = str(uuid.UUID(request_id))
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.request(method, API_URL + path, headers=headers, json=data)
    if response.status_code >= 400:
        try:
            detail = response.json()
        except ValueError:
            detail = 'El servicio no pudo completar la solicitud.'
        raise ValueError(f'HTTP {response.status_code}: {detail}')
    return response.json()


@server.tool(annotations=READ)
async def list_records(resource: Resource, ctx: Context, offset: int = 0, limit: int = 50) -> dict:
    """Lista registros propios. Usa paginación para encontrar IDs antes de editar."""
    return await api(ctx, 'GET', f'records/{resource}/?offset={offset}&limit={limit}')


@server.tool(annotations=READ)
async def get_record(resource: Resource, record_id: int, ctx: Context) -> dict:
    """Consulta un registro completo por su ID."""
    return await api(ctx, 'GET', f'records/{resource}/{record_id}/')


@server.tool(annotations=READ)
async def get_summary(area: Area, ctx: Context, month: int | None = None, year: int | None = None) -> dict:
    """Consulta finanzas, pendientes, progreso de salud, frase del día o el panel docente. Finanzas acepta mes y año."""
    query = f'?month={month}&year={year}' if month and year else ''
    return await api(ctx, 'GET', f'summary/{area}/{query}')


@server.tool(annotations=READ)
async def record_schema(resource: Resource, ctx: Context) -> dict:
    """Devuelve campos, tipos, opciones y campos obligatorios del registro."""
    return await api(ctx, 'OPTIONS', f'records/{resource}/')


@server.tool(annotations=WRITE)
async def create_record(resource: Resource, data: dict, request_id: str, ctx: Context) -> dict:
    """Crea un registro solicitado. request_id es un UUID nuevo que se conserva al reintentar. Para varios movimientos financieros usa preview_import."""
    return await api(ctx, 'POST', f'records/{resource}/', data, request_id)


@server.tool(annotations=WRITE)
async def update_record(resource: Resource, record_id: int, data: dict, request_id: str, ctx: Context) -> dict:
    """Actualiza campos de un registro propio. Completa una tarea con status DONE. En workouts, sets reemplaza las series completas."""
    return await api(ctx, 'PATCH', f'records/{resource}/{record_id}/', data, request_id)


@server.tool(annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=False, openWorldHint=False))
async def preview_import(rows: list[dict], ctx: Context) -> dict:
    """Prepara una vista previa financiera con filas, totales y posibles duplicados. Muestra el resultado al usuario antes de confirmar."""
    return await api(ctx, 'POST', 'imports/preview/', {'rows': rows})


@server.tool(annotations=WRITE)
async def confirm_import(draft_id: str, confirmed: bool, request_id: str, ctx: Context) -> dict:
    """Guarda el lote sólo después de la confirmación del usuario sobre la vista previa. Devuelve los IDs guardados."""
    return await api(ctx, 'POST', f'imports/{uuid.UUID(draft_id)}/confirm/', {'confirmed': confirmed}, request_id)


@server.custom_route('/health', methods=['GET'])
async def health(request):
    return JSONResponse({'status': 'ok'})


class AuthenticatedMCP:
    def __init__(self, application):
        self.application = application

    async def __call__(self, scope, receive, send):
        if scope['type'] == 'http' and scope['path'] != '/health':
            request = Request(scope)
            authorization = request.headers.get('authorization', '')
            if not authorization.startswith('Bearer lg_'):
                await JSONResponse({'detail': 'Se requiere una clave personal.'}, status_code=401, headers={'WWW-Authenticate': 'Bearer'})(scope, receive, send)
                return
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    response = await client.get(API_URL + 'session/', headers={'Authorization': authorization})
                status = response.status_code
            except httpx.HTTPError:
                status = 503
            if status != 200:
                await JSONResponse({'detail': 'No se pudo autorizar la conexión.'}, status_code=status)(scope, receive, send)
                return
        await self.application(scope, receive, send)


app = AuthenticatedMCP(server.streamable_http_app())
