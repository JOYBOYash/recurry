import {
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Loader2,
  Upload,
  Workflow,
  X,
} from 'lucide-react';
import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { SUPPORTED_LANGUAGES } from '../../data/languages';
import type { AlgoConceptId } from '../../types/algo';
import type { LanguageId } from '../../types/curriculum';
import {
  ALGO_CONCEPTS,
  MAX_PROBLEM_TEXT_LENGTH,
  validateAlgoTextInput,
  validateAlgoUploadedFile,
} from '../../utils/algoLogic';
import { LanguageIcon } from '../LanguageIcon';

export interface AlgoIntakeSubmitPayload {
  language: LanguageId;
  concept: AlgoConceptId;
  problemText?: string;
  imageBase64?: string;
  imageMimeType?: string;
}

interface AlgoIntakeSectionProps {
  defaultLanguage: LanguageId;
  submitting: boolean;
  error: string | null;
  onClearError: () => void;
  onSubmit: (payload: AlgoIntakeSubmitPayload) => Promise<void>;
}

const SAMPLE_ADD_TWO_NUMBERS =
  'Write a program that reads two numbers from user input, adds them using a dedicated function, and prints the final sum.';

export function AlgoIntakeSection({
  defaultLanguage,
  submitting,
  error,
  onClearError,
  onSubmit,
}: AlgoIntakeSectionProps) {
  const [language, setLanguage] = useState<LanguageId>(defaultLanguage);
  const [concept, setConcept] = useState<AlgoConceptId>('auto');
  const [inputMode, setInputMode] = useState<'paste' | 'upload'>('paste');
  const [problemText, setProblemText] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedImageDataUrl, setUploadedImageDataUrl] = useState<string | null>(null);
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  const [uploadedImageMime, setUploadedImageMime] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function clearUploadedFile() {
    setUploadedFileName(null);
    setUploadedImageDataUrl(null);
    setUploadedImageBase64(null);
    setUploadedImageMime(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function processFile(file: File) {
    setLocalError(null);
    onClearError();

    const check = validateAlgoUploadedFile({
      name: file.name,
      type: file.type,
      size: file.size,
    });
    if (!check.valid) {
      setLocalError(check.error ?? 'Unsupported file.');
      return;
    }

    if (check.kind === 'text') {
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result : '';
        clearUploadedFile();
        setProblemText(text.slice(0, MAX_PROBLEM_TEXT_LENGTH));
        setUploadedFileName(file.name);
        setInputMode('paste');
      };
      reader.onerror = () => {
        setLocalError('Could not read the selected text file.');
      };
      reader.readAsText(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = dataUrl.indexOf(',');
      if (commaIdx === -1) {
        setLocalError('Could not decode the selected image.');
        return;
      }
      const base64 = dataUrl.slice(commaIdx + 1);
      setUploadedFileName(file.name);
      setUploadedImageDataUrl(dataUrl);
      setUploadedImageBase64(base64);
      setUploadedImageMime(file.type);
    };
    reader.onerror = () => {
      setLocalError('Could not read the selected image.');
    };
    reader.readAsDataURL(file);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    onClearError();

    if (inputMode === 'upload' && uploadedImageBase64 && uploadedImageMime) {
      await onSubmit({
        language,
        concept,
        problemText: problemText.trim() || undefined,
        imageBase64: uploadedImageBase64,
        imageMimeType: uploadedImageMime,
      });
      return;
    }

    const textCheck = validateAlgoTextInput(problemText);
    if (!textCheck.valid) {
      setLocalError(textCheck.error ?? 'Enter a coding problem first.');
      return;
    }

    await onSubmit({
      language,
      concept,
      problemText: problemText.trim(),
    });
  }

  const displayError = localError ?? error;
  const canSubmit =
    !submitting &&
    (inputMode === 'upload'
      ? Boolean(uploadedImageBase64) || problemText.trim().length >= 10
      : problemText.trim().length >= 10);

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-neutral-800 dark:bg-[#181818]"
    >
      <div className="space-y-5">
        {/* Language & Concept Dropdown Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="algo-language-select"
              className="block text-xs font-semibold text-slate-700 dark:text-neutral-300"
            >
              Language
            </label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 flex items-center">
                <LanguageIcon language={language} className="h-4 w-4" />
              </span>
              <select
                id="algo-language-select"
                aria-label="Target programming language"
                value={language}
                disabled={submitting}
                onChange={(e) => setLanguage(e.target.value as LanguageId)}
                className="min-h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-9 text-sm font-semibold text-slate-900 transition-colors focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:bg-[#141414] dark:text-neutral-100"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="algo-concept-select"
              className="block text-xs font-semibold text-slate-700 dark:text-neutral-300"
            >
              Concept Focus
            </label>
            <select
              id="algo-concept-select"
              aria-label="Concept focus"
              value={concept}
              disabled={submitting}
              onChange={(e) => setConcept(e.target.value as AlgoConceptId)}
              className="min-h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 transition-colors focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:bg-[#141414] dark:text-neutral-100"
            >
              {ALGO_CONCEPTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Problem / Code Input (Paste or Upload) */}
        <div className="space-y-3 border-t border-slate-100 pt-5 dark:border-neutral-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              role="tablist"
              aria-label="Problem input method"
              className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-neutral-800 dark:bg-[#141414]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={inputMode === 'paste'}
                onClick={() => {
                  setInputMode('paste');
                  setLocalError(null);
                }}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  inputMode === 'paste'
                    ? 'bg-white text-slate-950 shadow-xs dark:bg-[#242424] dark:text-white'
                    : 'text-slate-600 hover:text-slate-950 dark:text-neutral-400 dark:hover:text-white'
                }`}
              >
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Paste Problem or Code</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inputMode === 'upload'}
                onClick={() => {
                  setInputMode('upload');
                  setLocalError(null);
                }}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  inputMode === 'upload'
                    ? 'bg-white text-slate-950 shadow-xs dark:bg-[#242424] dark:text-white'
                    : 'text-slate-600 hover:text-slate-950 dark:text-neutral-400 dark:hover:text-white'
                }`}
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Upload Screenshot / File</span>
              </button>
            </div>

            {inputMode === 'paste' && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setProblemText(SAMPLE_ADD_TWO_NUMBERS);
                  setConcept('foundations_io');
                  setLocalError(null);
                  onClearError();
                }}
                className="cursor-pointer font-mono text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Try Add Two Numbers
              </button>
            )}
          </div>

          {inputMode === 'paste' ? (
            <div className="space-y-1.5">
              <label htmlFor="algo-problem-textarea" className="sr-only">
                Coding problem statement or code snippet
              </label>
              <textarea
                id="algo-problem-textarea"
                rows={5}
                value={problemText}
                disabled={submitting}
                maxLength={MAX_PROBLEM_TEXT_LENGTH}
                style={{ fontVariantLigatures: 'none' }}
                onChange={(e) => {
                  setProblemText(e.target.value);
                  if (localError) setLocalError(null);
                }}
                placeholder="Paste a coding problem statement or code snippet to break down and build step by step..."
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 font-mono text-sm leading-relaxed text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-neutral-800 dark:bg-[#141414] dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-blue-500"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400">
                <span>
                  {uploadedFileName
                    ? `Loaded from ${uploadedFileName}`
                    : 'Paste problem prompt or starter/reference code'}
                </span>
                <span className="font-mono tabular-nums">
                  {problemText.length}/{MAX_PROBLEM_TEXT_LENGTH}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-7 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50/50 dark:border-blue-500 dark:bg-[#202020]'
                    : 'border-slate-300 bg-slate-50/70 dark:border-neutral-700 dark:bg-[#141414]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,.txt,.md,text/plain,text/markdown"
                  onChange={handleFileChange}
                  className="hidden"
                  id="algo-file-input"
                />
                {uploadedImageDataUrl ? (
                  <div className="w-full max-w-md space-y-3">
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-neutral-800 dark:bg-[#181818]">
                      <img
                        src={uploadedImageDataUrl}
                        alt="Uploaded problem screenshot preview"
                        className="max-h-52 w-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={clearUploadedFile}
                        aria-label="Remove uploaded screenshot"
                        className="absolute top-2 right-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white/95 text-slate-700 hover:text-slate-950 dark:border-neutral-700 dark:bg-[#202020]/95 dark:text-neutral-200"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-600 dark:text-neutral-300">
                      <ImageIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                      <span className="truncate font-mono">{uploadedFileName}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload
                      className="mb-2 h-5 w-5 text-slate-400 dark:text-neutral-500"
                      aria-hidden="true"
                    />
                    <p className="text-sm font-medium text-slate-800 dark:text-neutral-200">
                      Drop a screenshot or text file here
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-neutral-400">
                      PNG, JPEG, WebP up to 4 MB · .txt or .md up to 20 KB
                    </p>
                    <label
                      htmlFor="algo-file-input"
                      className="mt-3 inline-flex min-h-9 cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-950 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:border-neutral-600"
                    >
                      Choose File
                    </label>
                  </>
                )}
              </div>

              {uploadedImageDataUrl && (
                <div>
                  <label htmlFor="algo-image-note" className="sr-only">
                    Optional extra note
                  </label>
                  <input
                    id="algo-image-note"
                    type="text"
                    value={problemText}
                    disabled={submitting}
                    maxLength={400}
                    onChange={(e) => setProblemText(e.target.value)}
                    placeholder="Optional note or constraint to focus on..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-neutral-800 dark:bg-[#141414] dark:text-neutral-100 dark:placeholder:text-neutral-500"
                  />
                </div>
              )}
            </div>
          )}

          {displayError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/80 px-3.5 py-2.5 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{displayError}</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-juice inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-[#262626] dark:disabled:text-neutral-500"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Breaking Down...</span>
                </>
              ) : (
                <>
                  <Workflow className="h-4 w-4" aria-hidden="true" />
                  <span>Start Coding Flow</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
