import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowUpRight, GraduationCap } from 'lucide-react';
import { guide, dateTimeLabel } from '../../services/guide';

function Markdown({ content }: { content: string }) {
    return <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ href, children }) => /^https?:\/\//.test(href || '') ? <a href={href} target="_blank" rel="noreferrer">{children}</a> : <span title="Material disponible en la carpeta de matemáticas">{children}</span>, img: () => null }}>{content}</ReactMarkdown></div>;
}

export function MathPage() {
    const [selected, setSelected] = useState('panel');
    const { data, isPending, isError, refetch } = useQuery({ queryKey: ['guide', 'math'], queryFn: guide.math });
    const student = data?.students.find(item => item.source_id === selected);
    return <div className="guide-page"><header className="page-heading"><div><p className="eyebrow">Taller de matemáticas y pensamiento</p><h1>Clases</h1></div><Link to="/month" className="subtle-link">Programar una clase<ArrowUpRight size={16} /></Link></header>
        {isPending && <p className="empty-state">Cargando panel docente…</p>}
        {isError && <div className="empty-state">No se pudo cargar el panel.<button className="text-button" onClick={() => refetch()}>Reintentar</button></div>}
        {data && !data.updated_at && <section className="surface empty-state"><GraduationCap size={32} /><h2>Conecta tu carpeta de matemáticas</h2><p>El panel aparecerá después de ejecutar la primera sincronización desde tu PC.</p><Link to="/integrations" className="text-button">Configurar la sincronización<ArrowUpRight size={16} /></Link></section>}
        {data?.updated_at && <><div className="flex flex-wrap justify-between gap-2 text-sm text-muted"><span>{data.students.length} alumnos con seguimiento</span><span>Última sincronización {dateTimeLabel(data.updated_at)}</span></div><nav className="tabs" aria-label="Alumnos"><button className={selected === 'panel' ? 'active' : ''} onClick={() => setSelected('panel')}>Panel docente</button>{data.students.map(item => <button key={item.source_id} className={selected === item.source_id ? 'active' : ''} onClick={() => setSelected(item.source_id)}>{item.name}</button>)}<button className={selected === 'plans' ? 'active' : ''} onClick={() => setSelected('plans')}>Planeaciones</button></nav>
            {selected === 'panel' && <section className="surface"><Markdown content={data.panel} /></section>}
            {student && <section className="surface"><Markdown content={student.content} /></section>}
            {selected === 'plans' && (data.plans.length ? data.plans.map(plan => <section className="surface" key={plan.source_id}><p className="eyebrow mb-4">{plan.source_id.replace('/plan_clase.md', '').split('/').join(' · ')}</p><Markdown content={plan.content} /></section>) : <p className="empty-state">Sin planeaciones sincronizadas.</p>)}
            <p className="text-sm text-muted">Los reportes y materiales se actualizan en tu chat de matemáticas. Los enlaces a materiales locales se consultan en esa carpeta.</p>
        </>}
    </div>;
}
