import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, KeyRound, Plus, Check, ExternalLink } from 'lucide-react';
import { api } from '../../services/api';
import { dateLabel, errorMessage } from '../../services/guide';

interface Key { id: number; name: string; prefix: string; scopes: string[]; created_at: string; last_used_at: string | null; revoked_at: string | null; }
const areas: Record<string, string> = { finance: 'Finanzas', organization: 'Organización', health: 'Gym y dieta', meditation: 'Meditación', math: 'Matemáticas' };

export function IntegrationsPage() {
    const client = useQueryClient();
    const [name, setName] = useState('Codex personal');
    const [scopes, setScopes] = useState(['finance:read', 'finance:write', 'organization:read', 'organization:write', 'health:read', 'health:write', 'meditation:read', 'meditation:write', 'math:read']);
    const [secret, setSecret] = useState('');
    const [copied, setCopied] = useState(false);
    const [copyError, setCopyError] = useState('');
    const keys = useQuery({ queryKey: ['integration-keys'], queryFn: async () => (await api.get<{ keys: Key[]; scopes: string[] }>('integrations/keys/')).data });
    const create = useMutation({ mutationFn: async () => (await api.post('integrations/keys/', { name, scopes })).data, onSuccess: data => { setSecret(data.key); setCopied(false); client.invalidateQueries({ queryKey: ['integration-keys'] }); } });
    const revoke = useMutation({ mutationFn: (id: number) => api.post(`integrations/keys/${id}/revoke/`), onSuccess: () => client.invalidateQueries({ queryKey: ['integration-keys'] }) });
    async function copy() {
        try { await navigator.clipboard.writeText(secret); setCopied(true); setCopyError(''); }
        catch { setCopyError('Selecciona la clave y cópiala manualmente.'); }
    }
    return <div className="guide-page"><header className="page-heading"><div><p className="eyebrow">Tus herramientas, conectadas</p><h1>Integraciones</h1></div><KeyRound size={25} className="text-brand-700" /></header>
        <section className="surface"><div className="section-heading"><h2>Conectar Codex</h2></div><p className="text-muted mb-4">Usa el servidor MCP para consultar tu guía y guardar los registros que me compartas.</p><label className="field">Servidor MCP<input readOnly value={`${window.location.origin}/mcp`} /></label><p className="text-sm text-muted mt-4">La clave se configura en la variable LIFE_GUIDE_API_KEY de tu equipo. En Codex, agrega el servidor con autenticación Bearer desde esa variable.</p><pre className="mt-4 p-4 rounded-lg bg-bg-main text-xs overflow-x-auto">{`[mcp_servers.life_guide]\nurl = "${window.location.origin}/mcp"\nbearer_token_env_var = "LIFE_GUIDE_API_KEY"`}</pre></section>
        <section className="surface"><h2 className="mb-4">Crear una clave</h2><form className="space-y-5" onSubmit={event => { event.preventDefault(); create.mutate(); }}><label className="field">Nombre<input required value={name} onChange={e => setName(e.target.value)} maxLength={100} /></label><div className="flex flex-wrap gap-3"><button type="button" className="secondary-button" onClick={() => { setName('Codex personal'); setScopes((keys.data?.scopes || []).filter(scope => scope !== 'math:write')); }}>Codex personal</button><button type="button" className="secondary-button" onClick={() => { setName('Sincronización matemáticas'); setScopes(['math:write']); }}>Sincronizador de matemáticas</button></div>
            <div className="table-scroll"><table><thead><tr><th>Área</th><th>Consultar</th><th>Registrar y editar</th></tr></thead><tbody>{Object.entries(areas).map(([area, label]) => <tr key={area}><td>{label}</td>{['read', 'write'].map(action => <td key={action}><input type="checkbox" aria-label={`${label} ${action === 'read' ? 'consultar' : 'editar'}`} checked={scopes.includes(`${area}:${action}`)} onChange={e => setScopes(e.target.checked ? [...scopes, `${area}:${action}`] : scopes.filter(scope => scope !== `${area}:${action}`))} /></td>)}</tr>)}</tbody></table></div>
            {create.isError && <p className="form-error">{errorMessage(create.error)}</p>}<button className="primary-button" disabled={!scopes.length || create.isPending}><Plus size={16} />{create.isPending ? 'Creando…' : 'Generar clave'}</button></form>
            {secret && <div className="mt-6 p-5 bg-brand-50 border border-brand-200 rounded-lg"><p className="mb-3 font-medium">Guarda esta clave. Se muestra una sola vez.</p><input aria-label="Nueva clave" readOnly value={secret} className="w-full text-xs p-3 bg-bg-main rounded mb-3" /><div className="flex gap-4"><button className="text-button" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copiada' : 'Copiar'}</button><button className="text-button" onClick={() => setSecret('')}>Ya la guardé</button></div>{copyError && <p className="text-warning mt-3">{copyError}</p>}</div>}
        </section>
        <section className="surface"><h2 className="mb-3">Claves de acceso</h2>{keys.isError && <p className="form-error">{errorMessage(keys.error)}</p>}{keys.data?.keys.length === 0 && <p className="text-muted">Todavía no tienes claves.</p>}{keys.data?.keys.map(key => <div className="list-line" key={key.id}><div><p>{key.name} <span className="text-muted text-xs">{key.prefix}…</span></p><p className="text-xs text-muted mt-2">{key.revoked_at ? 'Revocada' : `Último uso ${dateLabel(key.last_used_at)}`}</p><p className="text-xs text-muted mt-1">{key.scopes.join(' · ')}</p></div>{!key.revoked_at && <button className="text-button" disabled={revoke.isPending} onClick={() => revoke.mutate(key.id)}>Revocar</button>}</div>)}{revoke.isError && <p className="form-error">{errorMessage(revoke.error)}</p>}</section>
        <section className="surface space-y-4"><h2>Matemáticas y acceso desde el celular</h2><p className="text-muted">El chat de matemáticas ejecuta scripts/sync_math.py al cerrar cada reporte. Usa una clave con permiso de escritura en Matemáticas en la variable LIFE_GUIDE_MATH_KEY.</p><p className="text-muted">Para usar el mismo MCP desde el celular, empareja tu PC con ChatGPT en Configuración → Conexiones. Luego abre Codex en el teléfono. La PC debe estar encendida y conectada.</p><a className="text-button" href="https://learn.chatgpt.com/docs/remote-connections" target="_blank" rel="noreferrer">Configurar la conexión móvil<ExternalLink size={15} /></a></section>
    </div>;
}
