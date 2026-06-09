import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle, Compass, Target, Trophy, Wallet2 } from 'lucide-react';
import { financeService } from '../../services/finance';

const currencyFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatMoney = (value: number) => {
    const sign = value < 0 ? '-' : '';
    return `${sign}$${currencyFormatter.format(Math.abs(value))}`;
};

const dailyQuotes = [
    'No estas construyendo dinero. Estas construyendo tranquilidad.',
    'Cada peso con direccion es una decision a favor de tu futuro.',
    'La disciplina no se siente grande cada dia, pero cambia todo con el tiempo.',
    'Tu patrimonio es una historia. Hoy escribes una linea mas.',
    'La libertad financiera empieza cuando tu dinero deja de vivir en automatico.',
];

const ceoQuestions = [
    'Mi patrimonio aumento esta semana',
    'Gaste por necesidad, no por impulso',
    'Mi negocio avanzo al menos un paso',
    'Entrene las veces que prometi',
    'Lei al menos 50 paginas esta semana',
];

function financialLevel(score: number) {
    if (score >= 85) return { level: 5, name: 'Arquitecto' };
    if (score >= 70) return { level: 4, name: 'Constructor' };
    if (score >= 55) return { level: 3, name: 'Ordenado' };
    if (score >= 40) return { level: 2, name: 'En control' };
    return { level: 1, name: 'Despertar' };
}

export function FinancialLifePage() {
    const [answers, setAnswers] = useState<boolean[]>(() => ceoQuestions.map(() => false));
    const { data: summary, isLoading } = useQuery({
        queryKey: ['summary', 'financial-life'],
        queryFn: () => financeService.getSummary(),
    });

    const quote = useMemo(() => {
        const day = new Date().getDate();
        return dailyQuotes[day % dailyQuotes.length];
    }, []);

    const score = summary?.financial_score.total ?? 0;
    const level = financialLevel(score);
    const weeklyScore = answers.filter(Boolean).length;

    const toggleAnswer = (index: number) => {
        setAnswers((current) => current.map((value, currentIndex) => currentIndex === index ? !value : value));
    };

    return (
        <div className="max-w-5xl mx-auto pb-12 space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">Mi vida financiera</h1>
                <p className="text-[var(--text-secondary)] mt-1">Una foto simple de la vida que estas construyendo.</p>
            </header>

            {isLoading ? (
                <div className="h-40 flex items-center justify-center text-[var(--text-secondary)]">Cargando datos...</div>
            ) : (
                <>
                    <section className="bg-[var(--bg-secondary)] border border-brand-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                            <div>
                                <p className="text-sm font-medium text-[var(--text-secondary)]">Nivel financiero</p>
                                <h2 className="text-4xl font-bold text-[var(--text-primary)] mt-2">Nivel {level.level}</h2>
                                <p className="text-xl text-brand-700 font-semibold mt-1">{level.name}</p>
                            </div>
                            <div className="h-24 w-24 rounded-full bg-brand-50 text-brand-700 flex flex-col items-center justify-center border border-brand-200">
                                <Trophy size={28} />
                                <span className="font-bold mt-1">{score}/100</span>
                            </div>
                        </div>
                    </section>

                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[var(--bg-secondary)] border border-brand-200 rounded-2xl p-5 shadow-sm">
                            <p className="text-sm text-[var(--text-secondary)]">Edad</p>
                            <p className="text-2xl font-bold mt-1">{summary?.financial_life.age ?? 'Sin dato'}</p>
                        </div>
                        <div className="bg-[var(--bg-secondary)] border border-brand-200 rounded-2xl p-5 shadow-sm">
                            <p className="text-sm text-[var(--text-secondary)]">Patrimonio</p>
                            <p className="text-2xl font-bold mt-1">{formatMoney(Number(summary?.net_worth || 0))}</p>
                        </div>
                        <div className="bg-[var(--bg-secondary)] border border-brand-200 rounded-2xl p-5 shadow-sm">
                            <p className="text-sm text-[var(--text-secondary)]">Deudas</p>
                            <p className="text-2xl font-bold mt-1 text-red-500">{formatMoney(Number(summary?.total_debt || 0))}</p>
                        </div>
                        <div className="bg-[var(--bg-secondary)] border border-brand-200 rounded-2xl p-5 shadow-sm">
                            <p className="text-sm text-[var(--text-secondary)]">Liquidez</p>
                            <p className="text-2xl font-bold mt-1">{formatMoney(Number(summary?.liquid_balance || 0))}</p>
                        </div>
                        <div className="bg-[var(--bg-secondary)] border border-brand-200 rounded-2xl p-5 shadow-sm">
                            <p className="text-sm text-[var(--text-secondary)]">Fondo emergencia</p>
                            <p className="text-2xl font-bold mt-1">
                                {summary?.emergency_fund.months ? `${Number(summary.emergency_fund.months).toFixed(1)} meses` : 'Sin estimar'}
                            </p>
                        </div>
                        <div className="bg-[var(--bg-secondary)] border border-brand-200 rounded-2xl p-5 shadow-sm">
                            <p className="text-sm text-[var(--text-secondary)]">Fuentes activas / pasivas</p>
                            <p className="text-2xl font-bold mt-1">
                                {summary?.financial_life.active_income_sources ?? 0} / {summary?.financial_life.passive_income_sources ?? 0}
                            </p>
                        </div>
                        <div className="bg-[var(--bg-secondary)] border border-brand-200 rounded-2xl p-5 shadow-sm">
                            <p className="text-sm text-[var(--text-secondary)]">Horas trabajadas estimadas</p>
                            <p className="text-2xl font-bold mt-1">{summary?.financial_life.weekly_work_hours ? `${summary.financial_life.weekly_work_hours}/semana` : 'Sin dato'}</p>
                        </div>
                        <div className="bg-[var(--bg-secondary)] border border-brand-200 rounded-2xl p-5 shadow-sm">
                            <p className="text-sm text-[var(--text-secondary)]">Meta actual</p>
                            <p className="text-2xl font-bold mt-1">{summary?.financial_life.current_goal || 'Eliminar deudas'}</p>
                        </div>
                    </section>

                    <section className="bg-[var(--bg-secondary)] border border-brand-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <Compass className="text-brand-700" size={24} />
                            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Frase de hoy</h2>
                        </div>
                        <p className="text-2xl font-semibold leading-relaxed text-[var(--text-primary)]">"{quote}"</p>
                    </section>

                    <section className="bg-[var(--bg-secondary)] border border-brand-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                            <div className="flex items-center gap-3">
                                <Target className="text-brand-700" size={24} />
                                <h2 className="text-xl font-semibold text-[var(--text-primary)]">CEO de mi vida</h2>
                            </div>
                            <span className="text-sm font-semibold text-brand-700">{weeklyScore}/5 esta semana</span>
                        </div>
                        <div className="space-y-3">
                            {ceoQuestions.map((question, index) => (
                                <button
                                    key={question}
                                    type="button"
                                    onClick={() => toggleAnswer(index)}
                                    className="w-full flex items-center gap-3 rounded-xl border border-brand-100 px-4 py-3 text-left hover:bg-[var(--bg-hover)] transition-colors"
                                >
                                    {answers[index] ? <CheckCircle2 className="text-green-600" size={20} /> : <Circle className="text-[var(--text-secondary)]" size={20} />}
                                    <span className="text-sm font-medium text-[var(--text-primary)]">{question}</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="bg-brand-700 text-white rounded-2xl p-6 shadow-sm flex items-start gap-4">
                        <Wallet2 size={28} className="shrink-0 mt-1" />
                        <p className="text-xl font-semibold leading-relaxed">Hoy actue como la persona que quiero ser dentro de 10 anos.</p>
                    </section>
                </>
            )}
        </div>
    );
}
