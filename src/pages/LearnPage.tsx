import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Code2,
  Loader2,
  Play,
  RotateCcw,
  Star,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { InlineCodeText } from '../components/InlineCodeText';
import { LanguageIcon } from '../components/LanguageIcon';
import { WorkbenchView } from '../components/WorkbenchView';
import { useAppAuth } from '../context/AppAuthContext';
import { LANGUAGE_MAP, SKILL_LEVELS } from '../data/languages';
import {
  calculateTrackProgress,
  computeTrackAccuracyAndStars,
} from '../utils/curriculumLogic';

export function LearnPage() {
  const { trackId } = useParams<{ trackId?: string }>();
  const navigate = useNavigate();

  const {
    profile,
    tracks,
    certificates,
    activeTrack,
    activeModuleId,
    selectTrackAndModule,
    toggleModuleComplete,
    recordChallengeAttempt,
    saveModuleDeepDive,
    redoTrack,
    issueTrackCertificate,
    getIdToken,
  } = useAppAuth();

  const [mode, setMode] = useState<'overview' | 'workbench'>('overview');
  const [issuingCert, setIssuingCert] = useState(false);

  const selectedTrack = trackId
    ? tracks.find((t) => t.id === trackId) ?? activeTrack
    : activeTrack;

  useEffect(() => {
    if (selectedTrack && activeTrack?.id !== selectedTrack.id) {
      void selectTrackAndModule(
        selectedTrack.id,
        selectedTrack.modules[0]?.id ?? null,
      );
    }
  }, [selectedTrack, activeTrack?.id, selectTrackAndModule]);

  if (!selectedTrack) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-slate-950">
            No curriculum selected
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Generate or choose a curriculum to start learning.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/generate"
              className="btn-juice inline-flex min-h-11 items-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
            >
              <span>Create Curriculum</span>
            </Link>
            <Link
              to="/app/curriculums"
              className="btn-juice inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700"
            >
              <span>My Curriculums</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const completedModuleIds = profile?.completedModuleIds ?? [];
  const moduleAccuracy = profile?.moduleAccuracy ?? {};
  const completedSet = new Set(completedModuleIds);
  const progress = calculateTrackProgress(selectedTrack, completedModuleIds);
  const accuracy = computeTrackAccuracyAndStars(
    selectedTrack,
    moduleAccuracy,
    completedModuleIds,
  );
  const existingCert = certificates.find((c) => c.trackId === selectedTrack.id);
  const langMeta = LANGUAGE_MAP[selectedTrack.language];
  const skillLabel =
    SKILL_LEVELS.find((s) => s.id === selectedTrack.skillLevel)?.label ??
    selectedTrack.skillLevel;

  async function handleClaimCertificate() {
    if (!selectedTrack) return;
    setIssuingCert(true);
    try {
      await issueTrackCertificate(selectedTrack);
      navigate('/app/certificates');
    } finally {
      setIssuingCert(false);
    }
  }

  if (mode === 'workbench') {
    return (
      <WorkbenchView
        activeTrack={selectedTrack}
        activeModuleId={activeModuleId}
        completedModuleIds={completedModuleIds}
        getIdToken={getIdToken}
        onBackToPath={() => setMode('overview')}
        onStartBuilder={() => navigate('/generate')}
        onSelectModule={(modId) => {
          void selectTrackAndModule(selectedTrack.id, modId);
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
        onToggleComplete={(modId, val) => void toggleModuleComplete(modId, val)}
        onRecordAttempt={(modId, passed) => void recordChallengeAttempt(modId, passed)}
        onSaveDeepDive={(tid, modId, dd) => void saveModuleDeepDive(tid, modId, dd)}
      />
    );
  }

  const nextModule =
    selectedTrack.modules.find((m) => m.id === progress.nextModuleId) ??
    selectedTrack.modules[0];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/app/curriculums"
          className="btn-juice inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>My Curriculums</span>
        </Link>

        <button
          type="button"
          onClick={() => void redoTrack(selectedTrack.id)}
          className="btn-juice inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Redo Track</span>
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <LanguageIcon language={selectedTrack.language} className="mt-1 h-8 w-8" />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-blue-700">
                <span className="font-semibold">
                  {langMeta.name} · {langMeta.standardLabel}
                </span>
                <span>·</span>
                <span>{skillLabel}</span>
              </div>
              <h1 className="font-display text-2xl font-bold text-slate-950 sm:text-3xl">
                {selectedTrack.title}
              </h1>
              <p className="text-sm text-slate-600">{selectedTrack.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Track Progress</span>
            <span className="font-mono tabular-nums">
              {progress.completedCount}/{progress.totalCount} · {progress.percentage}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progress.percentage === 100 ? 'bg-emerald-600' : 'bg-blue-600'
              }`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          {nextModule && (
            <div className="pt-2">
              <button
                type="button"
                onClick={async () => {
                  await selectTrackAndModule(selectedTrack.id, nextModule.id);
                  setMode('workbench');
                }}
                className="btn-juice inline-flex min-h-12 items-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                <span>
                  {progress.completedCount === 0
                    ? `Start: ${nextModule.title}`
                    : progress.percentage === 100
                      ? `Review: ${nextModule.title}`
                      : `Continue: ${nextModule.title}`}
                </span>
              </button>
            </div>
          )}
        </div>
      </section>

      {progress.percentage === 100 && (
        <section className="flex flex-col items-start justify-between gap-4 rounded-2xl border-2 border-amber-400 bg-white p-6 sm:flex-row sm:items-center">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < accuracy.stars
                      ? 'fill-amber-400 text-amber-500'
                      : 'text-slate-300'
                  }`}
                  aria-hidden="true"
                />
              ))}
              <span className="ml-1 font-mono text-xs font-bold text-amber-900 tabular-nums">
                {accuracy.accuracyPercent}% Accuracy · {accuracy.stars}/5 Stars
              </span>
            </div>
            <h2 className="font-display text-lg font-bold text-slate-950">
              Curriculum complete!
            </h2>
            <p className="text-xs text-slate-600">
              {existingCert
                ? 'Your certificate has been issued to your Certificates vault.'
                : 'Generate your star-ranked certificate based on your problem-solving accuracy.'}
            </p>
          </div>

          {existingCert ? (
            <Link
              to="/app/certificates"
              className="btn-juice inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border-b-2 border-amber-700 bg-amber-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-600"
            >
              <Award className="h-4 w-4" aria-hidden="true" />
              <span>View Certificate</span>
            </Link>
          ) : (
            <button
              type="button"
              disabled={issuingCert}
              onClick={() => void handleClaimCertificate()}
              className="btn-juice inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border-b-2 border-amber-700 bg-amber-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-60"
            >
              {issuingCert ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Award className="h-4 w-4" aria-hidden="true" />
              )}
              <span>Claim Certificate</span>
            </button>
          )}
        </section>
      )}

      <ul className="space-y-3">
        {selectedTrack.modules.map((mod) => {
          const isDone = completedSet.has(mod.id);
          const isNext = !isDone && mod.id === progress.nextModuleId;
          const modAcc = moduleAccuracy[mod.id];
          const CornerIcon = isDone ? CheckCircle2 : isNext ? Play : Code2;

          return (
            <li
              key={mod.id}
              className={`relative overflow-hidden rounded-2xl border bg-white p-5 ${
                isNext
                  ? 'border-blue-600'
                  : isDone
                    ? 'border-emerald-500'
                    : 'border-slate-200'
              }`}
            >
              <CornerIcon
                aria-hidden="true"
                className={`pointer-events-none absolute -right-3 -bottom-4 h-20 w-20 -rotate-12 ${
                  isDone
                    ? 'text-emerald-600 opacity-[0.09]'
                    : isNext
                      ? 'text-blue-600 opacity-[0.09]'
                      : 'text-slate-400 opacity-[0.08]'
                }`}
              />
              <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {mod.estimatedMinutes}m
                    </span>
                    {modAcc && modAcc.attempts > 0 && (
                      <>
                        <span>·</span>
                        <span className="font-mono font-semibold text-blue-700 tabular-nums">
                          {modAcc.bestAccuracy}% accuracy
                        </span>
                      </>
                    )}
                  </div>
                  <h3 className="font-display text-base font-bold text-slate-950">
                    {mod.title}
                  </h3>
                  <p className="text-sm text-slate-600">
                    <InlineCodeText text={mod.summary} />
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:shrink-0">
                  <button
                    type="button"
                    onClick={() => void toggleModuleComplete(mod.id)}
                    aria-pressed={isDone}
                    className={`btn-juice inline-flex min-h-10 items-center gap-1.5 rounded-xl border bg-white px-3 py-2 text-xs font-semibold ${
                      isDone
                        ? 'border-emerald-500 text-emerald-800'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <CheckCircle2
                      className={`h-4 w-4 ${isDone ? 'text-emerald-600' : 'text-slate-400'}`}
                      aria-hidden="true"
                    />
                    <span>{isDone ? 'Done' : 'Complete'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await selectTrackAndModule(selectedTrack.id, mod.id);
                      setMode('workbench');
                    }}
                    className={`btn-juice group inline-flex min-h-10 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold ${
                      isNext
                        ? 'border-b-2 border-blue-800 bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>{isNext ? 'Start' : 'Open'}</span>
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
