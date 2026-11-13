import type { LanguageId } from '../types/curriculum';

export type SyntaxTokenType =
  | 'keyword'
  | 'type'
  | 'string'
  | 'number'
  | 'comment'
  | 'operator'
  | 'function'
  | 'plain';

export interface SyntaxToken {
  type: SyntaxTokenType;
  text: string;
}

const KEYWORDS: Record<LanguageId, Set<string>> = {
  sql: new Set([
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER',
    'ON', 'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
    'AS', 'WITH', 'OVER', 'PARTITION', 'INSERT', 'INTO', 'VALUES', 'UPDATE',
    'SET', 'DELETE', 'CREATE', 'TABLE', 'INDEX', 'PRIMARY', 'KEY', 'FOREIGN',
    'REFERENCES', 'NOT', 'NULL', 'AND', 'OR', 'IN', 'EXISTS', 'CASE', 'WHEN',
    'THEN', 'ELSE', 'END', 'DISTINCT', 'UNION', 'ALL', 'RETURNING', 'BEGIN',
    'COMMIT', 'ROLLBACK',
  ]),
  java: new Set([
    'public', 'private', 'protected', 'class', 'interface', 'record', 'enum',
    'extends', 'implements', 'static', 'final', 'void', 'return', 'new', 'if',
    'else', 'for', 'while', 'switch', 'case', 'default', 'break', 'continue',
    'try', 'catch', 'finally', 'throw', 'throws', 'import', 'package', 'var',
    'this', 'super', 'sealed', 'permits', 'yield', 'true', 'false', 'null',
  ]),
  cpp: new Set([
    'include', 'using', 'namespace', 'std', 'class', 'struct', 'template',
    'typename', 'concept', 'requires', 'const', 'constexpr', 'auto', 'void',
    'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break',
    'continue', 'public', 'private', 'protected', 'virtual', 'override',
    'new', 'delete', 'nullptr', 'true', 'false', 'noexcept', 'try', 'catch',
    'throw', 'sizeof', 'static_cast',
  ]),
  python: new Set([
    'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'in',
    'not', 'and', 'or', 'is', 'with', 'as', 'import', 'from', 'try', 'except',
    'finally', 'raise', 'yield', 'async', 'await', 'lambda', 'pass', 'break',
    'continue', 'match', 'case', 'True', 'False', 'None',
  ]),
  javascript: new Set([
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'of',
    'in', 'while', 'switch', 'case', 'default', 'break', 'continue', 'class',
    'extends', 'new', 'this', 'import', 'export', 'from', 'async', 'await',
    'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'true',
    'false', 'null', 'undefined',
  ]),
};

const TYPES: Record<LanguageId, Set<string>> = {
  sql: new Set([
    'INT', 'INTEGER', 'BIGINT', 'TEXT', 'VARCHAR', 'BOOLEAN', 'NUMERIC',
    'DECIMAL', 'DATE', 'TIMESTAMP', 'TIMESTAMPTZ', 'JSONB', 'UUID', 'SERIAL',
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ROW_NUMBER', 'RANK', 'COALESCE',
  ]),
  java: new Set([
    'int', 'long', 'double', 'boolean', 'char', 'byte', 'String', 'List',
    'ArrayList', 'Map', 'HashMap', 'Set', 'Optional', 'Stream', 'CompletableFuture',
    'Integer', 'Object', 'Exception',
  ]),
  cpp: new Set([
    'int', 'long', 'double', 'float', 'bool', 'char', 'size_t', 'string',
    'vector', 'unordered_map', 'map', 'array', 'optional', 'unique_ptr',
    'shared_ptr', 'span', 'string_view', 'cout', 'endl',
  ]),
  python: new Set([
    'int', 'float', 'str', 'bool', 'list', 'dict', 'set', 'tuple', 'Any',
    'Optional', 'Iterable', 'Callable', 'dataclass', 'print', 'len', 'range',
    'enumerate', 'zip',
  ]),
  javascript: new Set([
    'Array', 'Object', 'Map', 'Set', 'Promise', 'Error', 'JSON', 'Math',
    'Number', 'String', 'Boolean', 'console',
  ]),
};

export function tokenizeLine(line: string, language: LanguageId): SyntaxToken[] {
  if (line.length === 0) {
    return [{ type: 'plain', text: '' }];
  }

  const tokens: SyntaxToken[] = [];
  let i = 0;
  const kwSet = KEYWORDS[language];
  const typeSet = TYPES[language];

  const pushToken = (type: SyntaxTokenType, text: string) => {
    const last = tokens[tokens.length - 1];
    if (last && last.type === type) {
      last.text += text;
    } else {
      tokens.push({ type, text });
    }
  };

  while (i < line.length) {
    const ch = line[i];
    const next = line[i + 1] ?? '';

    // Line comments
    if (
      ((language === 'sql' && ch === '-' && next === '-') ||
        (language === 'python' && ch === '#') ||
        ((language === 'java' || language === 'cpp' || language === 'javascript') &&
          ch === '/' &&
          next === '/'))
    ) {
      pushToken('comment', line.slice(i));
      break;
    }

    // C++ preprocessor directive
    if (language === 'cpp' && ch === '#' && i === line.search(/\S/)) {
      const match = line.slice(i).match(/^#[a-zA-Z_]+/);
      if (match) {
        pushToken('keyword', match[0]);
        i += match[0].length;
        continue;
      }
    }

    // Strings
    if (ch === '"' || ch === "'" || (language === 'javascript' && ch === '`')) {
      const quote = ch;
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === quote && line[j - 1] !== '\\') {
          j += 1;
          break;
        }
        j += 1;
      }
      pushToken('string', line.slice(i, j));
      i = j;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(ch) && (i === 0 || !/[a-zA-Z0-9_]/.test(line[i - 1]))) {
      const match = line.slice(i).match(/^(0x[0-9a-fA-F]+|[0-9]+(\.[0-9]+)?)/);
      if (match) {
        pushToken('number', match[0]);
        i += match[0].length;
        continue;
      }
    }

    // Identifiers / Keywords / Types / Function calls
    if (/[a-zA-Z_]/.test(ch)) {
      const match = line.slice(i).match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
      if (match) {
        const word = match[0];
        const lookup = language === 'sql' ? word.toUpperCase() : word;
        const afterWord = line[i + word.length] ?? '';

        if (kwSet.has(lookup)) {
          pushToken('keyword', word);
        } else if (typeSet.has(lookup)) {
          pushToken('type', word);
        } else if (afterWord === '(') {
          pushToken('function', word);
        } else {
          pushToken('plain', word);
        }
        i += word.length;
        continue;
      }
    }

    // Operators / punctuation
    if (/[=<>!+\-*/%&|^~?:.]/.test(ch)) {
      pushToken('operator', ch);
      i += 1;
      continue;
    }

    pushToken('plain', ch);
    i += 1;
  }

  return tokens;
}

export function tokenizeCode(code: string, language: LanguageId): SyntaxToken[][] {
  return code.split('\n').map((line) => tokenizeLine(line, language));
}
