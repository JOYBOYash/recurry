import type {
  LanguageId,
  LanguageMeta,
  LearningFocus,
  PaceDepth,
  ReferenceCategory,
  SkillLevel,
} from '../types/curriculum';

export const BEGINNING_FIVE_LANGUAGES: LanguageMeta[] = [
  {
    id: 'sql',
    name: 'SQL',
    standardLabel: 'ANSI SQL / PostgreSQL 16',
    paradigm: 'Declarative',
    typingSystem: 'Static Schema',
    summary: 'Relational queries, joins, window analytics, CTEs, and schemas.',
    keyConstructs: ['SELECT / WHERE', 'JOIN', 'GROUP BY', 'Window OVER', 'CTEs', 'Indexes'],
    accentColor: '#0284C7',
  },
  {
    id: 'java',
    name: 'Java',
    standardLabel: 'Java 21 LTS',
    paradigm: 'Object-Oriented',
    typingSystem: 'Static Strong',
    summary: 'Classes, records, generics, collections, Streams, and exceptions.',
    keyConstructs: ['Records', 'Generics', 'Streams', 'Collections', 'Exceptions', 'Virtual Threads'],
    accentColor: '#EA580C',
  },
  {
    id: 'cpp',
    name: 'C++',
    standardLabel: 'Modern C++20',
    paradigm: 'Systems & Generic',
    typingSystem: 'Zero-Overhead',
    summary: 'RAII, smart pointers, STL, templates, concepts, and move semantics.',
    keyConstructs: ['Pointers & Refs', 'RAII', 'STL', 'Templates', 'Move (&&)', 'Ranges'],
    accentColor: '#2563EB',
  },
  {
    id: 'python',
    name: 'Python',
    standardLabel: 'Python 3.12',
    paradigm: 'Multi-Paradigm',
    typingSystem: 'Dynamic + Hints',
    summary: 'Comprehensions, decorators, generators, dataclasses, and asyncio.',
    keyConstructs: ['Comprehensions', 'Decorators', 'Generators', 'Dataclasses', 'with', 'Asyncio'],
    accentColor: '#059669',
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    standardLabel: 'ECMAScript 2024',
    paradigm: 'Event-Driven',
    typingSystem: 'Dynamic',
    summary: 'Closures, destructuring, array transforms, Promises, and async/await.',
    keyConstructs: ['Closures', 'Destructuring', 'Array Methods', 'Classes', 'Promises', 'Async/Await'],
    accentColor: '#D97706',
  },
];

export const LANGUAGE_MAP: Record<LanguageId, LanguageMeta> =
  BEGINNING_FIVE_LANGUAGES.reduce(
    (acc, lang) => {
      acc[lang.id] = lang;
      return acc;
    },
    {} as Record<LanguageId, LanguageMeta>,
  );

export const SKILL_LEVELS: Array<{
  id: SkillLevel;
  label: string;
  tag: string;
}> = [
  { id: 'noob', label: 'Noob', tag: 'First steps' },
  { id: 'intern', label: 'Intern', tag: 'Core fundamentals' },
  { id: 'expert', label: 'Expert', tag: 'Production idioms' },
  { id: 'master', label: 'Master', tag: 'Deep semantics' },
  { id: 'legend', label: 'Legend', tag: 'Compiler-grade' },
];

export const LEARNING_FOCUS_OPTIONS: Array<{
  id: LearningFocus;
  label: string;
  tag: string;
}> = [
  { id: 'syntax', label: 'Syntax Mastery', tag: 'Grammar, idioms & forms' },
  { id: 'problem_solving', label: 'Problem Solving', tag: 'Algorithms & code challenges' },
];

export const DAILY_GOAL_PRESETS: Array<{
  modules: number;
  label: string;
}> = [
  { modules: 1, label: 'Casual' },
  { modules: 2, label: 'Steady' },
  { modules: 3, label: 'Focused' },
  { modules: 5, label: 'Intense' },
];

export const PACE_DEPTHS: Array<{
  id: PaceDepth;
  label: string;
  moduleCount: number;
  description: string;
}> = [
  { id: 'essentials', label: 'Essentials', moduleCount: 4, description: '4 modules' },
  { id: 'comprehensive', label: 'Balanced', moduleCount: 6, description: '6 modules' },
  { id: 'complete', label: 'Deep', moduleCount: 8, description: '8 modules' },
];

export const REFERENCE_CATEGORIES: ReferenceCategory[] = [
  'Types & Variables',
  'Control Flow',
  'Functions & Closures',
  'Collections & Iteration',
  'OOP & Data Modeling',
  'Errors & Safety',
  'Queries & Concurrency',
];
