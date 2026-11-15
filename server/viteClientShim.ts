export function shouldEnableViteHmr(
  env: Record<string, string | undefined>,
): boolean {
  return env.DISABLE_HMR?.trim().toLowerCase() === 'false';
}

export function buildNoHmrViteClientModule(): string {
  return `// Vite dev client shim when HMR is disabled
const sheetsMap = new Map();
const linkSheetsMap = new Map();

if (typeof document !== 'undefined') {
  document.querySelectorAll('style[data-vite-dev-id]').forEach((el) => {
    const id = el.getAttribute('data-vite-dev-id');
    if (id) sheetsMap.set(id, el);
  });
  document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id]').forEach((el) => {
    const id = el.getAttribute('data-vite-dev-id');
    if (id) linkSheetsMap.set(id, el);
  });
}

let lastInsertedStyle;

export function updateStyle(id, content) {
  if (typeof document === 'undefined') return;
  if (linkSheetsMap.has(id)) return;
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    if (!lastInsertedStyle) {
      document.head.appendChild(style);
      setTimeout(() => {
        lastInsertedStyle = undefined;
      }, 0);
    } else {
      lastInsertedStyle.insertAdjacentElement('afterend', style);
    }
    lastInsertedStyle = style;
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}

export function removeStyle(id) {
  if (typeof document === 'undefined') return;
  if (linkSheetsMap.has(id)) {
    document
      .querySelectorAll(\`link[rel="stylesheet"][data-vite-dev-id="\${CSS.escape(id)}"]\`)
      .forEach((el) => el.remove());
    linkSheetsMap.delete(id);
  }
  const style = sheetsMap.get(id);
  if (style && style.parentNode) {
    style.parentNode.removeChild(style);
    sheetsMap.delete(id);
  }
}

export function createHotContext() {
  const noop = () => {};
  return {
    data: {},
    accept: noop,
    acceptExports: noop,
    dispose: noop,
    prune: noop,
    decline: noop,
    invalidate: noop,
    on: noop,
    off: noop,
    send: noop,
  };
}

export function injectQuery(url, queryToInject) {
  if (url[0] !== '.' && url[0] !== '/') return url;
  const pathname = url.replace(/[?#].*$/, '');
  const { search, hash } = new URL(url, 'http://vite.dev');
  return \`\${pathname}?\${queryToInject}\${search ? '&' + search.slice(1) : ''}\${hash || ''}\`;
}

const BaseElement = typeof HTMLElement !== 'undefined' ? HTMLElement : class {};

export class ErrorOverlay extends BaseElement {
  constructor(err) {
    super();
    this.err = err;
  }
  close() {}
}

if (typeof customElements !== 'undefined' && !customElements.get('vite-error-overlay')) {
  customElements.define('vite-error-overlay', ErrorOverlay);
}
`;
}
