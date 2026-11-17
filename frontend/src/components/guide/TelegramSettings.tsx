import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Send, Check, Unplug } from 'lucide-react';
import { api } from '../../services/api';
import { errorMessage } from '../../services/guide';
import type { UserProfile } from '../../services/finance';

interface Connection { linked: boolean; link?: string; expires_at?: string; bot_username?: string; }
const states: Record<string, string> = { UNCONFIGURED: 'Sin conectar', PENDING: 'Esperando vinculación', CONNECTED: 'Chat conectado', ACCEPTED: 'Envío confirmado por Telegram', CONFIG_REQUIRED: 'Requiere configuración', RATE_LIMITED: 'Límite temporal', FAILED: 'Revisar conexión', UNKNOWN: 'Sin confirmación' };

export function TelegramSettings({ profile, onDisconnect }: { profile: UserProfile; onDisconnect: () => void }) {
    const client = useQueryClient();
    const [token, setToken] = useState('');
    const [connection, setConnection] = useState<Connection | null>(null);
    const [testId, setTestId] = useState(() => crypto.randomUUID());
    const refresh = () => client.invalidateQueries({ queryKey: ['userProfile'] });
    const connect = useMutation({
        mutationFn: async () => (await api.post<Connection>('users/telegram/connect/', token ? { token } : {})).data,
        onSuccess: data => { setToken(''); setConnection(data); setTestId(crypto.randomUUID()); refresh(); },
        onError: refresh,
    });
    const confirm = useMutation({
        mutationFn: async () => (await api.post<Connection>('users/telegram/confirm/')).data,
        onSuccess: data => { setConnection(data); refresh(); }, onError: refresh,
    });
    const disconnect = useMutation({
        mutationFn: () => api.post('users/telegram/disconnect/'),
        onSuccess: () => { setConnection(null); setToken(''); connect.reset(); confirm.reset(); test.reset(); onDisconnect(); refresh(); },
    });
    const test = useMutation({
        mutationFn: async () => (await api.post<{ message: string }>('users/telegram/test/', {}, { headers: { 'Idempotency-Key': testId } })).data,
        onSuccess: refresh, onError: refresh,
    });
    const busy = connect.isPending || confirm.isPending || disconnect.isPending || test.isPending;
    const linked = profile.telegram_connected || connection?.linked;
    const error = connect.error || confirm.error || disconnect.error || test.error;
    return <section className="surface space-y-5">
        <div className="section-heading"><h2>Conectar Telegram</h2><span className="small-tag">{states[profile.telegram_status] || 'Revisar conexión'}</span></div>
        <p className="text-muted">Tu frase diaria llegará al chat privado que vincules aquí. Crea un bot exclusivo para tu guía en <a className="text-button" href="https://t.me/BotFather" target="_blank" rel="noreferrer">@BotFather<ExternalLink size={14} /></a> con el comando /newbot y pega el token que te entregue.</p>
        <label className="field">Token del bot de Telegram<input type="password" autoComplete="new-password" value={token} onChange={event => setToken(event.target.value)} placeholder={profile.telegram_token_configured ? 'Token guardado · escribe para cambiar de bot' : 'Token de @BotFather'} /></label>
        <button className="secondary-button" disabled={busy || (!token && !profile.telegram_token_configured)} onClick={() => { confirm.reset(); test.reset(); connect.mutate(); }}>{connect.isPending ? 'Preparando…' : profile.telegram_connected && !token ? 'Comprobar bot' : 'Preparar enlace de conexión'}</button>
        {connection?.link && !connection.linked && <div className="space-y-4 p-4 border border-brand-200 rounded-lg">
            <p>Abre el enlace en Telegram y pulsa <strong>Iniciar</strong>. El enlace vence en 10 minutos.</p>
            <a className="primary-button" href={connection.link} target="_blank" rel="noreferrer">Abrir @{connection.bot_username}<ExternalLink size={16} /></a>
            <div><button className="secondary-button" disabled={busy} onClick={() => confirm.mutate()}>{confirm.isPending ? 'Comprobando…' : 'Ya pulsé Iniciar · comprobar conexión'}</button></div>
        </div>}
        {linked && <div className="space-y-4"><p className="text-brand-700 flex gap-2 items-center"><Check size={17} />Chat privado vinculado{profile.telegram_bot_username ? ` con @${profile.telegram_bot_username}` : ''}.</p><button className="secondary-button" disabled={busy || test.isSuccess} onClick={() => test.mutate()}><Send size={16} />{test.isPending ? 'Enviando…' : test.isSuccess ? 'Prueba enviada' : 'Enviar frase de prueba'}</button></div>}
        {test.data && <p role="status" className="text-brand-700">{test.data.message}</p>}
        {error && <p role="alert" className="form-error">{errorMessage(error)}</p>}
        {profile.telegram_token_configured && <button className="text-button" disabled={busy} onClick={() => disconnect.mutate()}><Unplug size={15} />Desconectar Telegram y pausar su recordatorio</button>}
    </section>;
}
