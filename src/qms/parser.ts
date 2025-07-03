import { calculate } from "../qm/formula";
import { createQm, QM } from "../qm/qmreader";
import { randomFromMathRandom } from "../qm/randomFunc";

const SCOPE_TYPE = {
   MACRO:          0,
   FOREACH:        1,
   SITE:           2,
   CASE:           3
};

interface Macro {
    name: string;
    params: string[];
    lines: string[];
    ranges: string;
}

function createMacro(name: string): Macro {
    return {
        name,
        params: [],
        lines: [],
        ranges: ''
    }
}

interface Scope {
    type: number;
    macro: Macro;
}

function createScope(type: number): Scope {
    return {
        type,
        macro: null
    }
}

interface Global {
    name: string;
    value: string;
}

function createGlobal(name: string): Global {
    return {
        name,
        value: '0'
    }
}

export interface ParseContext {
    qm: QM;
    macros: Macro[];
    scopes: Scope[];
    globals: Global[];
}

export function createContext(): ParseContext {
  const qm = createQm();
  return {
    qm,
    macros: [],
    scopes: [],
    globals: []
  }
}

function parseMacro(line: string, ctx: ParseContext) {
    const r = line.match(/^\s*#macro:([^\s]+)/);
    if (r) {
        const args = r[1].split(/:/);
        const name = args[0];
        const scope = createScope(SCOPE_TYPE.MACRO);
        scope.macro = createMacro(name);
        for (let i = 1; i < args.length; i++) {
            scope.macro.params.push(args[i]);
        }
        ctx.scopes.push(scope);
    }
}

function parseForeach(line: string, ctx: ParseContext) {
    const r = line.match(/^\s*#foreach:([^\s:]+):([^\s]+)/);
    if (r) {
        const scope = createScope(SCOPE_TYPE.FOREACH);
        scope.macro = createMacro('foreach');
        scope.macro.params.push(r[1]);
        scope.macro.ranges = r[2];
        ctx.scopes.push(scope);
    }
}

function getGlobal(name: string, ctx: ParseContext): Global {
    for (let i = 0; i < ctx.globals.length; i++) {
        if (ctx.globals[i].name == name) return ctx.globals[i];
    }
    const g: Global = createGlobal(name);
    ctx.globals.push(g);
    return g;
}

function getNextChar(char: string): string {
  return String.fromCharCode(char.charCodeAt(0) + 1);
}

function iterateRange(range: string, callback) {
    const r = range.match(/^\s*([^.]+)\s*\.\.\s*(\S+)/);
    if (r) {
        if (r[1].match(/\n+/) && r[1].match(/\n+/)) {
            for (let i = +r[1]; i <= +r[2]; i++) {
                callback(i);
            }
        } else {
            let c = r[1];
            while (true) {
                callback(c);
                if (c == r[2]) break;
                c = getNextChar(c);
            }
        }
    } else {
        callback(r);
    }
}

function parseEnd(line: string, ctx: ParseContext) {
    if (ctx.scopes.length == 0) return;
    const scope: Scope = ctx.scopes[ctx.scopes.length - 1];
    let r = line.match(/^\s*#end:([^\s]+)/);
    if (r) {
        const args = r[1].split(/:/);
        for (let i = 0; i < args.length; i++) {
            const g: Global = getGlobal(args[i], ctx);
            scope.macro.params.push(g.name);
        }
    }
    if (scope.type == SCOPE_TYPE.MACRO) {
        ctx.macros.push(scope.macro);
    }
    if (scope.type == SCOPE_TYPE.FOREACH) {
        const ranges = scope.macro.ranges.split(/;/);
        for (let i = 0; i < ranges.length; i++) {
            iterateRange(ranges[i], (ix) => {
                const g: Global = createGlobal(scope.macro.params[0]);
                g.value = ix;
                const c: Global[] = [g];
                for (let i = 0; i < scope.macro.lines.length; i++) {
                     const s: string = expandMeta(scope.macro.lines[i], c);
                     parseLine(s, ctx);
                }
            });
        }
    }
    ctx.scopes.pop();
}

function parseVar(line: string, ctx: ParseContext) {

}

function parseSite(line: string, ctx: ParseContext) {

}

function parseCase(line: string, ctx: ParseContext) {

}

function getMacro(name: string, ctx: ParseContext): Macro {
    for (let i = 0; i < ctx.macros.length; i++) {
        if (ctx.macros[i].name == name) return ctx.macros[i];
    }
    return null;
}

function findValue(name: string, c: Global[]): number {
    for (let i = 0; i < c.length; i++) {
        if (c[i].name == name) return i;
    }
    return null;
}

function substParam(s: string, c: Global[]): string {
    let r = s.match(/\$([^\s$+\-*\/.\]]+)/);
    while (r) {
        const name = r[1];
        const ix = findValue(name, c);
        if (ix !== null) {
            s.replace('$' + name, '[p' + (+ix+1) + ']');
        } else {
            s.replace('$' + name, '0');
        }
        r = s.match(/\$([^\s$+\-*\/.\]]+)/);
    }
    return s;
}

function expandMeta(s: string, c: Global[]): string {
    let r = s.match(/\[([^]]+)\]/);
    while (r) {
        const e = r[1].match(/\$([a-zA-Z0-9_]+)/);
        let f: string = '';
        if (e) {
            for (let i = 0; i < c.length; i++) {
                if (c[i].name == e[1]) {
                    f = c[i].value;
                    break;
                }
            }
        } else {
            f = substParam(r[1], c);
            const p: number[] = [];
            for (let i = 0; i < c.length; i++) {
                p.push(Number(c[i].value));
            }
            f = String(calculate(f, p, randomFromMathRandom));
        }
        s.replace(r[1], f);
        r = s.match(/\[([^]]+)\]/);
    }
    s.replace(/\[\]/g, '');
    return s;
}

function parseCustom(cmd:string, line: string, ctx: ParseContext) {
    const m: Macro = getMacro(cmd, ctx);
    const c: Global[] = [];
    if (m === null) return;
    const r = line.match(/^\s*#[^:\s]+:(\S+)/);
    if (r) {
        const args = r[1].split(/:/);
        for (let i = 0; i < args.length; i++) {
            if (i >= m.params.length) break;
            const g: Global = createGlobal(m.params[i]);
            g.value = args[i];
            c.push(g);
        }
    }
    for (let i = 0; i < m.params.length; i++) {
        const g: Global = getGlobal(m.params[i], ctx);
        if (g !== null) {
            c.push(g);
        }
    }
    for (let i = 0; i < m.lines.length; i++) {
        const s: string = expandMeta(m.lines[i], c);
        parseLine(s, ctx);
    }
    for (let i = 0; i < m.params.length; i++) {
        const g: Global = getGlobal(m.params[i], ctx);
        if (g !== null) {
            g.value = String(Number(g.value) + 1);
        }
    }
}

function parseCommand(cmd:string, line: string, ctx: ParseContext) {
    if (cmd == 'macro') {
        parseMacro(line, ctx);
        return;
    }
    if (cmd == 'foreach') {
        parseForeach(line, ctx);
        return;
    }
    if (cmd == 'end') {
        parseEnd(line, ctx);
        return;
    }
    if (cmd == 'var') {
        parseVar(line, ctx);
        return;
    }
    if (cmd == 'site') {
        parseSite(line, ctx);
        return;
    }
    if (cmd == 'case') {
        parseCase(line, ctx);
        return;
    }
    parseCustom(cmd, line, ctx);
}

function parseStatement(line: string, ctx: ParseContext) {

}

function parseString(line: string, ctx: ParseContext) {
    if (ctx.scopes.length == 0) return;
    const scope: Scope = ctx.scopes[ctx.scopes.length - 1];
    if ((scope.type == SCOPE_TYPE.MACRO) || (scope.type == SCOPE_TYPE.FOREACH)) {
        scope.macro.lines.push(line);
        return;
    }
    // TODO:

}

export function parseLine(line: string, ctx: ParseContext) {
    let isMacro = false;
    if (ctx.scopes.length > 0) {
        if (ctx.scopes[ctx.scopes.length - 1].type <= SCOPE_TYPE.FOREACH) isMacro = true;
    }
    const r = line.match(/^\s*#([^:\s]+)/);
    if (r && !isMacro) {
        parseCommand(r[1], line, ctx);
    } else {
        const r = line.match(/^\s*\$[^=]+/);
        if (r && !isMacro) {
            parseStatement(line, ctx);
        } else {
            parseString(line, ctx);
        }
    }
}

export function closeContext(ctx: ParseContext):QM {
    while (ctx.scopes.length > 0) {
        const scope: Scope = ctx.scopes.pop();
        if (scope.type == SCOPE_TYPE.CASE) {
            // TODO:

        }
        if (scope.type == SCOPE_TYPE.SITE) {
            // TODO:

        }
    }
    // TODO:

    return ctx.qm;
}