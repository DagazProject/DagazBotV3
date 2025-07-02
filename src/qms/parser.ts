import { createQm, QM } from "../qm/qmreader";

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
}

function createMacro(name: string): Macro {
    const params = [];
    const lines = [];
    return {
        name,
        params,
        lines
    }
}

interface Scope {
    type: number;
    macro: Macro;
}

function createScope(type: number): Scope {
    const macro: Macro = null;
    return {
        type,
        macro
    }
}

interface Global {
    name: string;
    value: number;
}

function createGlobal(name: string): Global {
    const value: number = 0;
    return {
        name,
        value
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
  const macros  = [];
  const scopes  = [];
  const globals = [];
  return {
    qm,
    macros,
    scopes,
    globals
  }
}

function parseMacro(line: string, ctx: ParseContext) {
    let r = line.match(/^\s*#macro:([^\s]+)/);
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

}

function parseEnd(line: string, ctx: ParseContext) {
    if (ctx.scopes.length == 0) return;
    const scope: Scope = ctx.scopes[ctx.scopes.length - 1];
    let r = line.match(/^\s*#end:([^\s]+)/);
    if (r) {
        const args = r[1].split(/:/);
        for (let i = 0; i < args.length; i++) {
            const g: Global = createGlobal(args[i]);
            ctx.globals.push(g);
            scope.macro.params.push(g.name);
        }
    }
    if (scope.type == SCOPE_TYPE.MACRO) {
        ctx.macros.push(scope.macro);
    }
    if (scope.type == SCOPE_TYPE.FOREACH) {
        // TODO:
        
    }
    ctx.scopes.pop();
}

function parseVar(line: string, ctx: ParseContext) {

}

function parseSite(line: string, ctx: ParseContext) {

}

function parseCase(line: string, ctx: ParseContext) {

}

function parseCustom(cmd:string, line: string, ctx: ParseContext) {

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
    if (scope.type == SCOPE_TYPE.MACRO) {
        scope.macro.lines.push(line);
        return;
    }
    // TODO:

}

export function parseLine(line: string, ctx: ParseContext) {
    const r = line.match(/^\s*#([^:\s]+)/);
    if (r) {
        parseCommand(r[1], line, ctx);
    } else {
        const r = line.match(/^\s*\$[^=]+/);
        if (r) {
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