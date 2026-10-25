import * as vfs from './vfs';
import {getAppById, LAUNCHABLES} from '../../components/desktop/apps';

type Token = {value: string; operator?: boolean; quoted?: boolean};
const escapePattern = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function escapes(text: string): string {
  return text.replace(/\\(x[0-9a-fA-F]{1,2}|0[0-7]{1,3}|u[0-9a-fA-F]{4}|[abefnrtv\\])/g, (match, code: string) => {
    const simple: Record<string, string> = {a: '\x07', b: '\b', e: '\x1b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v', '\\': '\\'};
    return simple[code] ?? String.fromCodePoint(parseInt(code.slice(1), code[0] === '0' ? 8 : 16));
  });
}
export type ShellMessages = Record<'missing' | 'directory' | 'file' | 'exists' | 'arguments' | 'syntax' | 'unknown' | 'unsupported' | 'protected' | 'empty', string>;
export const COMMANDS = ['help', 'pwd', 'ls', 'cd', 'mkdir', 'touch', 'cat', 'echo', 'printf', 'cp', 'mv', 'rm', 'rmdir', 'tree', 'find', 'grep', 'head', 'tail', 'wc', 'sort', 'uniq', 'cut', 'tr', 'basename', 'dirname', 'date', 'whoami', 'hostname', 'uname', 'env', 'export', 'history', 'clear', 'cls', 'true', 'false'];

// Operators remain distinct from quoted/escaped text (echo "a|b", echo \>).
function tokenize(line: string): Token[] {
  const tokens: Token[] = [];
  let value = '', quote = '', active = false, quoted = false;
  const flush = () => {
    if (active) tokens.push({value, quoted});
    value = ''; active = false; quoted = false;
  };
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '\\' && quote !== "'") {
      if (++i >= line.length) throw new Error('syntax');
      if (quote === '"' && !['"', '\\', '$', '`'].includes(line[i])) value += '\\';
      value += line[i]; active = true; quoted = true;
    } else if (quote) {
      if (c === quote) quote = ''; else value += c;
    } else if (c === '"' || c === "'") {
      quote = c; active = true; quoted = true;
    } else if (/\s/.test(c)) flush();
    else if ('|;<>'.includes(c)) {
      flush();
      let op = c;
      if (c === '>' && line[i + 1] === '>') {op += '>'; i++;}
      tokens.push({value: op, operator: true});
    } else {value += c; active = true;}
  }
  if (quote) throw new Error('syntax');
  flush();
  return tokens;
}

export class PromptShell {
  cwd = '/home/user';
  previous = '/home/user';
  history: string[] = [];
  env: Record<string, string> = {HOME: '/home/user', USER: 'user', SHELL: '/bin/hikari-sh', TERM: 'xterm-256color'};
  constructor(private messages: ShellMessages, private help: string, private launch?: (appId: string) => void) {vfs.ensureSeeded();}
  get prompt(): string {
    const home = this.env.HOME;
    const path = this.cwd === home ? '~' : this.cwd.startsWith(home + '/') ? '~' + this.cwd.slice(home.length) : this.cwd;
    return `[${this.env.USER}@hikari-browser: ${path}]$ `;
  }
  path(input = '~'): string {
    if (input === '~' || input.startsWith('~/')) input = this.env.HOME + input.slice(1);
    const parts: string[] = [];
    for (const part of (input.startsWith('/') ? input : `${this.cwd}/${input}`).split('/')) {
      if (part === '..') parts.pop(); else if (part && part !== '.') parts.push(part);
    }
    return '/' + parts.join('/');
  }
  private fail(key: keyof ShellMessages, detail = ''): never {throw new Error(`${this.messages[key]}${detail ? ': ' + detail : ''}`);}
  private node(path: string) {const node = vfs.stat(path); if (!node) this.fail('missing', path); return node;}
  private dir(path: string) {if (this.node(path).type !== 'folder') this.fail('directory', path);}
  private read(path: string): string {
    const node = this.node(path);
    if (node.type !== 'file' || vfs.isBinaryFile(node)) this.fail('file', path);
    return vfs.readFile(path) ?? '';
  }
  private write(path: string, content: string, append = false) {
    this.dir(vfs.parentPath(path));
    if (vfs.exists(path)) this.read(path);
    const result = (append && vfs.exists(path) ? this.read(path) : '') + content;
    vfs.writeFile(path, result);
    if (vfs.readFile(path) !== result) this.fail('unsupported', 'storage');
  }
  private glob(token: Token): string[] {
    if (token.quoted || !/[?*]/.test(token.value)) return [token.value];
    const path = this.path(token.value);
    const pattern = new RegExp('^' + vfs.basename(path).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    const matches = vfs.readDir(vfs.parentPath(path)).filter(e => pattern.test(e.name) && (!e.name.startsWith('.') || vfs.basename(path).startsWith('.')));
    return matches.length ? matches.map(e => e.path) : [token.value];
  }
  complete(line: string): string[] {
    const match = line.match(/(?:^|\s)([^\s]*)$/);
    if (!match) return [];
    const word = match[1];
    if (!line.slice(0, line.length - word.length).trim()) return [...COMMANDS, ...LAUNCHABLES.map(app => './' + app.id)].filter(c => c.startsWith(word));
    const slash = word.lastIndexOf('/');
    const prefix = slash < 0 ? '' : word.slice(0, slash + 1);
    return vfs.readDir(this.path(prefix || '.')).filter(e => e.name.startsWith(word.slice(slash + 1)))
      .map(e => prefix + e.name + (e.node.type === 'folder' ? '/' : ''));
  }
  run(line: string): {output: string; clear: boolean} {
    if (line.trim()) this.history.push(line);
    this.history = this.history.slice(-200);
    let output = '', clear = false;
    try {
      const tokens = tokenize(line);
      // Parse the whole line before performing any file operations.
      const groups: Token[][][] = [[]];
      let command: Token[] = [];
      for (const token of tokens) {
        if (token.operator && (token.value === ';' || token.value === '|')) {
          if (!command.length) this.fail('syntax');
          groups[groups.length - 1].push(command); command = [];
          if (token.value === ';') groups.push([]);
        } else command.push(token);
      }
      if (command.length) groups[groups.length - 1].push(command);
      else if (tokens.at(-1)?.value === '|') this.fail('syntax');
      for (const group of groups) for (const part of group) {
        if (part[0]?.operator) this.fail('syntax');
        for (let i = 0; i < part.length; i++) if (part[i].operator) {
          if (!['<', '>', '>>'].includes(part[i].value) || !part[i + 1] || part[i + 1].operator) this.fail('syntax');
          i++;
        }
      }
      for (const group of groups) {
        let stdin = '';
        for (const part of group) {
          const args: string[] = [];
          let redirect: {path: string; append: boolean} | undefined;
          for (let i = 0; i < part.length; i++) {
            const token = part[i];
            if (token.operator) {
              const path = this.path(part[++i].value);
              if (token.value === '<') stdin = this.read(path);
              else redirect = {path, append: token.value === '>>'};
            } else args.push(...this.glob(token));
          }
          if (args[0] === 'clear' || args[0] === 'cls') clear = true;
          stdin = this.execute(args, stdin, group.length === 1 && !redirect);
          if (redirect) {this.write(redirect.path, stdin, redirect.append); stdin = '';}
        }
        output += stdin;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output += `sh: ${message === 'syntax' ? this.messages.syntax : message}\n`;
    }
    return {output, clear};
  }
  private execute([cmd, ...args]: string[], stdin: string, terminalOutput = true): string {
    if (cmd?.startsWith('./')) {
      const appId = cmd.slice(2);
      if (getAppById(appId)) {
        if (args.length) this.fail('arguments', cmd);
        if (!this.launch) this.fail('unsupported', cmd);
        this.launch(appId); return '';
      }
      const node = vfs.stat(this.path(cmd));
      if (node?.type === 'link' && node.appId && getAppById(node.appId) && this.launch) {this.launch(node.appId); return '';}
      this.fail('unknown', cmd);
    }
    const aliases: Record<string, Record<string, string>> = {
      ls: {'--all': '-a', '--almost-all': '-A', '--human-readable': '-h', '--reverse': '-r', '--recursive': '-R', '--directory': '-d', '--classify': '-F'},
      cat: {'--number': '-n', '--number-nonblank': '-b', '--squeeze-blank': '-s', '--show-all': '-A', '--show-ends': '-E', '--show-tabs': '-T'},
      head: {'--lines': '-n', '--bytes': '-c', '--quiet': '-q', '--verbose': '-v'},
      tail: {'--lines': '-n', '--bytes': '-c', '--quiet': '-q', '--verbose': '-v'},
      wc: {'--lines': '-l', '--words': '-w', '--bytes': '-c', '--chars': '-m', '--max-line-length': '-L'},
      grep: {'--ignore-case': '-i', '--invert-match': '-v', '--line-number': '-n', '--count': '-c', '--fixed-strings': '-F', '--extended-regexp': '-E', '--word-regexp': '-w', '--line-regexp': '-x', '--only-matching': '-o'},
      sort: {'--numeric-sort': '-n', '--reverse': '-r', '--unique': '-u', '--ignore-case': '-f', '--ignore-leading-blanks': '-b'},
      mkdir: {'--parents': '-p'}, rm: {'--recursive': '-r', '--force': '-f'}, cp: {'--recursive': '-r'},
    };
    let optionsEnded = false;
    args = args.flatMap(arg => {
      if (optionsEnded) return [arg];
      if (arg === '--') {optionsEnded = true; return [arg];}
      const [name, ...value] = arg.split('=');
      const alias = aliases[cmd]?.[name];
      if (alias) return value.length ? [alias, value.join('=')] : [alias];
      if ((cmd === 'head' || cmd === 'tail') && /^-[nc]\d+$/.test(arg)) return [arg.slice(0, 2), arg.slice(2)];
      return [arg];
    });
    const endOptions = args.indexOf('--');
    const flags = args.slice(0, endOptions < 0 ? args.length : endOptions).filter(a => a.startsWith('-') && a !== '-');
    const rest = args.filter((a, i) => (endOptions >= 0 && i > endOptions) || (!a.startsWith('-') || a === '-'));
    const has = (flag: string) => flags.some(f => /^-[^-]/.test(f) && f.slice(1).includes(flag));
    const requireArgs = (n: number) => {if (rest.length < n) this.fail('arguments', cmd);};
    const input = () => rest.length ? rest.map(p => p === '-' ? stdin : this.read(this.path(p))).join('') : stdin;
    const lines = (text: string) => text ? text.replace(/\n$/, '').split('\n') : [];
    const walk = (path: string): string[] => [path, ...(this.node(path).type === 'folder' ? vfs.readDir(path).flatMap(e => walk(e.path)) : [])];
    switch (cmd) {
      case undefined: return '';
      case 'help': return this.help + '\n\n' + COMMANDS.join('  ') + '\n';
      case 'pwd': return this.cwd + '\n';
      case 'cd': {
        const path = args[0] === '-' ? this.previous : this.path(args[0]); this.dir(path);
        this.previous = this.cwd; this.cwd = path; return '';
      }
      case 'ls': {
        for (const flag of flags) if (!/^-[alhArRtSdF1p]+$/.test(flag) && !/^--color(?:=(auto|always|never))?$/.test(flag) && flag !== '--group-directories-first') this.fail('arguments', flag);
        const colorOption = flags.find(f => f.startsWith('--color'));
        const color = colorOption && colorOption !== '--color=never' && (colorOption !== '--color=auto' || terminalOutput);
        const size = (node: vfs.VfsNode) => node.size ?? new TextEncoder().encode(node.content ?? '').length;
        const human = (bytes: number) => {let unit = 0; const units = ['', 'K', 'M', 'G']; while (bytes >= 1024 && unit < units.length - 1) {bytes /= 1024; unit++;} return unit ? `${bytes < 10 ? bytes.toFixed(1) : Math.round(bytes)}${units[unit]}` : String(bytes);};
        const list = (path: string, heading: boolean): string => {
          const node = this.node(path);
          let entries: vfs.VfsEntry[] = node.type === 'folder' && !has('d') ? vfs.readDir(path) : [{name: vfs.basename(path), path, node}];
          entries = entries.filter(e => has('a') || has('A') || !e.name.startsWith('.'));
          if (has('a') && node.type === 'folder' && !has('d')) entries.unshift({name: '.', path, node}, {name: '..', path: vfs.parentPath(path), node: this.node(vfs.parentPath(path))});
          entries.sort((a, b) => (flags.includes('--group-directories-first') ? Number(b.node.type === 'folder') - Number(a.node.type === 'folder') : 0) || (has('t') ? b.node.modifiedAt - a.node.modifiedAt : has('S') ? size(b.node) - size(a.node) : a.name.localeCompare(b.name)));
          if (has('r')) entries.reverse();
          let output = heading ? path + ':\n' : '';
          output += entries.map(e => {
            const folder = e.node.type === 'folder', link = e.node.type === 'link';
            const suffix = folder && (has('F') || has('p') || !has('l')) ? '/' : link && has('F') ? '@' : '';
            const name = color && (folder || link) ? `\x1b[${folder ? '34' : '36'}m${e.name}${suffix}\x1b[0m` : e.name + suffix;
            const date = new Date(e.node.modifiedAt).toISOString().slice(0, 16).replace('T', ' ');
            return (has('l') ? `${folder ? 'drwxr-xr-x' : link ? 'lrwxrwxrwx' : '-rw-r--r--'} 1 user user ${String(has('h') ? human(size(e.node)) : size(e.node)).padStart(6)} ${date} ` : '') + name;
          }).join(has('l') || has('1') ? '\n' : '  ') + '\n';
          if (has('R') && !has('d') && node.type === 'folder') for (const entry of entries) if (entry.node.type === 'folder' && entry.name !== '.' && entry.name !== '..') output += '\n' + list(entry.path, true);
          return output;
        };
        return (rest.length ? rest : ['.']).map(p => list(this.path(p), (has('R') || rest.length > 1) && vfs.stat(this.path(p))?.type === 'folder' && !has('d'))).join('');
      }
      case 'mkdir':
        requireArgs(1);
        for (const p of rest) {
          const path = this.path(p);
          if (has('p')) {
            let current = '';
            for (const part of path.split('/').filter(Boolean)) {current += '/' + part; if (vfs.exists(current)) this.dir(current); else vfs.mkdir(current);}
          } else {this.dir(vfs.parentPath(path)); if (vfs.exists(path)) this.fail('exists', p); vfs.mkdir(path);}
        } return '';
      case 'touch': requireArgs(1); for (const p of rest) {const path = this.path(p); if (vfs.exists(path)) this.read(path); else this.write(path, '');} return '';
      case 'cat': {
        let number = 0, previousBlank = false;
        return input().split(/(?<=\n)/).map(line => {
          const blank = line === '\n';
          if (has('s') && blank && previousBlank) return '';
          previousBlank = blank;
          let text = line;
          if (has('T') || has('A')) text = text.replace(/\t/g, '^I');
          if (has('E') || has('A')) text = text.replace(/\n$/, '$\n');
          if ((has('b') && !blank) || (has('n') && !has('b'))) text = `${String(++number).padStart(6)}\t${text}`;
          return text;
        }).join('');
      }
      case 'echo': {
        let index = 0, newline = true, interpret = false;
        while (/^-[neE]+$/.test(args[index] ?? '')) {
          for (const option of args[index++].slice(1)) {if (option === 'n') newline = false; else interpret = option === 'e';}
        }
        let text = args.slice(index).join(' ');
        if (interpret) {const stop = text.indexOf('\\c'); if (stop >= 0) {text = text.slice(0, stop); newline = false;} text = escapes(text);}
        return text + (newline ? '\n' : '');
      }
      case 'printf': {
        if (!args.length) this.fail('arguments', cmd);
        let i = 1;
        return args[0].replace(/%[sd%]|\\[nt\\]/g, m => m === '%s' ? args[i++] ?? '' : m === '%d' ? String(Number(args[i++] ?? 0)) : m === '%%' ? '%' : m === '\\n' ? '\n' : m === '\\t' ? '\t' : '\\');
      }
      case 'cp': case 'mv': {
        requireArgs(2); if (rest.length !== 2) this.fail('arguments', cmd);
        const source = this.path(rest[0]); this.node(source);
        let target = this.path(rest[1]);
        if (vfs.stat(target)?.type === 'folder') target += '/' + vfs.basename(source);
        this.dir(vfs.parentPath(target));
        if (target === source || target.startsWith(source + '/') || source === '/') this.fail('protected', target);
        if (vfs.exists(target)) this.fail('exists', target);
        const node = this.node(source);
        if (cmd === 'mv') {
          // Use native VFS move/rename to preserve binary data and app links.
          if (vfs.parentPath(source) === vfs.parentPath(target)) {if (!vfs.rename(source, vfs.basename(target))) this.fail('unsupported', cmd);}
          else {
            const intermediate = vfs.joinPath(vfs.parentPath(target), vfs.basename(source));
            if (vfs.exists(intermediate)) this.fail('exists', intermediate);
            const moved = vfs.move(source, vfs.parentPath(target));
            if (!moved) this.fail('unsupported', cmd);
            if (moved !== target && !vfs.rename(moved, vfs.basename(target))) this.fail('unsupported', cmd);
          }
        } else {
          if (node.type === 'folder' && !has('r') && !has('R')) this.fail('directory', source);
          const paths = walk(source);
          for (const path of paths) {const n = this.node(path); if (n.type !== 'folder' && (n.type !== 'file' || vfs.isBinaryFile(n))) this.fail('file', path);}
          for (const path of paths) {const dest = target + path.slice(source.length); if (this.node(path).type === 'folder') vfs.mkdir(dest); else this.write(dest, this.read(path));}
        } return '';
      }
      case 'rm': case 'rmdir':
        requireArgs(1);
        for (const p of rest) {
          const path = this.path(p);
          if (path === '/' || this.cwd === path || this.cwd.startsWith(path + '/')) this.fail('protected', path);
          if (!vfs.exists(path) && cmd === 'rm' && has('f')) continue;
          const node = this.node(path);
          if (cmd === 'rmdir') {this.dir(path); if (vfs.readDir(path).length) this.fail('empty', path);}
          else if (node.type === 'folder' && !has('r') && !has('R')) this.fail('directory', path);
          vfs.remove(path);
        } return '';
      case 'tree': case 'find': {
        const root = this.path(rest[0] ?? '.');
        const paths = walk(root);
        if (cmd === 'tree') return paths.map(p => p === root ? root : '  '.repeat(p.slice(root.length).split('/').length - 2) + '|-- ' + vfs.basename(p)).join('\n') + '\n';
        const nameIndex = args.indexOf('-name'), typeIndex = args.indexOf('-type');
        const pattern = nameIndex >= 0 ? args[nameIndex + 1] : null;
        const regex = pattern ? new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$') : null;
        return paths.filter(p => (!regex || regex.test(vfs.basename(p))) && (typeIndex < 0 || (args[typeIndex + 1] === 'd' ? this.node(p).type === 'folder' : this.node(p).type === 'file'))).join('\n') + '\n';
      }
      case 'grep': {
        requireArgs(1); const pattern = rest.shift()!;
        let regex: RegExp;
        let source = has('F') ? escapePattern(pattern) : pattern;
        if (has('w')) source = `\\b(?:${source})\\b`;
        if (has('x')) source = `^(?:${source})$`;
        try {regex = new RegExp(source, has('i') ? 'i' : '');} catch {this.fail('arguments', pattern);}
        const selected = lines(input()).map((text, i) => ({text, i})).filter(e => regex.test(e.text) !== has('v'));
        if (has('o')) return selected.flatMap(e => [...e.text.matchAll(new RegExp(source, has('i') ? 'gi' : 'g'))].map(m => m[0])).filter(Boolean).map(s => s + '\n').join('');
        return has('c') ? selected.length + '\n' : selected.map(e => (has('n') ? `${e.i + 1}:` : '') + e.text + '\n').join('');
      }
      case 'head': case 'tail': {
        let count = 10;
        const optionIndex = args.findIndex(a => a === '-n' || a === '-c');
        if (optionIndex >= 0) {count = Number(args[optionIndex + 1]); const index = rest.indexOf(args[optionIndex + 1]); if (index >= 0) rest.splice(index, 1);}
        if (!Number.isInteger(count) || count < 0) this.fail('arguments', cmd);
        if (args[optionIndex] === '-c') {
          const bytes = new TextEncoder().encode(input());
          return new TextDecoder().decode(cmd === 'head' ? bytes.slice(0, count) : count ? bytes.slice(-count) : new Uint8Array());
        }
        const text = lines(input());
        return (cmd === 'head' ? text.slice(0, count) : count ? text.slice(-count) : []).map(l => l + '\n').join('');
      }
      case 'wc': {
        const text = input();
        const counts = [String((text.match(/\n/g) ?? []).length), String((text.match(/\S+/g) ?? []).length), String(new TextEncoder().encode(text).length), String([...text].length), String(Math.max(0, ...lines(text).map(line => [...line].length)))];
        return (flags.length ? counts.filter((_, i) => has(['l', 'w', 'c', 'm', 'L'][i])) : counts.slice(0, 3)).join(' ') + '\n';
      }
      case 'sort': {
        const key = (text: string) => {if (has('b')) text = text.trimStart(); return has('f') ? text.toLowerCase() : text;};
        let text = lines(input()).sort(has('n') ? (a, b) => Number(a) - Number(b) : (a, b) => key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);
        if (has('r')) text.reverse(); if (has('u')) text = [...new Set(text)];
        return text.map(l => l + '\n').join('');
      }
      case 'uniq': {
        const result: {text: string; count: number}[] = [];
        for (const text of lines(input())) {const last = result.at(-1); if (last?.text === text) last.count++; else result.push({text, count: 1});}
        return result.filter(e => !has('d') || e.count > 1).map(e => (has('c') ? `${e.count} ` : '') + e.text + '\n').join('');
      }
      case 'cut': {
        const fieldIndex = args.indexOf('-f'), delimiterIndex = args.indexOf('-d');
        if (fieldIndex < 0) this.fail('arguments', 'cut -d delimiter -f 1,2');
        const fields = args[fieldIndex + 1]?.split(',').map(Number) ?? [];
        if (!fields.length || fields.some(n => !Number.isInteger(n) || n < 1)) this.fail('arguments', cmd);
        const delimiter = delimiterIndex < 0 ? '\t' : args[delimiterIndex + 1];
        if (!delimiter || delimiter.length !== 1) this.fail('arguments', cmd);
        const filenames = args.filter((_, i) => ![fieldIndex, fieldIndex + 1, delimiterIndex, delimiterIndex >= 0 ? delimiterIndex + 1 : -1].includes(i));
        const text = filenames.length ? filenames.map(p => this.read(this.path(p))).join('') : stdin;
        return lines(text).map(l => fields.map(n => l.split(delimiter)[n - 1] ?? '').join(delimiter) + '\n').join('');
      }
      case 'tr': {
        requireArgs(has('d') ? 1 : 2);
        const expand = (s: string) => s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/(.)-(.)/g, (_, a: string, b: string) => {const size = b.charCodeAt(0) - a.charCodeAt(0) + 1; if (size < 1 || size > 256) this.fail('arguments', cmd); return Array.from({length: size}, (_, i) => String.fromCharCode(a.charCodeAt(0) + i)).join('');});
        const from = [...expand(rest[0])], to = [...expand(rest[1] ?? '')];
        return [...stdin].map(c => {const i = from.indexOf(c); return i < 0 ? c : has('d') ? '' : to[Math.min(i, to.length - 1)] ?? '';}).join('');
      }
      case 'basename': requireArgs(1); return vfs.basename(rest[0]) + '\n';
      case 'dirname': requireArgs(1); return vfs.parentPath(this.path(rest[0])) + '\n';
      case 'date': return new Date().toString() + '\n';
      case 'whoami': return 'user\n';
      case 'hostname': return 'hikari-browser\n';
      case 'uname': return 'Hikari browser shell (Unix-like)\n';
      case 'env': return Object.entries({...this.env, PWD: this.cwd}).map(([k, v]) => `${k}=${v}\n`).join('');
      case 'export': for (const arg of args) {const match = arg.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/s); if (!match) this.fail('arguments', cmd); this.env[match[1]] = match[2];} return '';
      case 'history': return this.history.map((l, i) => `${i + 1}  ${l}\n`).join('');
      case 'clear': case 'cls': case 'true': case 'false': return '';
      default: return this.fail('unknown', cmd);
    }
  }
}
