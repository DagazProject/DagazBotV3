import { calculate } from "../qm/formula";
import { addJump, addLocation, addParam, createJump, createLocation, createParam, createQm, Jump, JumpId, Location, LocationId, QM, QMParam } from "../qm/qmreader";
import { randomFromMathRandom } from "../qm/randomFunc";

const CX = 25;
const DX = 64;
const DY = 42;

const MAX_VAL = 1000000;

const SCOPE_TYPE = {
   NONE:           0,
   MACRO:          1,
   FOR:            2,
   SITE:           3,
   CASE:           4,
   VAR:            5,
   INTRO:          6,
   CONGRAT:        7
};

interface Macro {
    name: string;
    params: string[];
    lines: string[];
    alt: string[];
    altF: boolean;
    ranges: string[];
}

function createMacro(name: string): Macro {
    return {
        name,
        params: [],
        lines: [],
        alt: [],
        altF: false,
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
    id: number|null;
    range: string;
    def: string;
    texts: Text[];
    type: number;
    message: string;
    lim: number|null;
    isNeg: boolean;
    isShow: boolean;
    isHide: boolean;
    isMoney: boolean;
    isShowingZero: boolean;
    order: number|null;
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
        isShow: false,
        isHide: false,
        isMoney: false,
        isShowingZero: true,
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
    isDay: boolean;
    cnt: number;
    jump: Jump|null;
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
        isDay: false,
        cnt: 0,
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
    id: LocationId;
    num: number;
    pages: Page[];
    cases: Case[];
    spec: string;
    expr: string;
    stmts: Statement[];
    show: string;
    hide: string;
    isReturn: boolean;
    isDay: boolean;
    loc: Location|null;
    x: number|null;
    y: number|null;
    image: string;
}

function createSite(name: string, id: LocationId): Site {
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
        isDay: false,
        loc: null,
        x: null,
        y: null,
        image: ''
    }
}

function getSite(ctx: ParseContext, name: string): Site|null {
    for (let i = 0; i < ctx.sites.length; i++) {
        if (ctx.sites[i].name === name) { 
            return ctx.sites[i]; 
        }
    }
    return null;
}

function getPage(loc: Site, num: number): Page {
    for (let i = 0; i < loc.pages.length; i++) {
        if (loc.pages[i].num === num) {
            return loc.pages[i];
        }
    }
    const p = createPage(num);
    loc.pages.push(p);
    if (loc.image !== '') {
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
    macro: Macro|null;
    site: Site|null;
    case: Case|null;
    vars: Var|null;
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
    jid: JumpId;
    intro: string;
    congrat: string;
    deep: number;
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
    jid: 0 as JumpId,
    intro: '',
    congrat: '',
    deep: 0,
    params: []
  }
}

function getScope(ctx: ParseContext): Scope|null {
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

function parseFor(line: string, ctx: ParseContext) {
    const r = line.match(/^\s*#for:([^\s:]+):([^\s]+)/);
    if (r) {
        const scope = createScope(SCOPE_TYPE.FOR);
        scope.macro = createMacro('for');
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

function parseIf(line: string, ctx: ParseContext) {
    const r = line.match(/^\s*#if:([^\s:]+)/);
    if (r) {
        const scope = createScope(SCOPE_TYPE.FOR);
        scope.macro = createMacro('for');
        scope.macro.params.push('_');
        scope.macro.ranges.push('1..' + String(r[1]));
        ctx.scopes.push(scope);
    }
}

function getGlobal(name: string, ctx: ParseContext): Global {
    for (let i = 0; i < ctx.globals.length; i++) {
        if (ctx.globals[i].name === name) {
            return ctx.globals[i];
        }
    }
    const g: Global = createGlobal(name);
    return g;
}

function getNextChar(char: string): string {
  return String.fromCharCode(char.charCodeAt(0) + 1);
}

function iterateRangeEx(range: string): string[] {
    const result: string[] = [];
    const r = range.match(/^\s*([^.]+)\s*\.\.\s*(\S+)/);
    if (r) {
        if (r[1].match(/\d+/) && r[2].match(/\d+/)) {
            for (let i = Number(r[1]); i <= Number(r[2]); i++) {
                result.push(String(i));
            }
        } else {
            let c = r[1];
            while (true) {
                result.push(c);
                if (c === r[2]) {
                    break;
                }
                c = getNextChar(c);
            }
        }
    } else {
        result.push(range);
    }
    return result;
}

function parseEnd(line: string, ctx: ParseContext) {
    if (ctx.scopes.length === 0) {
        return 
    };
    const scope = getScope(ctx);
    if (scope === null) { 
        return 
    };
    const r = line.match(/^\s*#end:([^\s]+)/);
    if (r && scope.macro) {
        const args = r[1].split(/:/);
        for (let i = 0; i < args.length; i++) {
            const g: Global = getGlobal(args[i], ctx);
            g.isIncremetable = true;
            ctx.globals.push(g);
            scope.macro.params.push(g.name);
        }
    }
    if (scope.type === SCOPE_TYPE.MACRO && scope.macro) {
        ctx.macros.push(scope.macro);
    }
    if (scope.type === SCOPE_TYPE.FOR && scope.macro) {
        if (scope.macro.ranges.length === 0) {
            return;
        }
        const ranges = scope.macro.ranges[0].split(/;/);
        let ixs: string[] = [];
        for (let i = 0; i < ranges.length; i++) {
             ixs = ixs.concat(iterateRangeEx(ranges[i]));
        }
        ctx.scopes.pop();
        scope.macro.name = '@' + String(ctx.scopes.length);
        ctx.macros.push(scope.macro);
        let f = false;
        for (let i = 0; i < ixs.length; i++) {
             f = true;
             const c: string = '#' + scope.macro.name + ':' + ixs[i];
             parseCustom(scope.macro.name, c, ctx);
        }
        if (!f) {
             altCustom(scope.macro.name, ctx);
        }
        ctx.macros.pop();
    } else {
        ctx.scopes.pop();
    }
}

function parseVar(line: string, ctx: ParseContext) {
    let scope = getScope(ctx);
    while (scope !== null) {
        if (scope.type === SCOPE_TYPE.INTRO || scope.type === SCOPE_TYPE.CONGRAT) {
            ctx.scopes.pop();
        }
        if (scope.type === SCOPE_TYPE.VAR && scope.vars) {
            ctx.scopes.pop();
            ctx.vars.push(scope.vars);
        }
        scope = getScope(ctx);
    }
    const r = line.match(/^\s*#var:(\S+)/);
    if (r) {
        scope = createScope(SCOPE_TYPE.VAR);
        scope.vars = createVar(r[1]);
        let p = line.match(/#show/);
        if (p) {
            scope.vars.isShow = true;
        }
        p = line.match(/#show/);
        if (p) {
            scope.vars.isHide = true;
        }
        p = line.match(/#zero/);
        if (p) {
            scope.vars.isShowingZero = true;
        } else {
            scope.vars.isShowingZero = false;
        }
        p = line.match(/#range:(\S+)/);
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
        p = line.match(/#money/);
        if (p) {
            scope.vars.isMoney = true;
        }
        ctx.scopes.push(scope);
    }
}

function parseSite(line: string, ctx: ParseContext) {
    let scope = getScope(ctx);
    while (scope !== null) {
        if (scope.type === SCOPE_TYPE.INTRO || scope.type === SCOPE_TYPE.CONGRAT) {
            ctx.scopes.pop();
        }
        if (scope.type === SCOPE_TYPE.VAR && scope.vars) {
            ctx.scopes.pop();
            ctx.vars.push(scope.vars);
        }
        if (scope.type === SCOPE_TYPE.CASE && scope.case) {
            ctx.scopes.pop();
            const s = getScope(ctx);
            if (s === null) { 
              return; 
            }
            if (s.type === SCOPE_TYPE.SITE && s.site) {
                s.site.cases.push(scope.case);
            }
        } else if (scope.type === SCOPE_TYPE.SITE && scope.site) {
            ctx.scopes.pop();
            ctx.sites.push(scope.site);
        } else { 
          break; 
        }
        scope = getScope(ctx);
    }
    const r = line.match(/^\s*#site:(\S+)/);
    if (r) {
        scope = createScope(SCOPE_TYPE.SITE);
        for (let i = 0; i < ctx.sites.length; i++) {
            if (ctx.sites[i].name === r[1]) {
                scope.site = ctx.sites[i];
                break;
            }
        }
        if (scope.site === null) {
            scope.site = createSite(r[1], (ctx.sites.length + 1) as LocationId);
        }
        let p = line.match(/#(default|win|lose|death)/);
        if (p) {
            scope.site.spec = p[1];
        }
        p = line.match(/#show:(\S+)/);
        if (p) {
            scope.site.show = p[1];
        }
        p = line.match(/#hide:(\S+)/);
        if (p) {
            scope.site.hide = p[1];
        }
        p = line.match(/{([^}]+)}/);
        if (p) {
            scope.site.expr = p[1];
        }
        p = line.match(/#image:(\S+)/);
        if (p) {
            scope.site.image = p[1];
        }
        p = line.match(/#day/);
        if (p) {
            scope.site.isDay = true;
        }
        ctx.scopes.push(scope);
    }
}

function parseCase(line: string, ctx: ParseContext) {
    let scope = getScope(ctx);
    while (scope !== null) {
        if (scope.type === SCOPE_TYPE.INTRO || scope.type === SCOPE_TYPE.CONGRAT) {
            ctx.scopes.pop();
        }
        if (scope.type === SCOPE_TYPE.VAR && scope.vars) {
            ctx.scopes.pop();
            ctx.vars.push(scope.vars);
        }
        if (scope.type === SCOPE_TYPE.CASE && scope.case) {
            ctx.scopes.pop();
            const s = getScope(ctx);
            if (s === null) {
              return;
            }
            if (s.type === SCOPE_TYPE.SITE && s.site) {
                s.site.cases.push(scope.case);
            }
        } else {
          break;
        }
        scope = getScope(ctx);
    }
    if (scope === null) {
      return;
    }
    if (scope.type !== SCOPE_TYPE.SITE) {
      return;
    }
    const r = line.match(/^\s*#case:(\S+)/);
    if (r && scope.site) {
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
            s.case.hide = p[1];
        }
        p = line.match(/#day/);
        if (p) {
            s.case.isDay = true;
        }
        p = line.match(/#count:(\d+)/);
        if (p) {
            s.case.cnt = Number(p[1]);
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
            if (ctx.vid === 0) {
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

function getMacro(name: string, ctx: ParseContext): Macro|null {
    for (let i = 0; i < ctx.macros.length; i++) {
        if (ctx.macros[i].name === name) {
          return ctx.macros[i];
        }
    }
    return null;
}

function expandMacro(s: string, c: Global[]): string {
    let r = s.match(/\[([^\]]+)\]/);
    while (r) {
        let v = r[1];
        let e = v.match(/\$([a-zA-Z0-9_]+)/);
        let isCompleted = true;
        while (e) {
            let f: string = '';
            for (let i = 0; i < c.length; i++) {
                 if (c[i].name === e[1]) {
                     f = c[i].value;
                     break;
                 }
            }
            if (f !== '') {
                v = v.replace('$' + e[1], f);
            } else {
                isCompleted = false;
                v = v.replace('$' + e[1], '++' + e[1]);
            }
            e = v.match(/\$([a-zA-Z0-9_]+)/);
        }
        if (isCompleted) {
            if (v.match(/[\s+\-*\/<>=]/)) {
                v = String(calculate(v, [], randomFromMathRandom));
            }
            s = s.replace('[' + r[1] + ']', v);
        } else {
            s = s.replace('[' + r[1] + ']', '{{' + v + '}}');
        }
        r = s.match(/\[([^\]]+)\]/);
    }
    s = s.replace(/\+\+/g, '$');
    s = s.replace(/{{/g, '[');
    s = s.replace(/}}/g, ']');
    return s;
}

function findGlobal(name: string, c: Global[]): Global|null {
    for (let i = 0;i < c.length; i++) {
        if (c[i].name === name) {
          return c[i];
        }
    }
    return null;
}

function getConstants(ctx: ParseContext): Global[] {
    const names: string[] = [];
    const c: Global[] = [];
    for (let i = ctx.params.length - 1; i >= 0; i--) {
        if (names.indexOf(ctx.params[i].name) >= 0) {
          continue;
        }
        c.push(ctx.params[i]);
        names.push(ctx.params[i].name);
    }
    for (let i = 0; i < ctx.globals.length; i++) {
        if (names.indexOf(ctx.globals[i].name) >= 0) {
            continue;
        }
        c.push(ctx.globals[i]);
        names.push(ctx.globals[i].name);
    }
    return c;
}

function altCustom(cmd:string, ctx: ParseContext) {
    const m = getMacro(cmd, ctx);
    if (m === null) {
        return;
    }
    const c: Global[] = getConstants(ctx);
    for (let i = 0; i < m.alt.length; i++) {
        const s: string = expandMacro(m.alt[i], c);
        parseLine(s, ctx);
    }
}

function parseCustom(cmd:string, line: string, ctx: ParseContext) {
    const m = getMacro(cmd, ctx);
    if (m === null) {
        return;
    }
    let cn: number = 0;
    const r = line.match(/^\s*#[^:\s]+:(\S+)/);
    if (r) {
        const args = r[1].split(/:/);
        for (let i = 0; i < args.length; i++) {
            if (i >= m.params.length) {
                break;
            }
            const g: Global = createGlobal(m.params[i]);
            g.value = args[i];
            ctx.params.push(g);
            cn++;
        }
    }
    const c: Global[] = getConstants(ctx);
    for (let i = 0; i < m.lines.length; i++) {
        const s: string = expandMacro(m.lines[i], c);
        parseLine(s, ctx);
    }
    while (cn > 0 && ctx.params.length > 0) {
        ctx.params.pop();
    }
    for (let i = 0; i < m.params.length; i++) {
        const g = getGlobal(m.params[i], ctx);
        if (g.isIncremetable) {
            g.value = String(Number(g.value) + 1);
        }
    }
}

function parseCommand(cmd:string, line: string, ctx: ParseContext) {
    const scope = getScope(ctx);
    if (cmd === 'macro') {
        parseMacro(line, ctx);
    } else
    if (cmd === 'for') {
        parseFor(line, ctx);
    } else
    if (cmd === 'if') {
        parseIf(line, ctx);
    } else
    if (cmd === 'var') {
        parseVar(line, ctx);
    } else
    if (cmd === 'site') {
        parseSite(line, ctx);
    } else
    if (cmd === 'case') {
        parseCase(line, ctx);
    } else
    if (cmd === 'intro') {
        const scope = createScope(SCOPE_TYPE.INTRO);
        ctx.scopes.push(scope);
    } else
    if (cmd === 'congratulation') {
        const scope = createScope(SCOPE_TYPE.CONGRAT);
        ctx.scopes.push(scope);
    } else
    if (cmd === 'position') {
        const r = line.match(/^\s*#position:([^:\s]+):(\d+):(\d+)/);
        if (r) {
            const s = getSite(ctx, r[1]);
            if (s !== null) {
                s.x = Number(r[2]);
                s.y = Number(r[3]);
            }
            closeScopes(ctx);
        }
    } else
    if (cmd === 'text') {
        if (scope === null) {
            return;
        }
        if (scope.type !== SCOPE_TYPE.VAR) {
            return;
        }
        const r = line.match(/^\s*#text:([^:\s]+)/);
        if (r && scope.vars) {
            const t = createText(r[1]);
            const s = line.match(/\'([^\']*)\'/);
            if (s) {
                t.value = s[1];
            }
            scope.vars.texts.push(t);
        }
    } else
    if (cmd === 'message') {
        if (scope === null) {
          return;
        }
        if (scope.type !== SCOPE_TYPE.VAR) {
          return;
        }
        let r = line.match(/^\s*#message:([+-])(\d+)/);
        if (r && scope.vars) {
            const v = getVar(ctx, scope.vars.name);
            if (v !== null) {
                v.lim = Number(r[2]);
                if (r[1] === '-') {
                    v.isNeg = true;
                }
                r = line.match(/#(win|lose|death):\'([^\']*)\'/);
                if (r) {
                    v.message = r[2];
                    if (r[1] === 'win') {
                        v.type = VAR_TYPE.WIN;
                    }
                    if (r[1] === 'lose') {
                        v.type = VAR_TYPE.LOSE;
                    }
                    if (r[1] === 'death') {
                        v.type = VAR_TYPE.DEATH;
                    }
                }
            }
        }
    } else
    if (cmd === 'return') {
        if (scope === null) {
          return;
        }
        if (scope.type !== SCOPE_TYPE.SITE) {
          return;
        }
        if (ctx.vid === 0) {
            const v = createVar('RRR');
            v.id = 1;
            v.range = '0..100000000';
            ctx.vars.push(v);
            ctx.vid = 1;
        }
        if (scope.site) {
            scope.site.isReturn = true;
        }
    } else
    if (cmd === 'global') {
        const r = line.match(/^\s*#global:([^:]+):(\S+)/);
        if (r) {
            const g = getGlobal(r[1], ctx);
            g.value = r[2];
            ctx.globals.push(g);
        }
    } else
    if (cmd === 'page') {
        if (scope === null) {
          return;
        }
        if (scope.type !== SCOPE_TYPE.SITE) {
          return;
        }
        let r = line.match(/^\s*#page:(\d+)/);
        if (r && scope.site) {
            scope.site.num = Number(r[1]);
            r = line.match(/#image:(\S+)/);
            if (r) {
                scope.site.image = r[1];
            }
        }
    } else
    if (cmd === 'compatible') {
        const r = line.match(/^\s*#compatible:(on|off|debug)/);
        if (r) {
            if (r[1] === 'on') {
              ctx.compatibleType    = COMPAT_TYPE.ON;
            }
            if (r[1] === 'off') {
              ctx.compatibleType   = COMPAT_TYPE.OFF;
            }
            if (r[1] === 'debug') {
              ctx.compatibleType = COMPAT_TYPE.DEBUG;
            }
        }
    } else {
        parseCustom(cmd, line, ctx);
    }
}

function parseStatement(line: string, ctx: ParseContext) {
    if (ctx.scopes.length === 0) {
      return;
    }
    const scope = getScope(ctx);
    const r = line.match(/^\s*\$([^\s=]+)\s*=\s*(\S.*)/);
    if (r && scope) {
        if (scope.type === SCOPE_TYPE.SITE && scope.site) {
            const s: Statement = createStatement(r[1], r[2]);
            scope.site.stmts.push(s);
        }
        if (scope.type === SCOPE_TYPE.CASE && scope.case) {
            const s: Statement = createStatement(r[1], r[2]);
            scope.case.stmts.push(s);
        }
    }
}

function parseElse(line: string, ctx: ParseContext) {
    if (ctx.scopes.length === 0) {
        return;
    }
    const scope = getScope(ctx);
    if (scope === null) {
        return;
    }
    if (scope.type <= SCOPE_TYPE.FOR && scope.macro) {
        scope.macro.altF = true;
    }
}

function parseString(line: string, ctx: ParseContext) {
    if (ctx.scopes.length === 0) {
        return;
    }
    const scope = getScope(ctx);
    if (scope === null) {
        return;
    }
    if (scope.type <= SCOPE_TYPE.FOR && scope.macro) {
        if (scope.macro.altF) {
            scope.macro.alt.push(line);
        } else {
            scope.macro.lines.push(line);
        }
        return;
    }
    if (scope.type === SCOPE_TYPE.INTRO) {
        if (ctx.intro !== '')  {
            ctx.intro = ctx.intro + '\n' + line;
        } else {
            if (line !== '') {
                ctx.intro = line;
            }
        }
    } else 
    if (scope.type === SCOPE_TYPE.CONGRAT) {
        if (ctx.congrat !== '')  {
            ctx.congrat = ctx.congrat + '\n' + line;
        } else {
            if (line !== '') {
                ctx.congrat = line;
            }
        }
    } else 
    if (scope.type === SCOPE_TYPE.SITE && scope.site) {
        addLine(scope.site, line);
    } else
    if (scope.type === SCOPE_TYPE.CASE && scope.case) { 
        scope.case.lines.push(line);
    }
}

export function parseLine(line: string, ctx: ParseContext) {
    const scope = getScope(ctx);
    const isMacro: boolean = (scope !== null) ? (scope.type === SCOPE_TYPE.MACRO || scope.type === SCOPE_TYPE.FOR) : false;
    let r = line.match(/^\s*#([^:\s]+)/);
    if (isMacro) {
        if (r) {
            if (r[1] === 'else') {
                parseElse(line, ctx);
                return;
            }
            if (r[1] === 'end') {
                ctx.deep--;
                if (ctx.deep === 0) {
                    parseEnd(line, ctx);
                    return;
                }
            }
            if (r[1] === 'macro' || r[1] === 'for') {
                ctx.deep++;
            }
        }
        parseString(line, ctx);
    } else {
        if (r) {
            if (r[1] === 'macro' || r[1] === 'for') {
                ctx.deep++;
            }
            parseCommand(r[1], line, ctx);
            return;
        }
        r = line.match(/^\s*\$[^=]+/);
        if (r) {
            parseStatement(line, ctx);
            return;
        }
        parseString(line, ctx);
    }
}

function getVar(ctx: ParseContext, name: string): Var|null {
    for (let i = 0; i < ctx.vars.length; i++) {
        if (ctx.vars[i].name === name) {
          return ctx.vars[i];
        }
    }
    return null;
}

function prepareFormula(ctx: ParseContext, s: string): string {
    let r = s.match(/\$([a-zA-Z0-9_]+)/);
    while (r) {
        const name: string = r[1];
        const v = getVar(ctx, name);
        if (v !== null) {
            if (v.id === null) {
                ctx.vid++;
                v.id = ctx.vid;
            }
            s = s.replace('$' + name, `[p${v.id}]`);
        } else {
            s = s.replace('$' + name, '');
        }
        r = s.match(/\$([a-zA-Z0-9_]+)/);
    }
    r = s.match(/<([0-9.-;]+)>/);
    while (r) {
        s = s.replace(`<${r[1]}>`, `[${r[1]}]`);
        r = s.match(/<([0-9.-;]+)>/);
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
                if (i >= args.length) {
                  break;
                }
                const g: Global = createGlobal(m.params[i]);
                g.value = args[i];
                c.push(g);
            }
            for (let i = 0; i < ctx.globals.length; i++) {
                const g = ctx.globals[i];
                const r = findGlobal(g.name, c);
                if (r !== null) {
                  continue;
                }
                c.push(g);
            }
            for (let i = 0; i < m.lines.length; i++) {
                const s: string = expandMacro(m.lines[i], c);
                if (f !== '') {
                  f = f + '\\n';
                }
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
        const v = getVar(ctx, name);
        if (v !== null) {
            if (v.id === null) {
                ctx.vid++;
                v.id = ctx.vid;
            }
            if (r[1] === '$') {
                s = s.replace(r[1] + name, `[p${v.id}]`);
            } else {
                s = s.replace(r[1] + name, `[d${v.id}]`);
            }
        } else {
            s = s.replace(r[1] + name, '');
        }
        r = s.match(/(\$|@)([a-zA-Z0-9_]+)/);
    }
    if (isParam) {
        s = s.replace(/\$/g, '<>');
    }
    s = s.replace(/\\\*/g, '&');
    r = s.match(/\*([^*]+)\*/);
    while (r) {
        s = s.replace('*' + r[1] + '*', '<clr>' + r[1] + '<clrEnd>');
        r = s.match(/\*([^*]+)\*/);
    }
    s = s.replace(/&/g, '*');
    r = s.match(/\^([^\^]+)\^/);
    while (r) {
        s = s.replace('^' + r[1] + '^', '<fix>' + r[1] + '</fix>');
        r = s.match(/\^([^\^]+)\^/);
    }
    if (ctx.compatibleType === COMPAT_TYPE.OFF) {
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
    if (s.isDay) {
        s.loc.dayPassed = true;
    }
    let isEmpty: boolean = true;
    for (let i =0; i < s.pages.length; i++) {
        const p: Page = s.pages[i];
        let skip: boolean = true;
        let cn: number = 0;
        for (let j = 0; j < p.lines.length; j++) {
            const t = prepareText(ctx, p.lines[j], false);
            if (t.trim() !== '') {
                skip = false;
                if (!s.loc.texts[p.num - 1]) {
                  s.loc.texts[p.num - 1] = '';
                }
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
        if (p.image !== '') {
            s.loc.media[p.num - 1] = {
                img: p.image,
                sound: undefined,
                track: undefined
            };
        }
    }
    if (s.spec === 'default') {
        s.loc.isStarting = true;
    } else if (s.spec === 'win') {
        s.loc.isSuccess = true;
    } else if (s.spec === 'lose') {
        s.loc.isFaily = true;
    } else if (s.spec === 'death') {
        s.loc.isFailyDeadly = true;
    }
    if (!isEmpty && ctx.compatibleType !== COMPAT_TYPE.OFF) {
        s.loc.isEmpty = false;
    }
    if (isEmpty && ctx.compatibleType === COMPAT_TYPE.DEBUG) {
        s.loc.texts[0] = s.name;
    }
    if (s.expr !== '') {
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
    if (f === null || t === null) {
      return;
    }
    if (c.text !== '') {
        c.text = prepareText(ctx, c.text, false);
    }
    let descr: string = '';
    let skip: boolean = true;
    let cn: number = 0;
    for (let i = 0; i < c.lines.length; i++) {
        const t = prepareText(ctx, c.lines[i], false);
        if (t.trim() !== '') {
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
    if (c.isDay) {
        c.jump.dayPassed = true;
    }
    if (c.cnt > 0) {
        c.jump.jumpingCountLimit = c.cnt;
    }
    for (let i = 0; i < c.stmts.length; i++) {
        const st: Statement = c.stmts[i];
        prepareFormula(ctx, st.name);
        st.expr = prepareFormula(ctx, st.expr);
    }
    if (c.expr !== '') {
        const f: string = prepareFormula(ctx, c.expr);
        c.jump.formulaToPass = f;
    }
    c.jump.priority = c.priority;
    c.jump.showingOrder = c.order;
}

function addReturns(ctx: ParseContext, jump: Case, ret: string) {
    const t = getSite(ctx, ret);
    const s = getSite(ctx, jump.to);
    if ((t === null) || (s === null)) {
      return;
    }
    const g: Site[] = [s];
    const ids: number[] = [s.id];
    for (let i = 0; i < g.length; i++) {
         if (g[i].isReturn) {
            const j: Case = createCase(g[i].name, ret);
            j.expr = `($RRR mod 256)=${t.id}`;
            const st = createStatement('RRR', '$RRR div 256');
            j.stmts.push(st);
            g[i].cases.push(j);
         }
         for (let j = 0; j < g[i].cases.length; j++) {
            const s = getSite(ctx, g[i].cases[j].to);
            if (s === null) {
              continue;
            }
            if (ids.indexOf(s.id) >= 0) {
              continue
            }
            ids.push(s.id);
            g.push(s);
         }
    }
    const st = createStatement('RRR', `$RRR*256+${t.id}`);
    jump.stmts.push(st);
}

function findVar(ctx: ParseContext, id: number): Var|null {
    for (let i = 0; i < ctx.vars.length; i++) {
        if (ctx.vars[i].id !== null && ctx.vars[i].id === id) {
          return ctx.vars[i];
        }
    }
    return null;
}

function findStatement(st: Statement[], name: string): Statement|null {
    for (let i = 0; i < st.length; i++) {
        if (st[i].name === name) {
          return st[i];
        }
    }
    return null;
}

function findSite(ctx: ParseContext, id: number): Site|null {
    for (let i = 0; i < ctx.sites.length; i++) {
        if (ctx.sites[i].id === id) {
          return ctx.sites[i];
        }
    }
    return null;
}

function checkList(list: string, name: string): boolean {
    const l = list.split(';');
    for (let i = 0; i < l.length; i++) {
        if (l[i] === name) {
          return true;
        }
    }
    return false;
}

function getShowingType(show: string, hide: string, name: string) {
    if (checkList(show, name)) {
      return 1;
    }
    if (checkList(hide, name)) {
      return 2;
    }
    return 0;
}

function closeScopes(ctx: ParseContext) {
    while (ctx.scopes.length > 0) {
        const s = ctx.scopes.pop();
        if (s) {
            if (s.type === SCOPE_TYPE.VAR && s.vars) {
                ctx.vars.push(s.vars);
            }
            if (s.type === SCOPE_TYPE.CASE) {
                const scope = getScope(ctx);
                if ((scope !== null) && (scope.type === SCOPE_TYPE.SITE) && scope.site && s.case) {
                    scope.site.cases.push(s.case);
                }
            }
            if (s.type === SCOPE_TYPE.SITE && s.site) {
                ctx.sites.push(s.site);
            }
        }
    }
}

export function closeContext(ctx: ParseContext):QM {
    closeScopes(ctx);
    for (let i = 0; i < ctx.vars.length; i++) {
        const v: Var = ctx.vars[i];
        if (v.order === null) {
            v.order = MAX_VAL;
        }
    }
    ctx.vars = ctx.vars.sort((a: Var, b: Var) => {
        return (a.order ? a.order : 0) - (b.order ? b.order : 0);
    });
    for (let i = 0; i < ctx.vars.length; i++) {
        const v: Var = ctx.vars[i];
        if ((v.order ? v.order : 0) < MAX_VAL) {
            ctx.vid++;
            v.id = ctx.vid;
        }
    }
    const g = [];
    for (let i = 0; i < ctx.sites.length; i++) {
        prepareLocation(ctx, ctx.sites[i]);
        const loc = ctx.sites[i].loc;
        if (loc && loc.isStarting) {
            g.push(loc.id);
        }
    }
    for (let i = 0; i < ctx.sites.length; i++) {
        for (let j = 0; j < ctx.sites[i].cases.length; j++) {
            if (ctx.sites[i].cases[j].ret !== '') {
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
    if (ctx.intro !== '') {
        ctx.qm.taskText = prepareText(ctx, ctx.intro, false);
    }
    if (ctx.congrat !== '') {
        ctx.qm.successText = prepareText(ctx, ctx.congrat, false);
    }
    for (let i = 1; i <= ctx.vid; i++) {
        const v = findVar(ctx, i);
        if (v === null) {
          break;
        }
        const p: QMParam = createParam(v.name);
        p.showWhenZero = v.isShowingZero;
        const r = v.range.match(/(-?\d+)\.\.(-?\d+)/);
        if (r) {
            p.min = Number(r[1]);
            p.max = Number(r[2]);
        }
        p.starting = v.def;
        if (v.isMoney) {
            p.isMoney = true;
        }
        if (v.type !== VAR_TYPE.NONE) {
            p.critValueString = v.message;
            if (v.lim) {
                if (v.isNeg) {
                    p.max = v.lim;
                    p.critType = 0;
                } else {
                    p.min = v.lim;
                    p.critType = 1;
                }
            }
            if (v.type === VAR_TYPE.LOSE) {
                p.type = 1;
            }
            if (v.type === VAR_TYPE.WIN) {
                p.type = 2;
            }
            if (v.type === VAR_TYPE.DEATH) {
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
        const site = findSite(ctx, g[i]);
        if (!site) {
          continue;
        }
        const loc = site.loc;        
        if (!loc) {
          continue;
        }
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
            let st = null;
            const v = findVar(ctx, +i + 1);
            const s = findSite(ctx, loc.id);
            if (s && s.loc && s.loc.isStarting) {
                for (let k = 0; k < ctx.vars.length; k++) {
                    if (ctx.vars[k].id !== null) {
                        if (ctx.vars[k].isShow) {
                            if (s.show !== '') {
                                s.show = s.show + ';';
                            }
                            s.show = s.show + ctx.vars[k].name;
                        }
                        if (ctx.vars[k].isHide) {
                            if (s.hide !== '') {
                                s.hide = s.hide + ';';
                            }
                            s.hide = s.hide + ctx.vars[k].name;
                        }
                    }
                }
            }
            if (v !== null && s !== null) {
                st = findStatement(s.stmts, v.name);
            }
            if (s && v) {
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
        }
        addLocation(ctx.qm, loc);
        for (let j = 0; j < site.cases.length; j++) {
            const cs = site.cases[j];
            if (cs.jump === null) {
              continue;
            }
            const to: string = cs.to;
            const s = getSite(ctx, to);
            if (s !==  null) {
                if (g.indexOf(s.id) < 0) {
                  g.push(s.id);
                }
                for (let i = 0; i < ctx.qm.params.length; i++) {
                     let st = null;
                     const v = findVar(ctx, +i + 1);
                     if (v !== null) {
                        st = findStatement(cs.stmts, v.name);
                     }
                     if (v) {
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
                     }
                     if (cs.lines.length > 0 && ctx.compatibleType === COMPAT_TYPE.OFF && s.loc) {
                         s.loc.isEmpty = false;
                     }
                }
                addJump(ctx.qm, cs.jump);
            }
        }
    }
    return ctx.qm;
}