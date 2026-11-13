import { FaJava } from 'react-icons/fa6';
import { SiCplusplus, SiJavascript, SiPython, SiRuby } from 'react-icons/si';
import { TbSql } from 'react-icons/tb';
import type { LanguageId } from '../types/curriculum';

interface LanguageIconProps {
  language: LanguageId;
  className?: string;
}

const LANGUAGE_ICON_COLOR: Record<LanguageId, string> = {
  sql: 'text-sky-600',
  java: 'text-orange-600',
  cpp: 'text-blue-600',
  python: 'text-emerald-600',
  javascript: 'text-amber-500',
  ruby: 'text-rose-600',
};

export function LanguageIcon({
  language,
  className = 'h-6 w-6',
}: LanguageIconProps) {
  const color = LANGUAGE_ICON_COLOR[language];
  const merged = `shrink-0 ${color} ${className}`;

  if (language === 'sql') {
    return <TbSql className={merged} aria-hidden="true" />;
  }
  if (language === 'java') {
    return <FaJava className={merged} aria-hidden="true" />;
  }
  if (language === 'cpp') {
    return <SiCplusplus className={merged} aria-hidden="true" />;
  }
  if (language === 'python') {
    return <SiPython className={merged} aria-hidden="true" />;
  }
  if (language === 'ruby') {
    return <SiRuby className={merged} aria-hidden="true" />;
  }
  return <SiJavascript className={merged} aria-hidden="true" />;
}
