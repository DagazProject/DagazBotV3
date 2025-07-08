import { calculate } from "../qm/formula";
import { createQm, Location, QM } from "../qm/qmreader";
import { randomFromMathRandom } from "../qm/randomFunc";

const CX = 25;
const DX = 64;
const DY = 42;

const SCOPE_TYPE = {
   MACRO:          0,
   FOREACH:        1,
   SITE:           2,
   CASE:           3,
   VAR:            4
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

interface Var {
    name: string;
    id: number;
    range: string;
    def: number;
}

function createVar(name: string): Var {
    return {
        name,
        id: null,
        range: '0..1',
        def: 0
    };
}

interface Statement {
    name: string;
    expr: string;
}

function createStatement(name: string, expr: string): Statement {
    return {
        name,
        expr
    };
}

interface Case {
    from: string;
    to: string;
    text: string;
    lines: string[];
    stmts: Statement[];
    priority: number;
    order: number;
    expr: string;
    show: string;
    hide: string;
    ret: string;
}

function createCase(from: string, to: string): Case {
    return {
        from,
        to,
        text: '',
        lines: [],
        stmts: [],
        priority: 1,
        order: 1,
        expr: '',
        show: '',
        hide: '',
        ret: ''
    }
}

interface Page {
    num: number;
    lines: string[];
}

function createPage(num: number): Page {
    return {
        num,
        lines: []
    };
}

interface Site {
    name: string;
    id: number;
    num: number;
    pages: Page[];
    cases: Case[];
    spec: string;
    expr: string;
    stmts: Statement[];
    show: string;
    hide: string;
    isReturn: boolean;
    loc: Location;
}

function createSite(name: string, id: number): Site {
    return {
        name,
        id,
        num: 1,
        pages: [],
        cases: [],
        spec: '',
        expr: '',
        stmts: [],
        show: '',
        hide: '',
        isReturn: false,
        loc: null
    }
}

function getSite(ctx: ParseContext, name: string): Site {
    for (let i = 0; i < ctx.sites.length; i++) {
        if (ctx.sites[i].name == name) return ctx.sites[i];
    }
    return null;
}

function getPage(loc: Site, num: number): Page {
    for (let i = 0; i < loc.pages.length; i++) {
        if (loc.pages[i].num == num) {
            return loc.pages[i];
        }
    }
    const p = createPage(num);
    loc.pages.push(p);
    return p;
}

function addLine(site: Site, line: string) {
    const p = getPage(site, site.num);
    p.lines.push(line);
}

interface Scope {
    type: number;
    macro: Macro;
    site: Site;
    case: Case;
    vars: Var;
}

function createScope(type: number): Scope {
    return {
        type,
        macro: null,
        site: null,
        case: null,
        vars: null
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
    sites: Site[];
    vars: Var[];
    isCompatible: boolean;
    inc: number;
    ix: number;
    iy: number;
    vid: number;
}

export function createContext(): ParseContext {
  const qm = createQm();
  return {
    qm,
    macros: [],
    scopes: [],
    globals: [],
    sites: [],
    vars: [],
    isCompatible: true,
    inc: 1,
    ix: 0,
    iy: 0,
    vid: 0
  }
}

function getScope(ctx: ParseContext): Scope {
    if (ctx.scopes.length > 0) {
        return ctx.scopes[ctx.scopes.length - 1];
    }
    return null;
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
    const scope: Scope = getScope(ctx);
    if (scope === null) return;
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
    let scope = getScope(ctx);
    while (scope !== null) {
        if (scope.type == SCOPE_TYPE.VAR) {
            ctx.scopes.pop();
            ctx.vars.push(scope.vars);
        }
        scope = getScope(ctx);
    }
    const r = line.match(/^\s*#var:(\S+)/);
    if (r) {
        scope = createScope(SCOPE_TYPE.VAR);
        scope.vars = createVar(r[1]);
        let p = line.match(/#range:(\S+)/);
        if (p) {
            scope.vars.range = p[1];
        }
        p = line.match(/#default:(\d+)/);
        if (p) {
            scope.vars.def = Number(p[1]);
        }
        ctx.scopes.push(scope);
    }
}

function parseSite(line: string, ctx: ParseContext) {
    let scope = getScope(ctx);
    while (scope !== null) {
        if (scope.type == SCOPE_TYPE.VAR) {
            ctx.scopes.pop();
            ctx.vars.push(scope.vars);
        }
        if (scope.type == SCOPE_TYPE.CASE) {
            ctx.scopes.pop();
            const s = getScope(ctx);
            if (s === null) return;
            if (s.type == SCOPE_TYPE.SITE) {
                s.site.cases.push(scope.case);
            }
        } else if (scope.type == SCOPE_TYPE.SITE) {
            ctx.scopes.pop();
            ctx.sites.push(scope.site);
        } else break;
        scope = getScope(ctx);
    }
    const r = line.match(/^\s*#site:(\S+)/);
    if (r) {
        scope = createScope(SCOPE_TYPE.SITE);
        for (let i = 0; i < ctx.sites.length; i++) {
            if (ctx.sites[i].name == r[1]) {
                scope.site = ctx.sites[i];
                break;
            }
        }
        if (scope.site === null) {
            scope.site = createSite(r[1], ctx.sites.length + 1);
        }
        let p = line.match(/#(default|win|lose|death)/);
        if (p) {
            scope.site.spec = p[1];
        }
        p = line.match(/#show:(\S+)/);
        if (p) {
            scope.site.show = r[1];
        }
        p = line.match(/#hide:(\S+)/);
        if (p) {
            scope.site.hide = r[1];
        }
        p = line.match(/{([^}])}/);
        if (p) {
            scope.site.expr = p[1];
        }
        ctx.scopes.push(scope);
    }
}

function parseCase(line: string, ctx: ParseContext) {
    let scope = getScope(ctx);
    while (scope !== null) {
        if (scope.type == SCOPE_TYPE.VAR) {
            ctx.scopes.pop();
            ctx.vars.push(scope.vars);
        }
        if (scope.type == SCOPE_TYPE.CASE) {
            ctx.scopes.pop();
            const s = getScope(ctx);
            if (s === null) return;
            if (s.type == SCOPE_TYPE.SITE) {
                s.site.cases.push(scope.case);
            }
        } else break;
        scope = getScope(ctx);
    }
    if (scope === null) return;
    if (scope.type != SCOPE_TYPE.SITE) return;
    const r = line.match(/^\s*#case:(\S+)/);
    if (r) {
        const s = createScope(SCOPE_TYPE.CASE);
        s.case = createCase(scope.site.name, r[1]);
        let p = line.match(/#order:(\d+)/);
        if (p) {
            s.case.order = Number(p[1]);
        }
        p = line.match(/#priority:(\d+)/);
        if (p) {
            s.case.priority = Number(p[1]);
        }
        p = line.match(/#show:(\S+)/);
        if (p) {
            s.case.show = p[1];
        }
        p = line.match(/#hide:(\S+)/);
        if (p) {
            s.case.hide = r[1];
        }
        p = line.match(/\'([^']+)\'/);
        if (p) {
            s.case.text = p[1];
        }
        p = line.match(/{([^}])}/);
        if (p) {
            s.case.expr = p[1];
        }
        p = line.match(/#return:(\S+)/);
        if (p) {
            if (ctx.vid == 0) {
                const v = createVar('RRR');
                v.id = 1;
                v.range = '0..1000000';
                ctx.vars.push(v);
                ctx.vid = 1;
            }
            s.case.ret = p[1];
        }
        ctx.scopes.push(s);
    }
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
    const scope: Scope = getScope(ctx);
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
    if (cmd == 'return') {
        if (scope === null) return;
        if (scope.type != SCOPE_TYPE.SITE) return;
        if (ctx.vid == 0) {
            const v = createVar('RRR');
            v.id = 1;
            v.range = '0..1000000';
            ctx.vars.push(v);
            ctx.vid = 1;
        }
        scope.site.isReturn = true;
        return;
    }
    if (cmd == 'global') {
        const r = line.match(/^\s*#global:([^:]+):(\d+)/);
        if (r) {
            for (let i = 0; i < ctx.globals.length; i++) {
                if (ctx.globals[i].name == r[1]) {
                    ctx.globals[i].value = r[2];
                    break;
                }
            }
        }
    }
    if (cmd == 'page') {
        if (scope === null) return;
        if (scope.type != SCOPE_TYPE.SITE) return;
        const r = line.match(/^\s*#page:(\d+)/);
        if (r) {
            scope.site.num = Number(r[1]);
        }
    }
    if (cmd == 'compatible') {
        const r = line.match(/^\s*#compatible:off/);
        if (r) ctx.isCompatible = false;
    }
    parseCustom(cmd, line, ctx);
}

function parseStatement(line: string, ctx: ParseContext) {
    if (ctx.scopes.length == 0) return;
    const scope: Scope = getScope(ctx);
    const r = line.match(/^\s\$([^\s=]+)\s*=\s*(\S.+)/);
    if (r) {
        if (scope.type == SCOPE_TYPE.SITE) {
            const s: Statement = createStatement(r[1], r[2]);
            scope.site.stmts.push(s);
        }
        if (scope.type == SCOPE_TYPE.CASE) {
            const s: Statement = createStatement(r[1], r[2]);
            scope.case.stmts.push(s);
        }
    }
}

function parseString(line: string, ctx: ParseContext) {
    if (ctx.scopes.length == 0) return;
    const scope: Scope = getScope(ctx);
    if (scope === null) return;
    if ((scope.type == SCOPE_TYPE.MACRO) || (scope.type == SCOPE_TYPE.FOREACH)) {
        scope.macro.lines.push(line);
        return;
    }
    if (scope.type == SCOPE_TYPE.SITE) {
        addLine(scope.site, line);
        return;
    }
    if (scope.type == SCOPE_TYPE.CASE) { 
        scope.case.lines.push(line);
    }
}

export function parseLine(line: string, ctx: ParseContext) {
    let isMacro = false;
    const scope: Scope = getScope(ctx);
    if (scope === null) return;
    if (scope.type <= SCOPE_TYPE.FOREACH) isMacro = true;
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

function prepareLocation(s: Site) {
    // TODO: Подготовить локацию

}

function prepareJump(c: Case) {
    // TODO: Подготовить переход

}

function addReturns(ctx: ParseContext, jump: Case, ret: string) {
    const t = getSite(ctx, ret);
    const s = getSite(ctx, jump.to);
    if ((t === null) || (s === null)) return;
    const g: Site[] = [s];
    const ids: number[] = [];
    for (let i = 0; i < g.length; i++) {
         ids.push(g[i].id);
         if (g[i].isReturn) {
            const j: Case = createCase(g[i].name, ret);
            j.expr = '($RRR mod 256)='+t.id;
            const st = createStatement('RRR', '$RRR div 256');
            j.stmts.push(st);
            continue;
         }
         for (let j = 0; j < g[i].cases.length; j++) {
            const s = getSite(ctx, g[i].cases[j].to);
            if (s === null) continue;
            if (ids.indexOf(s.id) >= 0) continue
            g.push(s);
         }
    }
    const st = createStatement('RRR', '$RRR*256+' + t.id);
    jump.stmts.push(st);
}

function findLocation(ctx: ParseContext, name: string): number {
    for (let i = 0; i < ctx.sites.length; i++) {
        if (ctx.sites[i].name == name) return i;
    }
    return null;
}

export function closeContext(ctx: ParseContext):QM {
    while (ctx.scopes.length > 0) {
        const s: Scope = ctx.scopes.pop();
        if (s.type == SCOPE_TYPE.VAR) {
            ctx.vars.push(s.vars);
        }
        if (s.type == SCOPE_TYPE.CASE) {
            const scope: Scope = getScope(ctx);
            if ((scope !== null) && (scope.type == SCOPE_TYPE.SITE)) {
                scope.site.cases.push(s.case);
            }
        }
        if (s.type == SCOPE_TYPE.SITE) {
            ctx.sites.push(s.site);
        }
    }
    const g: number[] = [];
    for (let i = 0; i < ctx.sites.length; i++) {
        prepareLocation(ctx.sites[i]);
        if (ctx.sites[i].loc.isStarting) {
            g.push(i);
        }
    }
    for (let i = 0; i < ctx.sites.length; i++) {
        for (let j = 0; j < ctx.sites[i].cases.length; j++) {
            if (ctx.sites[i].cases[j].ret != '') {
                addReturns(ctx, ctx.sites[i].cases[j], ctx.sites[i].cases[j].ret);
            }
            prepareJump(ctx.sites[i].cases[j]);
        }
    }
    for (let i = 0; i < ctx.vars.length; i++) {
        // TODO: Сформировать параметры

    }
    for (let i = 0; i < g.length; i++) {
        const l: Location = ctx.sites[g[i]].loc;
        l.locX = (ctx.ix * DX) + 32;
        l.locY = (ctx.iy * DY) + 63;
        ctx.ix += ctx.inc;
        if (ctx.ix >= CX) {
            ctx.iy++;
            ctx.inc = -1;
            ctx.ix--;
        }
        if (ctx.ix < 0) {
            ctx.iy++;
            ctx.inc = 1;
            ctx.ix++;
        }
        ctx.qm.locations.push(l);
        ctx.qm.locationsCount++;
        for (let j = 0; j < ctx.sites[g[i]].cases.length; j++) {
            const to: string = ctx.sites[g[i]].cases[j].to;
            const ix: number = findLocation(ctx, to);
            if (ix !==  null) {
                if (g.indexOf(ix) < 0) g.push(ix);
                // Сформировать переходы

            }
        }
    }
    return ctx.qm;
}