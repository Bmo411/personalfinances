import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Upload, Check } from 'lucide-react';
import { api } from '../../services/api';
import { errorMessage, money } from '../../services/guide';

interface Preview { draft_id: string; rows: { type: string; date: string; amount: string; description?: string; account: number | null }[]; warnings: { row: number; message: string }[]; income: string; expense: string; net: string; }
export function ImportsPage() {
    const [csv, setCsv] = useState('');
    const [preview, setPreview] = useState<Preview | null>(null);
    const [completed, setCompleted] = useState<number | null>(null);
    const [fileError, setFileError] = useState('');
    const requestId = useRef(crypto.randomUUID());
    const client = useQueryClient();
    const prepare = useMutation({ mutationFn: async () => (await api.post<Preview>('integrations/imports/preview/', { csv })).data, onSuccess: result => { setPreview(result); setCompleted(null); requestId.current = crypto.randomUUID(); } });
    const confirm = useMutation({ mutationFn: async () => (await api.post(`integrations/imports/${preview?.draft_id}/confirm/`, { confirmed: true }, { headers: { 'Idempotency-Key': requestId.current } })).data, onSuccess: result => { setCompleted(result.count); setPreview(null); client.invalidateQueries(); } });
    async function loadFile(file?: File) {
        if (!file) return;
        if (file.size > 2_000_000) { setFileError('Usa un archivo de hasta 2 MB.'); return; }
        setCsv(await file.text()); setPreview(null); setCompleted(null); setFileError('');
    }
    return <div className="guide-page"><header className="page-heading"><div><p className="eyebrow">Ingresos y egresos por lote</p><h1>Importar movimientos</h1></div></header><section className="surface space-y-4"><p className="text-muted">Carga un CSV o pega sus filas. Revisa los importes y posibles duplicados antes de guardar. Para una lista en lenguaje natural, compártela en el chat conectado al MCP.</p><p className="text-xs text-muted">Encabezados requeridos · type (IN o OUT), amount, date (AAAA-MM-DD), payment_method (CASH, CARD o TRANSFER). Puedes añadir account, category y description. Usa los IDs de tus cuentas y categorías.</p><label className="secondary-button"><Upload size={16} />Cargar CSV<input className="sr-only" type="file" accept=".csv,text/csv" onChange={e => loadFile(e.target.files?.[0])} /></label><label className="field">Contenido CSV<textarea rows={8} value={csv} placeholder={'type,amount,date,payment_method,description\nOUT,120.00,2026-11-16,CASH,Comida'} onChange={e => { setCsv(e.target.value); setPreview(null); setCompleted(null); }} /></label>{fileError && <p className="form-error">{fileError}</p>}{prepare.isError && <p className="form-error">{errorMessage(prepare.error)}</p>}<button className="primary-button" disabled={!csv.trim() || prepare.isPending} onClick={() => prepare.mutate()}>{prepare.isPending ? 'Revisando…' : 'Preparar vista previa'}</button></section>
        {preview && <section className="surface space-y-5"><h2>Revisa {preview.rows.length} movimientos</h2><div className="money-grid"><div><span>Ingresos</span><strong>{money(preview.income)}</strong></div><div><span>Egresos</span><strong>{money(preview.expense)}</strong></div><div><span>Balance</span><strong>{money(preview.net)}</strong></div></div>{preview.warnings.map(warning => <p className="text-warning text-sm" key={warning.row}>Fila {warning.row} · {warning.message}</p>)}<div className="table-scroll"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Cuenta</th><th>Importe</th></tr></thead><tbody>{preview.rows.map((row, index) => <tr key={index}><td>{row.date}</td><td>{row.type === 'IN' ? 'Ingreso' : 'Egreso'}</td><td>{row.description || '—'}</td><td>{row.account ?? 'Sin cuenta'}</td><td>{money(row.amount)}</td></tr>)}</tbody></table></div>{confirm.isError && <p className="form-error">{errorMessage(confirm.error)}</p>}<button className="primary-button" disabled={confirm.isPending} onClick={() => confirm.mutate()}>{confirm.isPending ? 'Guardando…' : 'Confirmar y guardar el lote'}</button></section>}
        {completed !== null && <section className="surface flex items-center gap-4"><Check className="text-brand-700" /><p>Guardados {completed} movimientos.</p><Link to="/history" className="text-button ml-auto">Ver historial</Link></section>}
    </div>;
}
