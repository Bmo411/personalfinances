import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Pencil, ArrowUpRight } from 'lucide-react';
import { guide, dateLabel, type GuideRecord } from '../../services/guide';
import { Modal } from '../../components/ui/Modal';
import { RecordForm } from '../../components/guide/RecordForm';

export function MeditationPage() {
    const [editing, setEditing] = useState<GuideRecord | 'new' | null>(null);
    const { data } = useQuery({ queryKey: ['guide', 'today'], queryFn: guide.today });
    const records = useQuery({ queryKey: ['guide', 'meditations'], queryFn: () => guide.list('meditations') });
    return <div className="guide-page"><header className="page-heading"><div><p className="eyebrow">Una práctica cotidiana</p><h1>Meditación</h1></div><button className="primary-button" onClick={() => setEditing('new')}><Plus size={18} />Registrar práctica</button></header>
        {data && <section className="quote-panel meditation-quote"><span className="eyebrow">{dateLabel(data.date)}</span><blockquote>{data.quote.text}</blockquote><p className="quote-source">{data.quote.kind} de {data.quote.author} · {data.quote.work}, {data.quote.passage}</p><a className="text-button" href={data.quote.url} target="_blank" rel="noreferrer">Leer la fuente<ArrowUpRight size={15} /></a><p className="reflection-question">{data.quote.question}</p></section>}
        <div className="section-heading"><h2>{data ? `${data.progress.current.meditation_days} días de práctica esta semana` : 'Tu práctica'}</h2><Link className="subtle-link" to="/preferences">Recordatorio de WhatsApp<ArrowUpRight size={16} /></Link></div>
        {records.isPending && <p className="empty-state">Cargando reflexiones…</p>}{records.isError && <p className="form-error">No se pudieron cargar tus reflexiones.</p>}
        {records.data?.length === 0 && <section className="surface empty-state"><p>Tu primera reflexión empieza aquí.</p><button className="text-button" onClick={() => setEditing('new')}>Registrar unos minutos</button></section>}
        {records.data?.map(record => <article className="surface" key={record.id}><div className="section-heading"><h2>{dateLabel(record.date)}<span className="small-tag ml-3">{record.minutes} min</span></h2><button className="icon-button" aria-label="Editar reflexión" onClick={() => setEditing(record)}><Pencil size={16} /></button></div><p className="record-body">{record.reflection || 'Práctica registrada.'}</p></article>)}
        <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title="Tu práctica de hoy">{editing && <RecordForm resource="meditations" record={editing === 'new' ? undefined : editing} onSuccess={() => setEditing(null)} />}</Modal>
    </div>;
}
