interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  collapseText?: boolean;
  tone?: 'brand' | 'dark' | 'light';
}

const SIZE_CLASSES: Record<
  NonNullable<BrandLogoProps['size']>,
  { mark: string; text: string }
> = {
  sm: { mark: 'h-6 w-6', text: 'text-lg' },
  md: { mark: 'h-7 w-7', text: 'text-2xl' },
  lg: { mark: 'h-8 w-8', text: 'text-2xl' },
};

export function BrandLogo({
  size = 'md',
  showText = true,
  collapseText = false,
  tone = 'brand',
}: BrandLogoProps) {
  const styles = SIZE_CLASSES[size];

  const markColorClass =
    tone === 'light'
      ? 'bg-white'
      : tone === 'dark'
        ? 'bg-slate-950 dark:bg-white'
        : 'bg-[#2563EB] dark:bg-blue-500';

  const textColorClass =
    tone === 'light' ? 'text-white' : 'text-slate-950 dark:text-white';

  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap">
      <span
        aria-hidden="true"
        className={`inline-block shrink-0 transition-colors duration-300 ${styles.mark} ${markColorClass}`}
        style={{
          maskImage: "url('/assets/images/logo.svg')",
          WebkitMaskImage: "url('/assets/images/logo.svg')",
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
        }}
      />
      {showText && (
        <span
          className={`overflow-hidden font-display font-bold tracking-tight transition-all duration-300 ease-out ${styles.text} ${textColorClass} ${
            collapseText ? 'ml-0 max-w-0 opacity-0' : 'ml-2 max-w-[110px] opacity-100'
          }`}
        >
          recurry
        </span>
      )}
    </span>
  );
}
