import { resourceLabels } from '../../services/guide';
import { useState } from 'react';
import { Wallet, CheckSquare, NotebookPen, Dumbbell, Utensils, Flower2, Plus, ArrowLeft } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { TransactionForm } from '../transactions/TransactionForm';
import { RecordForm } from './RecordForm';
import type { Resource } from '../../services/guide';

export function Capture() {
    const [open, setOpen] = useState(false);
    const [kind, setKind] = useState<Resource | 'transaction' | null>(null);
    const client = useQueryClient();
    const choices = [
        { key: 'transaction', label: 'Movimiento', icon: Wallet }, { key: 'tasks', label: 'Pendiente', icon: CheckSquare },
        { key: 'notes', label: 'Nota', icon: NotebookPen }, { key: 'workouts', label: 'Entrenamiento', icon: Dumbbell },
        { key: 'meals', label: 'Comida', icon: Utensils }, { key: 'meditations', label: 'Meditación', icon: Flower2 },
    ] as const;
    const close = () => { setOpen(false); setKind(null); };
    const success = () => { client.invalidateQueries(); close(); };
    return <>
        <button className="primary-button" onClick={() => setOpen(true)}><Plus size={18} />Registrar</button>
        <Modal isOpen={open} onClose={close} title={kind === 'transaction' ? 'Movimiento' : kind ? resourceLabels[kind] : '¿Qué quieres registrar?'}>
            {kind && <button className="text-button mb-4" onClick={() => setKind(null)}><ArrowLeft size={16} />Elegir otro registro</button>}
            {!kind && <div className="grid grid-cols-2 gap-3">{choices.map(choice => <button key={choice.key} className="capture-option" onClick={() => setKind(choice.key)}><choice.icon size={24} />{choice.label}</button>)}</div>}
            {kind === 'transaction' && <TransactionForm onSuccess={success} />}
            {kind && kind !== 'transaction' && <RecordForm resource={kind} onSuccess={success} />}
        </Modal>
    </>;
}
