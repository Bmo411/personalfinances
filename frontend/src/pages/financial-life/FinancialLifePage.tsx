import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Brain, Briefcase, CheckCircle2, Circle, Clock, Compass, Target, Trophy, UserRound, Wallet2 } from 'lucide-react';
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
    'Ordenar tu dinero es ordenar una parte de tu vida.',
    'La meta no es parecer rico. La meta es vivir con menos miedo.',
    'Un gasto pequeno repetido tambien cuenta una historia.',
    'Tu yo del futuro vive de las decisiones que tomas hoy.',
    'El ahorro no es castigo. Es margen de maniobra.',
    'La tranquilidad tambien se presupuesta.',
    'Cada deuda que baja te devuelve un poco de aire.',
    'El dinero sin plan se vuelve ruido.',
    'No necesitas hacerlo perfecto. Necesitas hacerlo visible.',
    'Lo que mides deja de esconderse.',
    'Un buen mes no se improvisa, se dirige.',
    'Tu liquidez es tu espacio para respirar.',
    'El patrimonio crece primero en silencio.',
    'Cada ingreso merece una mision.',
    'Gastar con conciencia tambien es cuidarte.',
    'El progreso financiero suele verse aburrido antes de verse enorme.',
    'La constancia vence al impulso casi siempre.',
    'No estas pagando deudas. Estas comprando libertad.',
    'Un presupuesto no limita tu vida. La enfoca.',
    'La paz financiera empieza con saber donde estas parado.',
    'Tu dinero debe trabajar para tu calma, no contra ella.',
    'Un peso ahorrado hoy puede ser una opcion manana.',
    'La riqueza real es tener opciones.',
    'No subestimes una semana bien administrada.',
    'Tu sistema financiero debe ser mas fuerte que tu animo del dia.',
    'La claridad baja la ansiedad.',
    'Lo necesario te sostiene. Lo impulsivo te distrae.',
    'Cada salida puede disfrutarse mas cuando ya tiene presupuesto.',
    'Pagar a tiempo tambien es construir autoestima.',
    'La disciplina es una forma de respeto propio.',
    'Tu patrimonio no juzga. Solo refleja.',
    'Haz que tu dinero sepa a donde ir antes de que llegue.',
    'La libertad se construye en transferencias pequenas.',
    'Tener control no significa no gastar. Significa decidir.',
    'El fondo de emergencia es tranquilidad guardada.',
    'Hoy puedes mejorar tu futuro sin cambiar toda tu vida.',
    'Un buen habito financiero reduce mil preocupaciones.',
    'El ingreso importa, pero la direccion importa mas.',
    'La deuda se vence con plan, no con culpa.',
    'Un mes ordenado cambia la conversacion contigo mismo.',
    'Tu vida financiera necesita menos drama y mas seguimiento.',
    'Cuando sabes tus numeros, recuperas poder.',
    'La meta no es solo tener mas. Es necesitar menos urgencia.',
    'Cada pago registrado es una luz prendida.',
    'No esperes sentir motivacion para hacer lo correcto.',
    'La seguridad financiera es una obra lenta y valiosa.',
    'Tu futuro no necesita perfeccion. Necesita repeticion.',
    'La liquidez es libertad de movimiento.',
    'El ahorro pequeno tambien entrena identidad.',
    'No confundas ingreso alto con vida estable.',
    'Tu tranquilidad vale mas que una compra impulsiva.',
    'El mejor presupuesto es el que puedes sostener.',
    'Gastar menos de lo que entra sigue siendo una idea poderosa.',
    'La claridad financiera es una forma de autocuidado.',
    'Un dia sin gasto impulsivo tambien es una victoria.',
    'Tu dinero debe acercarte a la persona que quieres ser.',
    'Si lo registras, lo puedes mejorar.',
    'Los grandes cambios empiezan pareciendo ajustes pequenos.',
    'No estas atrasado. Estas tomando control.',
    'La paciencia tambien paga intereses.',
    'Tu patrimonio necesita tiempo y direccion.',
    'Cada decision pequena vota por una vida mas estable.',
    'Un saldo bajo con plan es mejor que un saldo alto sin rumbo.',
    'El dinero pendiente no es liquidez hasta que llega.',
    'Planea tus pagos antes de que ellos planeen tu semana.',
    'La libertad financiera empieza con honestidad financiera.',
    'Tu app no guarda numeros. Guarda decisiones.',
    'Un ingreso fijo bien asignado cambia el mes completo.',
    'El control financiero se construye antes de la emergencia.',
    'No todo gasto es problema. El gasto sin conciencia si.',
    'La calma de manana se financia hoy.',
    'Tu presupuesto es una conversacion con tus prioridades.',
    'Construir patrimonio es construir confianza.',
    'Las deudas bajan mas rapido cuando dejan de ser invisibles.',
    'Cada corte de tarjeta anticipado evita una sorpresa.',
    'La meta no es vivir apretado. Es vivir despierto.',
    'El dinero ordenado crea espacio mental.',
    'Un habito repetido vale mas que un arranque perfecto.',
    'Tu progreso financiero tambien merece celebrarse.',
    'La vida que quieres necesita sistemas, no solo ganas.',
    'Tus numeros no son tu valor. Son tu tablero.',
    'La estabilidad se arma una decision a la vez.',
    'Cada ahorro es una pequena frontera contra el caos.',
    'El futuro se vuelve mas ligero cuando lo preparas.',
    'Un buen registro convierte culpa en informacion.',
    'Tu salario no debe desaparecer sin dejar instrucciones.',
    'El gasto necesario sostiene. El gasto impulsivo exige atencion.',
    'La tranquilidad no llega sola. Se agenda.',
    'Controlar tu dinero es recuperar tiempo.',
    'Un mes dificil tambien puede ser un mes bien dirigido.',
    'La consistencia convierte planes en patrimonio.',
    'Si sabes cuanto puedes gastar, disfrutas mejor lo que gastas.',
    'Tu dinero puede ser herramienta, no tension.',
    'Cada deuda pagada cambia la forma en que respiras.',
    'No necesitas mas caos para sentir que avanzas.',
];

const growthQuotes = [
    'La empresa crece cuando tu enfoque deja de dispersarse.',
    'Tu siguiente nivel necesita mejores habilidades, no mas prisa.',
    'El tiempo es el mejor consejero cuando tu sigues trabajando.',
    'Centrarte en ti no es egoismo. Es preparar mejor al lider.',
    'Tu empresa necesita sistemas, criterio y paciencia.',
    'Crecer tambien significa aprender a decir no.',
    'Cada habilidad nueva abre una puerta que antes parecia cerrada.',
    'No busques moverte mas. Busca moverte mejor.',
    'El enfoque es una ventaja competitiva silenciosa.',
    'Tu negocio se expande al ritmo de tu capacidad para sostenerlo.',
    'El tiempo revela que esfuerzos eran reales.',
    'La persona que construyes sostiene la empresa que quieres.',
    'Una empresa fuerte empieza con una mente ordenada.',
    'Hoy estudia algo que manana te ahorre anos de error.',
    'Tu energia es capital. Cuidala como cuidarias dinero.',
    'No todo crecimiento es velocidad. A veces es profundidad.',
    'El lider que te falta se entrena en tus habitos diarios.',
    'La paciencia no es esperar sin hacer. Es construir sin desesperarte.',
    'Enfocarte en ti tambien es enfocarte en tu empresa.',
    'Una habilidad dominada vale mas que diez ideas abandonadas.',
    'El negocio crece cuando tu criterio mejora.',
    'El tiempo castiga la dispersion y premia la constancia.',
    'No compitas por ruido. Compite por calidad.',
    'Tu empresa necesita que pienses con calma y ejecutes con firmeza.',
    'Aprender es expandir tu rango de accion.',
    'El crecimiento real se nota primero en tus decisiones.',
    'La mejor inversion de hoy puede ser tu atencion completa.',
    'Tu futuro empresario se construye cuando nadie te esta viendo.',
    'El tiempo acomoda lo que la ansiedad quiere forzar.',
    'Cada dia enfocado es una pequena expansion.',
    'No creces por desear mas. Creces por volverte capaz de mas.',
    'Tu empresa no necesita perfeccion. Necesita direccion sostenida.',
    'La habilidad que practicas hoy puede pagar tu libertad manana.',
    'El enfoque propio es la base de un negocio sano.',
    'El tiempo es consejero, pero solo ayuda a quien sigue caminando.',
    'Construye una empresa que no dependa de tu caos.',
    'Tu mente es parte de la infraestructura del negocio.',
    'Crecer exige identidad antes que resultados.',
    'Si quieres expandir, primero simplifica.',
    'La calma tambien escala.',
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
        const today = new Date();
        const yearStart = Date.UTC(today.getFullYear(), 0, 0);
        const currentDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
        const dayOfYear = Math.floor((currentDay - yearStart) / 86400000);
        return dailyQuotes[dayOfYear % dailyQuotes.length];
    }, []);

    const growthQuote = useMemo(() => {
        const today = new Date();
        const yearStart = Date.UTC(today.getFullYear(), 0, 0);
        const currentDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
        const dayOfYear = Math.floor((currentDay - yearStart) / 86400000);
        return growthQuotes[(dayOfYear * 7) % growthQuotes.length];
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
                        <div className="flex items-center gap-3 mb-4">
                            <Brain className="text-brand-700" size={24} />
                            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Enfoque de crecimiento</h2>
                        </div>
                        <p className="text-2xl font-semibold leading-relaxed text-[var(--text-primary)]">"{growthQuote}"</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-6">
                            <div className="rounded-xl border border-brand-100 bg-[var(--bg-main)] px-4 py-3">
                                <div className="flex items-center gap-2 text-brand-700 font-semibold">
                                    <Briefcase size={18} />
                                    Empresa
                                </div>
                                <p className="text-sm text-[var(--text-secondary)] mt-2">Expandir con sistemas.</p>
                            </div>
                            <div className="rounded-xl border border-brand-100 bg-[var(--bg-main)] px-4 py-3">
                                <div className="flex items-center gap-2 text-brand-700 font-semibold">
                                    <Brain size={18} />
                                    Habilidades
                                </div>
                                <p className="text-sm text-[var(--text-secondary)] mt-2">Aprender para sostener mas.</p>
                            </div>
                            <div className="rounded-xl border border-brand-100 bg-[var(--bg-main)] px-4 py-3">
                                <div className="flex items-center gap-2 text-brand-700 font-semibold">
                                    <UserRound size={18} />
                                    Yo
                                </div>
                                <p className="text-sm text-[var(--text-secondary)] mt-2">Cuidar enfoque y energia.</p>
                            </div>
                            <div className="rounded-xl border border-brand-100 bg-[var(--bg-main)] px-4 py-3">
                                <div className="flex items-center gap-2 text-brand-700 font-semibold">
                                    <Clock size={18} />
                                    Tiempo
                                </div>
                                <p className="text-sm text-[var(--text-secondary)] mt-2">Construir sin desesperarte.</p>
                            </div>
                        </div>
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
