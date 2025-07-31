import { calculate } from "../qm/formula";
import { addJump, addLocation, addParam, createJump, createLocation, createParam, createQm, Jump, Location, QM, QMParam } from "../qm/qmreader";
import { randomFromMathRandom } from "../qm/randomFunc";

const CX = 25;
const DX = 64;
const DY = 42;

const SCOPE_TYPE = {
   MACRO:          0,
   FOREACH:        1,
   SITE:           2,
   CASE:           3,
   VAR:            4,
   INTRO:          5,
   CONGRAT:        6
};

interface Macro {
    name: string;
    params: string[];
    lines: string[];
    ranges: string[];
}

function createMacro(name: string): Macro {
    return {
        name,
        params: [],
        lines: [],
        ranges: []
    }
}

interface Text {
    range: string;
    value: string;
}

function createText(range: string): Text {
    return {
        range,
        value: ''
    }
}

const VAR_TYPE = {
    NONE:  0,
    WIN:   1,
    LOSE:  2,
    DEATH: 3
};

interface Var {
    name: string;
    id: number;
    range: string;
    def: string;
    texts: Text[];
    type: number;
    message: string;
    lim: number;
    isNeg: boolean;
    order: number;
}

function createVar(name: string): Var {
    return {
        name,
        id: null,
        range: '0..1',
        def: '0',
        texts: [],
        type: VAR_TYPE.NONE,
        message: '',
        lim: null,
        isNeg: false,
        order: null
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
    jump: Jump;
}

function createCase(from: string, to: string): Case {
    return {
        from,
        to,
        text: '',
        lines: [],
        stmts: [],
        priority: 1,
        order: 5,
        expr: '',
        show: '',
        hide: '',
        ret: '',
        jump: null
    }
}

interface Page {
    num: number;
    lines: string[];
    image: string;
}

function createPage(num: number): Page {
    return {
        num,
        lines: [],
        image: ''
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
    x: number;
    y: number;
    image: string;
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
        loc: null,
        x: null,
        y: null,
        image: ''
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
    if (loc.image != '') {
        p.image = loc.image;
    }
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
    isIncremetable: boolean;
}

function createGlobal(name: string): Global {
    return {
        name,
        value: '0',
        isIncremetable: false
    }
}

const COMPAT_TYPE = {
    OFF:    0,
    ON:     1,
    DEBUG:  2
};

export interface ParseContext {
    qm: QM;
    macros: Macro[];
    scopes: Scope[];
    globals: Global[];
    sites: Site[];
    vars: Var[];
    compatibleType: number;
    inc: number;
    ix: number;
    iy: number;
    vid: number;
    jid: number;
    intro: string;
    congrat: string;
    cnt: number;
    params: Global[];
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
    compatibleType: COMPAT_TYPE.ON,
    inc: 1,
    ix: 0,
    iy: 0,
    vid: 0,
    jid: 0,
    intro: '',
    congrat: '',
    cnt: 0,
    params: []
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
        const params = r[1].split(/;/);
        for (let i = 0; i < params.length; i++) {
            scope.macro.params.push(params[i]);
        }
        const ranges = r[2].split(/:/);
        for (let i = 0; i < ranges.length; i++) {
            scope.macro.ranges.push(ranges[i]);
        }
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
        callback(range);
    }
}

function getRangeIx(r: string, pos: number) {
    const ranges = r.split(/;/);
    let num = 0; let res = null;
    for (let i = 0; i < ranges.length; i++) {
        iterateRange(ranges[i], (ix) => {
            if (num == pos) {
                res = ix;
            }
            num++;
        });
    }
    return res;
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
            g.isIncremetable = true;
            scope.macro.params.push(g.name);
        }
    }
    if (scope.type == SCOPE_TYPE.MACRO) {
        ctx.macros.push(scope.macro);
    }
    if (scope.type == SCOPE_TYPE.FOREACH) {
        if (scope.macro.ranges.length == 0) return;
        const ranges = scope.macro.ranges[0].split(/;/);
        let num = 0;
        for (let i = 0; i < ranges.length; i++) {
            iterateRange(ranges[i], (ix) => {
                const g: Global = createGlobal(scope.macro.params[0]);
                g.value = String(ix);
                ctx.params.push(g);
                let cn = 1;
                for (let j = 1; j < scope.macro.params.length; j++) {
                    const g: Global = createGlobal(scope.macro.params[j]);
                    g.value = getRangeIx(scope.macro.ranges[j], num);
                    ctx.params.push(g);
                    cn++;
                }
                const c: Global[] = [];
                const names: string[] = [];
                for (let j = ctx.params.length - 1; j >= 0; j--) {
                    if (names.indexOf(ctx.params[j].name) >= 0) continue;
                    c.push(ctx.params[j]);
                    names.push(ctx.params[j].name);
                }
                for (let j = 0; j < ctx.globals.length; j++) {
                    if (names.indexOf(ctx.globals[j].name) >= 0) continue;
                    c.push(ctx.globals[j]);
                    names.push(ctx.globals[j].name);
                }
                for (let j = 0; j < scope.macro.lines.length; j++) {
                     const s: string = expandMacro(scope.macro.lines[j], c);
                     parseLine(s, ctx);
                }
                num++;
                while (cn > 0 && ctx.params.length > 0) {
                    ctx.params.pop();
                }
            });
        }
    }
    ctx.scopes.pop();
}

function parseVar(line: string, ctx: ParseContext) {
    let scope = getScope(ctx);
    while (scope !== null) {
        if (scope.type == SCOPE_TYPE.INTRO || scope.type == SCOPE_TYPE.CONGRAT) {
            ctx.scopes.pop();
        }
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
        p = line.match(/#default:(\S+)/);
        if (p) {
            scope.vars.def = p[1];
        }
        p = line.match(/#order:(\d+)/);
        if (p) {
            scope.vars.order = Number(p[1]);
        }
        ctx.scopes.push(scope);
    }
}

function parseSite(line: string, ctx: ParseContext) {
    let scope = getScope(ctx);
    while (scope !== null) {
        if (scope.type == SCOPE_TYPE.INTRO || scope.type == SCOPE_TYPE.CONGRAT) {
            ctx.scopes.pop();
        }
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
        p = line.match(/{([^}]+)}/);
        if (p) {
            scope.site.expr = p[1];
        }
        p = line.match(/#image:(\S+)/);
        if (p) {
            scope.site.image = p[1];
        }
        ctx.scopes.push(scope);
    }
}

function parseCase(line: string, ctx: ParseContext) {
    let scope = getScope(ctx);
    while (scope !== null) {
        if (scope.type == SCOPE_TYPE.INTRO || scope.type == SCOPE_TYPE.CONGRAT) {
            ctx.scopes.pop();
        }
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
        p = line.match(/{([^}]+)}/);
        if (p) {
            s.case.expr = p[1];
        }
        p = line.match(/#return:(\S+)/);
        if (p) {
            if (ctx.vid == 0) {
                const v = createVar('RRR');
                v.id = 1;
                v.range = '0..100000000';
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
            s = s.replace('$' + name, '[p' + (+ix+1) + ']');
        } else {
            s = s.replace('$' + name, '0');
        }
        r = s.match(/\$([^\s$+\-*\/.\]]+)/);
    }
    return s;
}

function expandMacro(s: string, c: Global[]): string {
    let r = s.match(/\[([^\]]+)\]/);
    while (r) {
        const e = r[1].match(/^\$([a-zA-Z0-9_]+$)/);
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
        s = s.replace('[' + r[1] + ']', f);
        r = s.match(/\[([^\]]+)\]/);
    }
    s = s.replace(/\[\]/g, '');
    return s;
}

function findGlobal(name: string, c: Global[]): Global {
    for (let i = 0;i < c.length; i++) {
        if (c[i].name == name) return c[i];
    }
    return null;
}

function parseCustom(cmd:string, line: string, ctx: ParseContext) {
    const m: Macro = getMacro(cmd, ctx);
    if (m === null) return;
    let cn: number = 0;
    const r = line.match(/^\s*#[^:\s]+:(\S+)/);
    if (r) {
        const args = r[1].split(/:/);
        for (let i = 0; i < args.length; i++) {
            if (i >= m.params.length) break;
            const g: Global = createGlobal(m.params[i]);
            g.value = args[i];
            ctx.params.push(g);
            cn++;
        }
    }
    const names: string[] = [];
    const c: Global[] = [];
    for (let i = ctx.params.length - 1; i >= 0; i--) {
        if (names.indexOf(ctx.params[i].name) >= 0) continue;
        c.push(ctx.params[i]);
        names.push(ctx.params[i].name);
    }
    for (let i = 0; i < ctx.globals.length; i++) {
        if (names.indexOf(ctx.globals[i].name) >= 0) continue;
        c.push(ctx.globals[i]);
        names.push(ctx.globals[i].name);
    }
    for (let i = 0; i < m.lines.length; i++) {
        const s: string = expandMacro(m.lines[i], c);
        parseLine(s, ctx);
    }
    while (cn > 0 && ctx.params.length > 0) {
        ctx.params.pop();
    }
    for (let i = 0; i < m.params.length; i++) {
        const g: Global = getGlobal(m.params[i], ctx);
        if (g !== null && g.isIncremetable) {
            g.value = String(Number(g.value) + 1);
        }
    }
}

function parseCommand(cmd:string, line: string, ctx: ParseContext) {
    const scope: Scope = getScope(ctx);
    if (cmd == 'macro') {
        parseMacro(line, ctx);
    } else
    if (cmd == 'foreach') {
        parseForeach(line, ctx);
    } else
    if (cmd == 'end') {
        parseEnd(line, ctx);
    } else
    if (cmd == 'var') {
        parseVar(line, ctx);
    } else
    if (cmd == 'site') {
        parseSite(line, ctx);
    } else
    if (cmd == 'case') {
        parseCase(line, ctx);
    } else
    if (cmd == 'intro') {
        const scope = createScope(SCOPE_TYPE.INTRO);
        ctx.scopes.push(scope);
    } else
    if (cmd == 'congratulation') {
        const scope = createScope(SCOPE_TYPE.CONGRAT);
        ctx.scopes.push(scope);
    } else
    if (cmd == 'position') {
        const r = line.match(/^\s*#position:([^:\s]+):(\d+):(\d+)/);
        const s: Site = getSite(ctx, r[1]);
        if (s !== null) {
            s.x = Number(r[2]);
            s.y = Number(r[3]);
        }
    } else
    if (cmd == 'text') {
        if (scope === null) return;
        if (scope.type != SCOPE_TYPE.VAR) return;
        const r = line.match(/^\s*#text:([^:\s]+)/);
        if (r) {
            const t = createText(r[1]);
            const s = line.match(/\'([^\']*)\'/);
            if (s) {
                t.value = s[1];
            }
            scope.vars.texts.push(t);
        }
    } else
    if (cmd == 'message') {
        if (scope === null) return;
        if (scope.type != SCOPE_TYPE.VAR) return;
        let r = line.match(/^\s*#message:([+-])(\d+)/);
        if (r) {
            const v = getVar(ctx, scope.vars.name);
            if (v !== null) {
                v.lim = Number(r[2]);
                if (r[1] == '-') {
                    v.isNeg = true;
                }
                r = line.match(/#(win|lose|death):\'([^\']*)\'/);
                if (r) {
                    v.message = r[2];
                    if (r[1] == 'win') {
                        v.type = VAR_TYPE.WIN;
                    }
                    if (r[1] == 'lose') {
                        v.type = VAR_TYPE.LOSE;
                    }
                    if (r[1] == 'death') {
                        v.type = VAR_TYPE.DEATH;
                    }
                }
            }
        }
    } else
    if (cmd == 'return') {
        if (scope === null) return;
        if (scope.type != SCOPE_TYPE.SITE) return;
        if (ctx.vid == 0) {
            const v = createVar('RRR');
            v.id = 1;
            v.range = '0..100000000';
            ctx.vars.push(v);
            ctx.vid = 1;
        }
        scope.site.isReturn = true;
    } else
    if (cmd == 'global') {
        const r = line.match(/^\s*#global:([^:]+):(\S+)/);
        if (r) {
            const g: Global = getGlobal(r[1], ctx);
            if (g !== null) {
                g.value = r[2];
            }
        }
    } else
    if (cmd == 'page') {
        if (scope === null) return;
        if (scope.type != SCOPE_TYPE.SITE) return;
        let r = line.match(/^\s*#page:(\d+)/);
        if (r) {
            scope.site.num = Number(r[1]);
            r = line.match(/#image:(\S+)/);
            if (r) {
                scope.site.image = r[1];
            }
        }
    } else
    if (cmd == 'compatible') {
        const r = line.match(/^\s*#compatible:(on|off|debug)/);
        if (r) {
            if (r[1] == 'on') ctx.compatibleType    = COMPAT_TYPE.ON;
            if (r[1] == 'off') ctx.compatibleType   = COMPAT_TYPE.OFF;
            if (r[1] == 'debug') ctx.compatibleType = COMPAT_TYPE.DEBUG;
        }
    } else {
        parseCustom(cmd, line, ctx);
    }
}

function parseStatement(line: string, ctx: ParseContext) {
    if (ctx.scopes.length == 0) return;
    const scope: Scope = getScope(ctx);
    const r = line.match(/^\s*\$([^\s=]+)\s*=\s*(\S.*)/);
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
    if (scope.type == SCOPE_TYPE.INTRO) {
        if (ctx.intro != '')  {
            ctx.intro = ctx.intro + '\n' + line;
        } else {
            if (line != '') {
                ctx.intro = line;
            }
        }
    } else 
    if (scope.type == SCOPE_TYPE.CONGRAT) {
        if (ctx.congrat != '')  {
            ctx.congrat = ctx.congrat + '\n' + line;
        } else {
            if (line != '') {
                ctx.congrat = line;
            }
        }
    } else 
    if (scope.type == SCOPE_TYPE.SITE) {
        addLine(scope.site, line);
    } else
    if (scope.type == SCOPE_TYPE.CASE) { 
        scope.case.lines.push(line);
    }
}

export function parseLine(line: string, ctx: ParseContext) {
    let isMacro = false;
    const scope: Scope = getScope(ctx);
    if (scope !== null) {
       if (scope.type <= SCOPE_TYPE.FOREACH) isMacro = true;
    }
    let r = line.match(/^\s*#([^:\s]+)/);
    if (r && !isMacro) {
        parseCommand(r[1], line, ctx);
    } else {
        if (r && r[1] == 'foreach') {
            ctx.cnt++;
        }
        if (r && r[1] == 'end') {
            if (ctx.cnt == 0) {
                parseCommand(r[1], line, ctx);
                return;
            } else {
                ctx.cnt--;
            }
        }
        r = line.match(/^\s*\$[^=]+/);
        if (r && !isMacro) {
            parseStatement(line, ctx);
        } else {
            parseString(line, ctx);
        }
    }
}

function getVar(ctx: ParseContext, name: string): Var {
    for (let i = 0; i < ctx.vars.length; i++) {
        if (ctx.vars[i].name == name) return ctx.vars[i];
    }
    return null;
}

function prepareFormula(ctx: ParseContext, s: string): string {
    let r = s.match(/\$([a-zA-Z0-9_]+)/);
    while (r) {
        const name: string = r[1];
        const v: Var = getVar(ctx, name);
        if (v !== null) {
            if (v.id === null) {
                ctx.vid++;
                v.id = ctx.vid;
            }
            s = s.replace('$' + name, '[p' + v.id + ']');
        } else {
            s = s.replace('$' + name, '');
        }
        r = s.match(/\$([a-zA-Z0-9_]+)/);
    }
    r = s.match(/<([0-9.-]+)>/);
    while (r) {
        s = s.replace('<' + r[1] + '>', '[' + r[1] + ']');
        r = s.match(/<([0-9.-]+)>/);
    }
    return s;
}

function prepareText(ctx: ParseContext, s: string, isParam: boolean): string {
    let r = s.match(/#([^:]):?([A-Za-z0-9_:]+)?/);
    while (r) {
        let args: string[] = [];
        if (r[2]) {
            args = r[2].split(':');
        }
        let f: string = '';
        const m = getMacro(r[1], ctx);
        if (m !== null) {
            const c: Global[] = [];
            for (let i = 0; i < m.params.length; i++) {
                if (i >= args.length) break;
                const g: Global = createGlobal(m.params[i]);
                g.value = args[i];
                c.push(g);
            }
            for (let i = 0; i < ctx.globals.length; i++) {
                const g = ctx.globals[i];
                const r = findGlobal(g.name, c);
                if (r !== null) continue;
                c.push(g);
            }
            for (let i = 0; i < m.lines.length; i++) {
                const s: string = expandMacro(m.lines[i], c);
                if (f != '') f = f + '\\n';
                f = f + s;
            }
        }
        if (r[2]) {
            s = s.replace('#' + r[1] + ':' + r[2], f);
        } else {
            s = s.replace('#' + r[1], f);
        }
        r = s.match(/#([^:]):([A-Za-z0-9_:]+)/);
    }
    r = s.match(/{([^}]+)}/);
    while (r) {
        const f = prepareFormula(ctx, r[1]);
        s = s.replace('{' + r[1] + '}', '<<' + f + '>>');
        s = s.replace(/\*/g, '&&');
        r = s.match(/{([^}]+)}/);
    }
    s = s.replace(/<</g, '{');
    s = s.replace(/>>/g, '}');
    r = s.match(/(\$|@)([a-zA-Z0-9_]+)/);
    while (r) {
        const name: string = r[2];
        const v: Var = getVar(ctx, name);
        if (v !== null) {
            if (v.id === null) {
                ctx.vid++;
                v.id = ctx.vid;
            }
            if (r[1] == '$') {
                s = s.replace(r[1] + name, '[p' + v.id + ']');
            } else {
                s = s.replace(r[1] + name, '[d' + v.id + ']');
            }
        } else {
            s = s.replace(r[1] + name, '');
        }
        r = s.match(/(\$|@)([a-zA-Z0-9_]+)/);
    }
    if (isParam) {
        s = s.replace(/\$/g, '<>');
    }
    r = s.match(/\*([^*]+)\*/);
    while (r) {
        s = s.replace('*' + r[1] + '*', '<clr>' + r[1] + '<clrEnd>');
        r = s.match(/\*([^*]+)\*/);
    }
    r = s.match(/\^([^\^]+)\^/);
    while (r) {
        s = s.replace('^' + r[1] + '^', '<fix>' + r[1] + '</fix>');
        r = s.match(/\^([^\^]+)\^/);
    }
    if (ctx.compatibleType == COMPAT_TYPE.OFF) {
        r = s.match(/~([^~]+)~/);
        while (r) {
            s = s.replace('~' + r[1] + '~', '<tg-spoiler>' + r[1] + '</tg-spoiler>');
            r = s.match(/~([^~]+)~/);
        }
    }
    s = s.replace(/&&/g, '*');
    return s;
}

function prepareLocation(ctx: ParseContext, s: Site) {
    s.loc = createLocation(s.id);
    let isEmpty: boolean = true;
    for (let i =0; i < s.pages.length; i++) {
        const p: Page = s.pages[i];
        let skip: boolean = true;
        let cn: number = 0;
        for (let j = 0; j < p.lines.length; j++) {
            const t = prepareText(ctx, p.lines[j], false);
            if (t.trim() != '') {
                skip = false;
                if (s.loc.texts[p.num - 1] === undefined) s.loc.texts[p.num - 1] = '';
                for (let k = 0; k < cn; k++) {
                    s.loc.texts[p.num - 1] = s.loc.texts[p.num - 1] + '\n';
                }
                s.loc.texts[p.num - 1] = s.loc.texts[p.num - 1] + t + '\n';
                isEmpty = false;
                cn = 0;
            } else if (!skip) {
                cn++;
            }
        }
        if (p.image != '') {
            s.loc.media[p.num - 1] = {
                img: p.image,
                sound: undefined,
                track: undefined
            };
        }
    }
    if (s.spec == 'default') {
        s.loc.isStarting = true;
    } else if (s.spec == 'win') {
        s.loc.isSuccess = true;
    } else if (s.spec == 'lose') {
        s.loc.isFaily = true;
    } else if (s.spec == 'death') {
        s.loc.isFailyDeadly = true;
    }
    if (!isEmpty && ctx.compatibleType != COMPAT_TYPE.OFF) {
        s.loc.isEmpty = false;
    }
    if (isEmpty && ctx.compatibleType == COMPAT_TYPE.DEBUG) {
        s.loc.texts[0] = s.name;
    }
    if (s.expr != '') {
        const f: string = prepareFormula(ctx, s.expr);
        s.loc.isTextByFormula = true;
        s.loc.textSelectFormula = f;
    }
    for (let i = 0; i < s.stmts.length; i++) {
        const st: Statement = s.stmts[i];
        prepareFormula(ctx, st.name);
        st.expr = prepareFormula(ctx, st.expr);
    }
}

function prepareJump(ctx: ParseContext, c: Case) {
    const f = getSite(ctx, c.from);
    const t = getSite(ctx, c.to);
    if (f === null || t === null) return;
    if (c.text != '') {
        c.text = prepareText(ctx, c.text, false);
    }
    let descr: string = '';
    let skip: boolean = true;
    let cn: number = 0;
    for (let i = 0; i < c.lines.length; i++) {
        const t = prepareText(ctx, c.lines[i], false);
        if (t.trim() != '') {
            skip = false;
            for (let k = 0; k < cn; k++) {
                 descr = descr + '\n';
            }
            descr = descr + t + '\n';
            cn = 0;
        } else if (!skip) {
            cn++;
        }
    }
    ctx.jid++;
    c.jump = createJump(ctx.jid, f.id, t.id, c.text, descr);
    for (let i = 0; i < c.stmts.length; i++) {
        const st: Statement = c.stmts[i];
        prepareFormula(ctx, st.name);
        st.expr = prepareFormula(ctx, st.expr);
    }
    if (c.expr != '') {
        const f: string = prepareFormula(ctx, c.expr);
        c.jump.formulaToPass = f;
    }
    c.jump.priority = c.priority;
    c.jump.showingOrder = c.order;
}

function addReturns(ctx: ParseContext, jump: Case, ret: string) {
    const t = getSite(ctx, ret);
    const s = getSite(ctx, jump.to);
    if ((t === null) || (s === null)) return;
    const g: Site[] = [s];
    const ids: number[] = [s.id];
    for (let i = 0; i < g.length; i++) {
         if (g[i].isReturn) {
            const j: Case = createCase(g[i].name, ret);
            j.expr = '($RRR mod 256)='+t.id;
            const st = createStatement('RRR', '$RRR div 256');
            j.stmts.push(st);
            g[i].cases.push(j);
         }
         for (let j = 0; j < g[i].cases.length; j++) {
            const s = getSite(ctx, g[i].cases[j].to);
            if (s === null) continue;
            if (ids.indexOf(s.id) >= 0) continue
            ids.push(s.id);
            g.push(s);
         }
    }
    const st = createStatement('RRR', '$RRR*256+' + t.id);
    jump.stmts.push(st);
}

function findVar(ctx: ParseContext, id: number): Var {
    for (let i = 0; i < ctx.vars.length; i++) {
        if (ctx.vars[i].id !== null && ctx.vars[i].id == id) return ctx.vars[i];
    }
    return null;
}

function findStatement(st: Statement[], name: string): Statement {
    for (let i = 0; i < st.length; i++) {
        if (st[i].name == name) return st[i];
    }
    return null;
}

function findSite(ctx: ParseContext, id: number): Site {
    for (let i = 0; i < ctx.sites.length; i++) {
        if (ctx.sites[i].id == id) return ctx.sites[i];
    }
    return null;
}

function checkList(list: string, name: string): boolean {
    const l = list.split(':');
    for (let i = 0; i < l.length; i++) {
        if (l[i] == name) return true;
    }
    return false;
}

function getShowingType(show: string, hide: string, name: string) {
    if (checkList(show, name)) return 1;
    if (checkList(hide, name)) return 2;
    return 0;
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
    for (let i = 0; i < ctx.vars.length; i++) {
        const v: Var = ctx.vars[i];
        if (v.order === null) {
            v.order = 1000000;
        }
    }
    ctx.vars = ctx.vars.sort((a: Var, b: Var) => {
        return a.order - b.order;
    });
    for (let i = 0; i < ctx.vars.length; i++) {
        const v: Var = ctx.vars[i];
        if (v.order < 1000000) {
            ctx.vid++;
            v.id = ctx.vid;
        }
    }
    const g: number[] = [];
    for (let i = 0; i < ctx.sites.length; i++) {
        prepareLocation(ctx, ctx.sites[i]);
        if (ctx.sites[i].loc.isStarting) {
            g.push(ctx.sites[i].loc.id);
        }
    }
    for (let i = 0; i < ctx.sites.length; i++) {
        for (let j = 0; j < ctx.sites[i].cases.length; j++) {
            if (ctx.sites[i].cases[j].ret != '') {
                addReturns(ctx, ctx.sites[i].cases[j], ctx.sites[i].cases[j].ret);
            }
        }
    }
    for (let i = 0; i < ctx.sites.length; i++) {
        for (let j = 0; j < ctx.sites[i].cases.length; j++) {
            prepareJump(ctx, ctx.sites[i].cases[j]);
        }
    }
    ctx.qm = createQm();
    if (ctx.intro != '') {
        ctx.qm.taskText = prepareText(ctx, ctx.intro, false);
    }
    if (ctx.congrat != '') {
        ctx.qm.successText = prepareText(ctx, ctx.congrat, false);
    }
    for (let i = 1; i <= ctx.vid; i++) {
        const v = findVar(ctx, i);
        if (v === null) break;
        const p: QMParam = createParam(v.name);
        const r = v.range.match(/(-?\d+)\.\.(-?\d+)/);
        if (r) {
            p.min = Number(r[1]);
            p.max = Number(r[2]);
        }
        p.starting = v.def;
        if (v.type != VAR_TYPE.NONE) {
            p.critValueString = v.message;
            if (v.isNeg) {
                p.max = v.lim;
                p.critType = 0;
            } else {
                p.min = v.lim;
                p.critType = 1;
            }
            if (v.type == VAR_TYPE.LOSE) {
                p.type = 1;
            }
            if (v.type == VAR_TYPE.WIN) {
                p.type = 2;
            }
            if (v.type == VAR_TYPE.DEATH) {
                p.type = 3;
            }
        }
        for (let i = 0; i < v.texts.length; i++) {
            const t = v.texts[i];
            const r = t.range.match(/(-?\d+)\.\.(-?\d+)/);
            if (r) {
                const from: number = Number(r[1]);
                const to: number = Number(r[2]);
                const str: string = prepareText(ctx, t.value, true);
                p.showingInfo.push({
                    from,
                    to,
                    str
                });
            }
        }
        p.active = true;
        p.showWhenZero = true;
        addParam(ctx.qm, p);
    }
    for (let i = 0; i < g.length; i++) {
        const site: Site = findSite(ctx, g[i]);
        const loc: Location = site.loc;
        if (site.x !== null && site.y !== null) {
            loc.locX = site.x;
            loc.locY = site.y;
        } else {
            loc.locX = (ctx.ix * DX) + 32;
            loc.locY = (ctx.iy * DY) + 63;
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
        }
        for (let i = 0; i < ctx.qm.params.length; i++) {
            let st: Statement = null;
            const v = findVar(ctx, +i + 1);
            const s: Site = findSite(ctx, loc.id);
            if (v !== null && s !== null) {
                st = findStatement(s.stmts, v.name);
            }
            if (st !== null) {
                loc.paramsChanges.push({
                   change: 0,
                   showingType: getShowingType(s.show, s.hide, v.name),
                   isChangePercentage: false,
                   isChangeValue: false,
                   isChangeFormula: true,
                   changingFormula: st.expr,
                   critText: '',
                   img: undefined,
                   track: undefined,
                   sound: undefined,
                });
            } else {
                loc.paramsChanges.push({
                   change: 0,
                   showingType: getShowingType(s.show, s.hide, v.name),
                   isChangePercentage: false,
                   isChangeValue: false,
                   isChangeFormula: false,
                   changingFormula: '',
                   critText: '',
                   img: undefined,
                   track: undefined,
                   sound: undefined,
                });
            }
        }
        addLocation(ctx.qm, loc);
        for (let j = 0; j < site.cases.length; j++) {
            const cs = site.cases[j];
            if (cs.jump === null) continue;
            const to: string = cs.to;
            const s: Site = getSite(ctx, to);
            if (s !==  null) {
                if (g.indexOf(s.id) < 0) g.push(s.id);
                for (let i = 0; i < ctx.qm.params.length; i++) {
                     let st: Statement = null;
                     const v = findVar(ctx, +i + 1);
                     if (v !== null) {
                        st = findStatement(cs.stmts, v.name);
                     }
                     if (st) {
                        cs.jump.paramsChanges.push({
                           change: 0,
                           showingType: getShowingType(cs.show, cs.hide, v.name),
                           isChangePercentage: false,
                           isChangeValue: false,
                           isChangeFormula: true,
                           changingFormula: st.expr,
                           critText: '',
                           img: undefined,
                           track: undefined,
                           sound: undefined,
                        });
                     } else {
                        cs.jump.paramsChanges.push({
                           change: 0,
                           showingType: getShowingType(cs.show, cs.hide, v.name),
                           isChangePercentage: false,
                           isChangeValue: false,
                           isChangeFormula: false,
                           changingFormula: '',
                           critText: '',
                           img: undefined,
                           track: undefined,
                           sound: undefined,
                        });
                    }
                    if (cs.lines.length > 0 && ctx.compatibleType == COMPAT_TYPE.OFF) {
                        s.loc.isEmpty = false;
                    }
                }
                addJump(ctx.qm, cs.jump);
            }
        }
    }
    return ctx.qm;
}