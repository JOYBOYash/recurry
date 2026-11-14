import { useState } from 'react';
import { Plus } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';
import { FAQ_ITEMS } from '../data/landingContent';

export function FaqSection() {
  const [openFaqId, setOpenFaqId] = useState<string>(FAQ_ITEMS[0].id);

  return (
    <section
      id="faq"
      className="grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-12 scroll-mt-24"
    >
      <ScrollReveal className="space-y-3 lg:sticky lg:top-24 lg:col-span-5">
        <h2 className="font-display text-3xl font-bold tracking-tight text-slate-950 text-balance sm:text-4xl">
          Frequently asked questions.
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-slate-600">
          Quick answers about the free daily track, instant code checks, and star certificates.
        </p>
      </ScrollReveal>

      <ScrollReveal delayMs={80} className="lg:col-span-7">
        <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {FAQ_ITEMS.map((item) => {
            const isOpen = openFaqId === item.id;
            return (
              <div key={item.id}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${item.id}`}
                  onClick={() =>
                    setOpenFaqId((prev) => (prev === item.id ? '' : item.id))
                  }
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50/80 sm:px-6 sm:py-5"
                >
                  <span className="font-display text-base font-bold text-slate-950">
                    {item.question}
                  </span>
                  <Plus
                    aria-hidden="true"
                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-45 text-blue-600' : 'text-slate-500'
                    }`}
                  />
                </button>
                {isOpen && (
                  <div
                    id={`faq-panel-${item.id}`}
                    className="animate-view-enter px-5 pb-5 text-sm leading-relaxed text-slate-600 sm:px-6"
                  >
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollReveal>
    </section>
  );
}
