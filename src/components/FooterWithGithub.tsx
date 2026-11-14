import { useState } from 'react';
import { ArrowUpRight, Check, Copy, Terminal } from 'lucide-react';
import { FaGithub } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import { REPO_CLONE_COMMAND, REPO_URL } from '../data/landingContent';

interface FooterWithGithubProps {
  primaryDestination: string;
}

export function FooterWithGithub({ primaryDestination }: FooterWithGithubProps) {
  const [copiedClone, setCopiedClone] = useState(false);

  async function handleCopyClone() {
    try {
      await navigator.clipboard.writeText(REPO_CLONE_COMMAND);
      setCopiedClone(true);
      window.setTimeout(() => setCopiedClone(false), 1600);
    } catch {
      setCopiedClone(false);
    }
  }

  return (
    <footer
      id="github"
      className="relative flex min-h-[85vh] flex-col justify-between overflow-hidden border-t border-slate-200 bg-white text-[#0F172A] scroll-mt-16 lg:min-h-[92vh]"
    >
      {/* Full inverted clouds expanse fading gently across the tall footer so footer floats above the clouds */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[620px] overflow-hidden sm:h-[740px] lg:h-[820px]"
      >
        <img
          src="/assets/images/parallax-clouds.webp"
          alt=""
          className="h-full w-full -scale-y-100 object-cover object-top opacity-95"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white/85 via-38% to-transparent" />
      </div>

      {/* Upper white footer area: Open-source codebase + Navigation */}
      <div className="relative z-10 mx-auto w-full max-w-6xl space-y-10 px-4 pt-12 sm:px-6 lg:px-8 lg:pt-16">
        <div
          id="credits"
          className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center"
        >
          <div className="space-y-1.5">
            <h2 className="font-display text-2xl font-bold text-slate-950 sm:text-3xl">
              Explore the recurry codebase
            </h2>
            <p className="max-w-md text-sm text-slate-600">
              Open-source curriculum engine, syntax lexer, daily goal tracking, and Firestore rules.
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2.5 lg:shrink-0 lg:flex-nowrap lg:justify-end">
            <div className="flex max-w-full min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-[#F7F8FA]/95 px-3 py-2 font-mono text-xs text-slate-700 backdrop-blur-xs">
              <Terminal className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
              <span className="max-w-[200px] truncate sm:max-w-none">
                {REPO_CLONE_COMMAND}
              </span>
              <button
                type="button"
                onClick={() => void handleCopyClone()}
                aria-label="Copy git clone command"
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-sans text-xs font-semibold text-slate-800 transition-colors hover:border-slate-300 hover:text-slate-950"
              >
                {copiedClone ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" aria-hidden="true" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="btn-juice inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-900 hover:border-slate-400 hover:text-slate-950 sm:text-sm"
            >
              <FaGithub className="h-4 w-4 text-slate-950" aria-hidden="true" />
              <span>Open on GitHub</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* Structured Footer Navigation */}
        <div className="grid gap-8 border-t border-slate-200/80 pt-10 sm:grid-cols-2 lg:grid-cols-12">
          <div className="space-y-2.5 lg:col-span-5">
            <Link
              to="/"
              className="font-display text-2xl font-bold tracking-tight text-slate-950"
            >
              recurry
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-slate-600">
              Personalized syntax and problem-solving curriculums across SQL, Java, C++, Python, JavaScript, and Ruby.
            </p>
          </div>

          <div className="space-y-3 lg:col-span-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Platform
            </div>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <a href="#skills" className="hover:text-slate-950">
                  Skills
                </a>
              </li>
              <li>
                <a href="#who" className="hover:text-slate-950">
                  Who It&apos;s For
                </a>
              </li>
              <li>
                <a href="#how" className="hover:text-slate-950">
                  Workflow
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-slate-950">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3 lg:col-span-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Workspace
            </div>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link to={primaryDestination} className="hover:text-slate-950">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/app/learn" className="hover:text-slate-950">
                  Learn Track
                </Link>
              </li>
              <li>
                <Link to="/app/reference" className="hover:text-slate-950">
                  Syntax Reference
                </Link>
              </li>
              <li>
                <Link to="/app/certificates" className="hover:text-slate-950">
                  Certificates
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3 lg:col-span-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Languages
            </div>
            <p className="text-sm font-medium leading-6 text-slate-700">
              SQL · Java · C++ · Python · JavaScript · Ruby
            </p>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              <span>github.com/JOYBOYash/recurry</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom atmospheric sign-off floating above the emerging clouds */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-8 pt-28 text-center sm:px-6 lg:px-8">
        <p className="text-xs font-semibold text-slate-900 drop-shadow-[0_1px_8px_rgba(255,255,255,0.95)]">
          Built with 💙 from India.
        </p>
      </div>
    </footer>
  );
}
