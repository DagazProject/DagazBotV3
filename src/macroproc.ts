import { Macro, getMacros } from "./data-source";

import { calculate } from "./qm/formula/index";
import { randomFromMathRandom } from "./qm/randomFunc";

let macros = null;

function isSpecific(macro: Macro): boolean {
    for (let i = 0; i < macro.params.length; i++) {
        if (macro.params[i].value !== null) return true;
    }
    return false;
}

async function getMacro(name: string, args): Promise<Macro> {
    if (macros === null) {
        macros = await getMacros();
    }
    for (let i = 0; i < macros.length; i++) {
        if (!isSpecific(macros[i])) continue;
        if ((macros[i].name == name) && (macros[i].params.length == args.length)) {
            let f = true;
            for (let j = 0; j < macros[i].params.length; j++) {
                if (macros[i].params[j] === null) continue;
                if (macros[i].params[j] != args[j]) {
                    f = false;
                    break;
                }
            }
            if (f) return macros[i];
        }
    }
    for (let i = 0; i < macros.length; i++) {
         if (isSpecific(macros[i])) continue;
         if ((macros[i].name == name) && (macros[i].params.length == args.length)) return macros[i];
    }
    return null;
}

async function expand(f: string): Promise<string> {
    let r = f.match(/#(\w+)\((.*)/);
    while (r) {
        let cnt = 1;
        let args = [];
        let a = "";
        for (let c of r[2]) {
            if (c == '(') cnt++;
            if (c == ')') {
                if (a != '') args.push(a);
                cnt--;
                if (cnt == 0) break;
            }
            if ((cnt == 1) && (c == ',')) {
                args.push(a);
                a = "";
                continue;
            }
            a = a + c;
        }
        let result: any = '';
        let pattern = '#' + r[1] + '(';
        for (let i = 0; i < args.length; i++) {
            if (i > 0) pattern = pattern + ',';
            pattern = pattern + args[i];
        }
        pattern = pattern + ')';
        const m = await getMacro(r[1], args);
        if (m !== null) {
            if (m !== null) {
                result = m.result;
                for (let i = 0; i < m.params.length; i++) {
                     result = result.replaceAll(m.params[i].name, args[i]);
                }
            }
        }
        f = f.replace(pattern, result);
        r = f.match(/#(\w+)\s*\((.*)/);
    }
    return f;
}

export async function calc(f: string, p: number[]): Promise<number> {
    const s = await expand(f);
    return calculate(s, p, randomFromMathRandom);
}