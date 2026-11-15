interface InlineCodeTextProps {
  text: string;
  className?: string;
}

export function InlineCodeText({ text, className = '' }: InlineCodeTextProps) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <span className={className}>
      {parts.map((part, idx) => {
        if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
          return (
            <code
              key={idx}
              className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.88em] font-medium text-slate-900 dark:bg-[#262626] dark:text-neutral-100"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </span>
  );
}
