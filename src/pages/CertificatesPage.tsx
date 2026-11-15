import { useState } from 'react';
import { Award, Download, Loader2, Printer, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LanguageIcon } from '../components/LanguageIcon';
import { useAppAuth } from '../context/AppAuthContext';
import { LANGUAGE_MAP } from '../data/languages';
import type { CertificateRecord } from '../types/curriculum';
import { calculateTrackProgress } from '../utils/curriculumLogic';

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

export function CertificatesPage() {
  const { profile, tracks, certificates, issueTrackCertificate } = useAppAuth();
  const [issuingId, setIssuingId] = useState<string | null>(null);

  const completedModuleIds = profile?.completedModuleIds ?? [];
  const issuedTrackIds = new Set(certificates.map((c) => c.trackId));
  const claimableTracks = tracks.filter((t) => {
    const prog = calculateTrackProgress(t, completedModuleIds);
    return prog.totalCount > 0 && prog.percentage === 100 && !issuedTrackIds.has(t.id);
  });

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
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">
            Certificates
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
            Ranked 1–5 stars by your problem-solving accuracy across track modules.
          </p>
        </div>
        {certificates.length > 0 && (
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-juice inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 print:hidden dark:border-neutral-700 dark:bg-[#181818] dark:text-neutral-200 dark:hover:bg-[#202020]"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Print</span>
          </button>
        )}
      </div>

      {claimableTracks.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-amber-300 bg-white p-5 dark:border-amber-600/80 dark:bg-[#181818]">
          <h2 className="font-display text-base font-bold text-slate-950 dark:text-white">
            Ready to claim
          </h2>
          <div className="space-y-2.5">
            {claimableTracks.map((track) => (
              <div
                key={track.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#202020]"
              >
                <div className="flex items-center gap-3">
                  <LanguageIcon language={track.language} className="h-7 w-7" />
                  <div>
                    <div className="font-display text-sm font-bold text-slate-950 dark:text-white">
                      {track.title}
                    </div>
                    <div className="font-mono text-xs text-slate-500 dark:text-neutral-400">
                      {track.modules.length}/{track.modules.length} modules complete
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
                  className="btn-juice inline-flex min-h-10 items-center gap-1.5 rounded-xl border-b-2 border-amber-700 bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-60"
                >
                  {issuingId === track.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Award className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>Generate Certificate</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {certificates.length === 0 && claimableTracks.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-neutral-800 dark:bg-[#181818]">
          <Award className="mx-auto h-9 w-9 text-slate-400 dark:text-neutral-500" aria-hidden="true" />
          <h2 className="mt-4 font-display text-lg font-bold text-slate-950 dark:text-white">
            No certificates earned yet
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-neutral-300">
            Finish every module in a curriculum to earn a star-ranked certificate.
          </p>
          <Link
            to="/app/curriculums"
            className="btn-juice mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <span>Open Curriculums</span>
          </Link>
        </section>
      ) : (
        <div className="space-y-6">
          {certificates.map((cert) => {
            const langMeta = LANGUAGE_MAP[cert.language];
            const dateFormatted = new Date(cert.issuedAt).toLocaleDateString(
              'en-US',
              { year: 'numeric', month: 'short', day: 'numeric' },
            );

            return (
              <article
                key={cert.id}
                className="rounded-2xl border-2 border-slate-200 bg-white p-6 dark:border-neutral-800 dark:bg-[#181818] sm:p-8"
              >
                <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-neutral-800 dark:bg-[#202020] sm:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-neutral-800">
                    <div className="flex items-center gap-3">
                      <LanguageIcon language={cert.language} className="h-7 w-7" />
                      <div>
                        <div className="font-mono text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                          CERTIFICATE OF COMPLETION
                        </div>
                        <div className="font-display text-lg font-bold text-slate-950 dark:text-white">
                          recurry · {langMeta.name}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-semibold text-slate-700 dark:text-neutral-200">
                      {cert.certificateCode}
                    </span>
                  </div>

                  <div className="py-6 text-center">
                    <p className="text-xs font-medium text-slate-500 dark:text-neutral-400">
                      Awarded to
                    </p>
                    <h2 className="mt-1 font-display text-3xl font-bold text-slate-950 dark:text-white">
                      @{cert.username}
                    </h2>
                    <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-neutral-300">
                      {cert.trackTitle}
                    </p>

                    <div
                      className="mt-5 flex items-center justify-center gap-1.5"
                      aria-label={`Rated ${cert.stars} out of 5 stars`}
                    >
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={`h-6 w-6 ${
                            idx < cert.stars
                              ? 'fill-amber-400 text-amber-500'
                              : 'text-slate-200 dark:text-neutral-700'
                          }`}
                          aria-hidden="true"
                        />
                      ))}
                    </div>

                    <div className="mt-3 font-mono text-xs font-bold text-slate-800 tabular-nums dark:text-neutral-200">
                      {cert.stars}/5 Stars · {cert.accuracyPercent}% Accuracy ·{' '}
                      {cert.completedModulesCount} Modules
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-neutral-800 dark:text-neutral-400">
                    <span className="font-mono">Issued {dateFormatted}</span>
                    <button
                      type="button"
                      onClick={() => handleDownloadSvg(cert)}
                      className="btn-juice inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 hover:border-blue-600 hover:text-blue-700 print:hidden dark:border-neutral-700 dark:bg-[#181818] dark:text-neutral-200 dark:hover:border-blue-500 dark:hover:text-blue-300"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Download SVG</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
