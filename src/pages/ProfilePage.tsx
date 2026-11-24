import { useState } from 'react';
import {
  ArrowRight,
  Award,
  Download,
  Loader2,
  Printer,
  Star,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { ConsistencyHeatmap30 } from '../components/ConsistencyHeatmap30';
import { DailyGoalHearts } from '../components/DailyGoalHearts';
import { FlamingIcon } from '../components/FlamingIcon';
import { LanguageIcon } from '../components/LanguageIcon';
import { RankBadge } from '../components/RankIcon';
import { StreakCalendar } from '../components/StreakCalendar';
import { useAppAuth } from '../context/AppAuthContext';
import { LANGUAGE_MAP } from '../data/languages';
import type { CertificateRecord } from '../types/curriculum';
import {
  calculateTrackProgress,
  computeDailyGoalProgress,
  computeLearningStats,
} from '../utils/curriculumLogic';
import { resolveProgressRank } from '../utils/rankSystem';

function buildCertificateSvg(cert: CertificateRecord): string {
  const langName = LANGUAGE_MAP[cert.language].name;
  const dateText = new Date(cert.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const starsMarkup = Array.from({ length: 5 })
    .map((_, i) => {
      const x = 332 + i * 28;
      const fill = i < cert.stars ? '#F59E0B' : '#E2E8F0';
      return `<polygon points="${x},262 ${x + 5},272 ${x + 16},274 ${x + 8},281 ${x + 10},292 ${x},287 ${x - 10},292 ${x - 8},281 ${x - 16},274 ${x - 5},272" fill="${fill}"/>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520">
  <rect width="800" height="520" rx="24" fill="#FFFFFF"/>
  <rect x="20" y="20" width="760" height="480" rx="18" fill="none" stroke="#CBD5E1" stroke-width="2"/>
  <rect x="32" y="32" width="736" height="456" rx="12" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1"/>
  <text x="64" y="88" font-family="sans-serif" font-size="22" font-weight="700" fill="#0F172A">recurry</text>
  <text x="736" y="88" text-anchor="end" font-family="monospace" font-size="13" fill="#2563EB">${cert.certificateCode}</text>
  <text x="400" y="148" text-anchor="middle" font-family="monospace" font-size="12" font-weight="600" fill="#64748B">CERTIFICATE OF COMPLETION</text>
  <text x="400" y="196" text-anchor="middle" font-family="sans-serif" font-size="34" font-weight="700" fill="#0F172A">@${cert.username}</text>
  <text x="400" y="234" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#475569">${langName} · ${cert.trackTitle.replace(/[<>&]/g, '')}</text>
  ${starsMarkup}
  <text x="400" y="330" text-anchor="middle" font-family="monospace" font-size="15" font-weight="700" fill="#0F172A">${cert.stars}/5 Stars · ${cert.accuracyPercent}% Problem-Solving Accuracy</text>
  <text x="400" y="362" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#64748B">${cert.completedModulesCount} Modules Completed · Issued ${dateText}</text>
  <line x1="220" y1="420" x2="580" y2="420" stroke="#CBD5E1" stroke-width="1.5"/>
  <text x="400" y="446" text-anchor="middle" font-family="monospace" font-size="11" fill="#64748B">VERIFIED BY RECURRY SYNTAX PLATFORM</text>
</svg>`;
}

type ProfileTab = 'streaks' | 'certificates';

export function ProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: ProfileTab =
    searchParams.get('tab') === 'certificates' ? 'certificates' : 'streaks';

  const {
    profile,
    tracks,
    certificates,
    activityCounts,
    activeTrack,
    issueTrackCertificate,
  } = useAppAuth();
  const [issuingId, setIssuingId] = useState<string | null>(null);

  const completedModuleIds = profile?.completedModuleIds ?? [];
  const moduleCompletedAt = profile?.moduleCompletedAt ?? {};
  const practicedDates = Object.values(profile?.moduleAccuracy ?? {})
    .map((entry) => entry.lastPracticedDate)
    .filter((d): d is string => Boolean(d));

  const stats = computeLearningStats(
    tracks,
    completedModuleIds,
    moduleCompletedAt,
    new Date(),
    practicedDates,
  );
  const dailyGoal = computeDailyGoalProgress(
    moduleCompletedAt,
    profile?.dailyModuleGoal ?? 2,
  );
  const rankProgress = resolveProgressRank(
    activeTrack,
    completedModuleIds,
    profile?.skillLevel ?? 'noob',
  );

  const issuedTrackIds = new Set(certificates.map((c) => c.trackId));
  const claimableTracks = tracks.filter((t) => {
    const prog = calculateTrackProgress(t, completedModuleIds);
    return prog.totalCount > 0 && prog.percentage === 100 && !issuedTrackIds.has(t.id);
  });

  function setTab(next: ProfileTab) {
    setSearchParams({ tab: next }, { replace: true });
  }

  function handleDownloadSvg(cert: CertificateRecord) {
    const svgContent = buildCertificateSvg(cert);
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cert.certificateCode.toLowerCase()}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Compact Profile Identity & Metrics */}
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
              @{profile?.username ?? 'Learner'}
            </h1>
            <RankBadge
              rank={rankProgress.rank}
              progressPercent={rankProgress.progressPercent}
              hasActiveTrack={rankProgress.hasActiveTrack}
              size="sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-slate-800 tabular-nums dark:text-neutral-200">
              <FlamingIcon active={stats.currentStreak > 0} className="h-4 w-4" />
              <span>{stats.currentStreak}d streak</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <DailyGoalHearts
                completedToday={dailyGoal.completedToday}
                dailyGoal={dailyGoal.dailyGoal}
                size="sm"
              />
            </span>
            <span className="font-mono tabular-nums">
              {stats.completedModules} modules · {certificates.length} awards
            </span>
          </div>
        </div>

        {activeTrack && (
          <Link
            to={`/app/learn/${encodeURIComponent(activeTrack.id)}`}
            className="btn-juice inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <span>Practice</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </section>

      {/* Clean Underline Switch: Streaks | Certificates */}
      <div
        role="tablist"
        aria-label="Profile sections"
        className="flex items-center justify-between border-b border-slate-200/80 dark:border-neutral-800"
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'streaks'}
            onClick={() => setTab('streaks')}
            className={`-mb-px cursor-pointer border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === 'streaks'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            Streaks
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'certificates'}
            onClick={() => setTab('certificates')}
            className={`-mb-px inline-flex cursor-pointer items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === 'certificates'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            <span>Certificates</span>
            {(certificates.length > 0 || claimableTracks.length > 0) && (
              <span className="font-mono text-[11px] opacity-75 tabular-nums">
                {certificates.length + claimableTracks.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'certificates' && certificates.length > 0 && (
          <button
            type="button"
            onClick={() => window.print()}
            aria-label="Print certificates"
            title="Print certificates"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 print:hidden dark:text-neutral-400 dark:hover:bg-[#222222] dark:hover:text-white"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'streaks' ? (
        <div key="streaks" className="animate-view-enter space-y-6">
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-[#181818]">
            <div className="flex items-center gap-3.5">
              <DailyGoalHearts
                completedToday={dailyGoal.completedToday}
                dailyGoal={dailyGoal.dailyGoal}
                size="lg"
              />
              <div>
                <div className="text-sm font-semibold text-slate-950 dark:text-white">
                  {dailyGoal.isGoalMet
                    ? 'Daily goal reached'
                    : `${dailyGoal.remaining} more to fill today's hearts`}
                </div>
              </div>
            </div>

            <Link
              to="/app/settings"
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-slate-100 dark:text-blue-400 dark:hover:bg-[#222222]"
            >
              Adjust in Settings
            </Link>
          </section>

          <StreakCalendar
            activityCounts={activityCounts}
            dailyGoal={profile?.dailyModuleGoal ?? 2}
          />

          <ConsistencyHeatmap30
            activityCounts={activityCounts}
            dailyGoal={profile?.dailyModuleGoal ?? 2}
          />
        </div>
      ) : (
        <div key="certificates" className="animate-view-enter space-y-6">
          {claimableTracks.length > 0 && (
            <section className="space-y-2.5">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                Ready to claim
              </h2>
              <div className="space-y-2">
                {claimableTracks.map((track) => (
                  <div
                    key={track.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 dark:border-neutral-800 dark:bg-[#181818]"
                  >
                    <div className="flex items-center gap-3">
                      <LanguageIcon language={track.language} className="h-6 w-6" />
                      <div>
                        <div className="font-display text-sm font-bold text-slate-950 dark:text-white">
                          {track.title}
                        </div>
                        <div className="font-mono text-xs text-slate-500 dark:text-neutral-400">
                          {track.modules.length}/{track.modules.length} modules
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={issuingId === track.id}
                      onClick={async () => {
                        setIssuingId(track.id);
                        try {
                          await issueTrackCertificate(track);
                        } finally {
                          setIssuingId(null);
                        }
                      }}
                      className="btn-juice inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-amber-500 px-4 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                    >
                      {issuingId === track.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Award className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>Claim</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {certificates.length === 0 && claimableTracks.length === 0 ? (
            <section className="rounded-xl border border-slate-200/80 bg-white p-10 text-center dark:border-neutral-800 dark:bg-[#181818]">
              <Award
                className="mx-auto h-8 w-8 text-slate-400 dark:text-neutral-500"
                aria-hidden="true"
              />
              <h2 className="mt-3 font-display text-base font-bold text-slate-950 dark:text-white">
                No certificates yet
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                Complete a curriculum to earn a star-ranked certificate.
              </p>
              <Link
                to="/app/curriculums"
                className="btn-juice mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <span>Open Curriculums</span>
              </Link>
            </section>
          ) : (
            <div className="space-y-4">
              {certificates.map((cert) => {
                const langMeta = LANGUAGE_MAP[cert.language];
                const dateFormatted = new Date(cert.issuedAt).toLocaleDateString(
                  'en-US',
                  { year: 'numeric', month: 'short', day: 'numeric' },
                );

                return (
                  <article
                    key={cert.id}
                    className="rounded-xl border border-slate-200/80 bg-white p-6 dark:border-neutral-800 dark:bg-[#181818]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3.5 dark:border-neutral-800/80">
                      <div className="flex items-center gap-2.5">
                        <LanguageIcon language={cert.language} className="h-5 w-5" />
                        <div className="font-display text-sm font-bold text-slate-950 dark:text-white">
                          recurry · {langMeta.name}
                        </div>
                      </div>
                      <span className="font-mono text-xs text-slate-400 dark:text-neutral-500">
                        {cert.certificateCode}
                      </span>
                    </div>

                    <div className="py-6 text-center">
                      <h2 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
                        @{cert.username}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600 dark:text-neutral-300">
                        {cert.trackTitle}
                      </p>

                      <div
                        className="mt-4 flex items-center justify-center gap-1"
                        aria-label={`Rated ${cert.stars} out of 5 stars`}
                      >
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={idx}
                            className={`h-4.5 w-4.5 ${
                              idx < cert.stars
                                ? 'fill-amber-400 text-amber-500'
                                : 'text-slate-200 dark:text-neutral-700'
                            }`}
                            aria-hidden="true"
                          />
                        ))}
                      </div>

                      <div className="mt-2 font-mono text-xs text-slate-500 tabular-nums dark:text-neutral-400">
                        {cert.accuracyPercent}% accuracy · {cert.completedModulesCount} modules
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs text-slate-400 dark:border-neutral-800/80 dark:text-neutral-500">
                      <span className="font-mono">{dateFormatted}</span>
                      <button
                        type="button"
                        onClick={() => handleDownloadSvg(cert)}
                        aria-label={`Download ${cert.trackTitle} certificate SVG`}
                        title="Download SVG"
                        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 print:hidden dark:text-neutral-300 dark:hover:bg-[#242424] dark:hover:text-white"
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>SVG</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
