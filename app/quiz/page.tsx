'use client';
import {useState} from 'react';
import Link from 'next/link';
import {CheckCircle2, XCircle, Share2, RotateCcw, Trophy} from 'lucide-react';

type Question = {
  q: string;
  options: string[];
  correct: number;
  source: string;
  sourceUrl: string;
};

const QUESTIONS: Question[] = [
  {
    q: 'How many terms did Peter Obi serve as Governor of Anambra State?',
    options: ['One', 'Two', 'Three', 'Four'],
    correct: 1,
    source: 'peterobi.online',
    sourceUrl: 'https://peterobi.online/story/',
  },
  {
    q: 'In what year did Peter Obi leave the Labour Party?',
    options: ['2023', '2024', '2025', '2026'],
    correct: 2,
    source: 'peterobi.online',
    sourceUrl: 'https://peterobi.online/story/',
  },
  {
    q: 'How many votes did Peter Obi receive in the 2023 presidential election?',
    options: ['4,850,111', '6,101,533', '7,220,904', '8,794,726'],
    correct: 1,
    source: 'peterobi.online',
    sourceUrl: 'https://peterobi.online/story/#movement',
  },
  {
    q: 'How many primary schools were returned to their founding missions in Anambra, in 2011?',
    options: ['180', '540', '1,040', '2,300'],
    correct: 2,
    source: 'Vanguard',
    sourceUrl: 'https://www.vanguardngr.com/2022/07/a-peter-obi-truth-2/amp/',
  },
  {
    q: "Which organisation named Peter Obi Nigeria's best-performing governor on immunisation?",
    options: ['World Health Organization', 'UNICEF', 'The Bill & Melinda Gates Foundation', 'World Bank'],
    correct: 2,
    source: 'Channels TV',
    sourceUrl: 'https://www.channelstv.com/2013/07/06/polio-eradication-bill-gates-foundation-names-obi-best-governor-in-nigeria/',
  },
  {
    q: 'Who is Peter Obi\u2019s running mate on the Nigeria Democratic Congress presidential ticket?',
    options: ['Atiku Abubakar', 'Rabiu Kwankwaso', 'Nasir El-Rufai', 'Yusuf Datti Baba-Ahmed'],
    correct: 1,
    source: 'peterobi.online',
    sourceUrl: 'https://peterobi.online/',
  },
  {
    q: 'What date is Nigeria\u2019s next presidential election set for?',
    options: ['25 February 2027', '16 January 2027', '30 May 2027', '12 June 2027'],
    correct: 1,
    source: 'peterobi.online',
    sourceUrl: 'https://peterobi.online/',
  },
  {
    q: 'How much did the giving ledger record for Christ the King College, Onitsha \u2014 Peter Obi\u2019s old school?',
    options: ['\u20a610m', '\u20a625m', '\u20a650m', '\u20a6120m'],
    correct: 2,
    source: 'Giving Ledger',
    sourceUrl: '/giving/christ-the-king-college-onitsha',
  },
  {
    q: 'How much did the giving ledger record for Borno flood relief?',
    options: ['\u20a610m', '\u20a620m', '\u20a650m', '\u20a6100m'],
    correct: 2,
    source: 'Giving Ledger',
    sourceUrl: '/giving/borno-flood-relief',
  },
  {
    q: "By roughly how much did Anambra's internally generated revenue grow under his governorship (2006\u20132013)?",
    options: ['\u20a61.2bn to \u20a62.5bn', '\u20a64.6bn to \u20a68.7bn', '\u20a610bn to \u20a615bn', '\u20a620bn to \u20a635bn'],
    correct: 1,
    source: 'Dubawa',
    sourceUrl: 'https://dubawa.org/fact-checking-claims-on-igr-performance-in-anambra-kaduna-under-obi-el-rufai/',
  },
];

export default function QuizPage() {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [shared, setShared] = useState(false);

  const question = QUESTIONS[step];

  function choose(i: number) {
    if (selected !== null) return;
    setSelected(i);
    if (i === question.correct) setScore(s => s + 1);
  }

  function next() {
    if (step + 1 >= QUESTIONS.length) {
      setDone(true);
    } else {
      setStep(s => s + 1);
      setSelected(null);
    }
  }

  function restart() {
    setStep(0);
    setSelected(null);
    setScore(0);
    setDone(false);
    setShared(false);
  }

  async function share() {
    const text = `I scored ${score}/${QUESTIONS.length} on the Public Record quiz \u2014 test your knowledge of the sourced record.`;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try {
        await navigator.share({text, url});
        return;
      } catch {
        /* user cancelled or share failed, fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      /* clipboard unavailable, nothing more we can do */
    }
  }

  if (done) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-28 text-center">
        <Trophy className="mx-auto text-[var(--accent)]" size={48} />
        <h1 className="editorial-serif mt-6 text-6xl">
          {score}/{QUESTIONS.length}
        </h1>
        <p className="mt-4 text-lg leading-8 text-[var(--muted)]">
          {score === QUESTIONS.length
            ? "Perfect score \u2014 you know the record cold."
            : score >= QUESTIONS.length * 0.6
            ? 'Solid grasp of the sourced record.'
            : "Worth a look through the full timeline and giving ledger."}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button onClick={share} className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-bold text-[#15130f]">
            <Share2 size={16} /> {shared ? 'Copied!' : 'Share your score'}
          </button>
          <button onClick={restart} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-bold">
            <RotateCcw size={16} /> Try again
          </button>
          <Link href="/timeline" className="rounded-full border border-white/15 px-6 py-3 text-sm font-bold">
            Read the full timeline
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-20">
      <p className="eyebrow">Test your knowledge</p>
      <h1 className="editorial-serif mt-3 text-5xl md:text-6xl">The record quiz.</h1>
      <p className="mt-4 text-[var(--muted)]">Every question is drawn from a sourced, verified fact on this site.</p>

      <div className="mt-10 h-1 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div className="h-full bg-[var(--accent)] transition-all" style={{width: `${((step + (selected !== null ? 1 : 0)) / QUESTIONS.length) * 100}%`}} />
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">
        Question {step + 1} of {QUESTIONS.length}
      </p>

      <h2 className="editorial-serif mt-8 text-3xl leading-tight">{question.q}</h2>

      <div className="mt-8 grid gap-3">
        {question.options.map((opt, i) => {
          const isCorrect = selected !== null && i === question.correct;
          const isWrongPick = selected === i && i !== question.correct;
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={selected !== null}
              className={`flex items-center justify-between border px-5 py-4 text-left text-sm font-semibold transition ${
                isCorrect
                  ? 'border-green-600 bg-green-950/30 text-green-300'
                  : isWrongPick
                  ? 'border-red-800 bg-red-950/30 text-red-300'
                  : 'border-white/15 bg-[var(--surface)] hover:border-[var(--accent)]'
              }`}
            >
              {opt}
              {isCorrect && <CheckCircle2 size={18} />}
              {isWrongPick && <XCircle size={18} />}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/10 pt-6">
          <a href={question.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[var(--accent)]">
            Source: {question.source}
          </a>
          <button onClick={next} className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-bold text-[#15130f]">
            {step + 1 >= QUESTIONS.length ? 'See your score' : 'Next question'}
          </button>
        </div>
      )}
    </main>
  );
}
