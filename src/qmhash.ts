import { QM, parse } from "./qm/qmreader";
import * as fs from "fs";

import { saveQuestParamValue, saveQuestLoc, loadContext, loadContextParams } from "./data-source";
import { calc } from "./macroproc";
import { calculate } from "./qm/formula";
import { randomFromMathRandom } from "./qm/randomFunc";

const MAX_SLOTS = 5;
let hash: QmSlot[] = [];

let ctxs = [];

export function addContext(uid: number, service: number, ctx: QmContext) {
    if (ctxs[uid] === undefined) {
        ctxs[uid] = [];
    }
    ctxs[uid][service] = ctx;
}

export async function getContext(uid: number, service: number): Promise<QmContext> {
    if ((ctxs[uid] === undefined) || (ctxs[uid][service] === undefined)) {
        const context = await loadContext(uid, service);
        if (context === null) return null;
        const ctx = await load(context.filename, context.username);
        ctx.id     = context.id;
        ctx.loc    = context.loc;
        ctx.user   = context.user_id;
        ctx.script = context.script_id;
        const params = await loadContextParams(ctx.id);
        for (let i = 0; i < params.length; i++) {
            ctx.params[params[i].ix].value  = params[i].value;
            ctx.params[params[i].ix].hidden = params[i].hidden;
        }
        addContext(uid, service, ctx);
    }
    return ctxs[uid][service];
}

export class QmParam {
    public hidden: boolean = true;
    constructor(public readonly title: string, public min: number, public max: number, public value: number) {}
}

export class QmContext {
    public id: number = null;
    public script: string = null;
    public user: number = null;
    public money: number = 1000;
    public penalty: number = null;

    public messageId: number = null;
    public params: QmParam[] = [];
    public fixed: string = '';
    public old: string = '';
    public date: Date = new Date();
    public jumps: number[] = [];
    public locs: number[] = [];
    public message: number = null;

    public session: number = null;
    public timeout: number = 0;
    public indexParam: number = null;
    public startParam: number = null;
    public paramCount: number = 0;

    constructor(public readonly name: string, public loc: number, public ix, public username: string) {}

    public async setLoc(loc: number, qm) {
        if (this.loc != loc) {
            console.log('Location: ' + qm.locations[loc].id);
            this.loc = loc;
            if (this.id !== null) {
                await saveQuestLoc(this.id, loc);
            }
        }
    }

    public getValue(ix: number): number {
        if (this.params[ix]) {
            return this.params[ix].value;
        } else {
            return null;
        }
    }

    public async setValue(ix: number, value: number) {
        if ((ix < 0) || (ix >= this.params.length)) return;
        if (this.params[ix].max < value) value = this.params[ix].max;
        if (this.params[ix].min > value) value = this.params[ix].min;
        if (this.params[ix].value != value) {
            console.log('Param ' + (+ix + 1) + '[' + this.params[ix].title + '] = ' + this.params[ix].value);
            this.params[ix].value = value;
            if (this.id !== null) {
                await saveQuestParamValue(this.id, ix, this.params[ix].value, this.params[ix].hidden);
            }
        }
    }

    public async setHidden(ix: number, hidden: boolean) {
        if ((ix < 0) || (ix >= this.params.length)) return;
        if (this.params[ix].hidden != hidden) {
            if (hidden) {
                console.log('Param ' + (+ix + 1) + '-');
            } else {
                console.log('Param ' + (+ix + 1) + '+');
            }
            this.params[ix].hidden = hidden;
            if (this.id !== null) {
                await saveQuestParamValue(this.id, ix, this.params[ix].value, this.params[ix].hidden);
            }
        }
    }
}
  
class QmSlot {
    constructor(public name: string, public loc: number, public qm: QM, public date: Date) {}
}

export function addQm(name: string, username: string, qm): QmContext {
    let ix = null;
    let loc = null;
    for (let i = 0; i < qm.locations.length; i++) {
        if (qm.locations[i].isStarting) {
            loc = i;
                break;
            }
        }
        const r = new QmSlot(name, loc, qm, new Date());
        if (hash.length < MAX_SLOTS) {
            ix = hash.length;
            hash.push(r);
        } else {
            hash[ix].name = name;
            hash[ix].loc = loc;
            hash[ix].qm = qm;
            hash[ix].date = new Date();
        }
        const ctx = new QmContext(name, loc, ix, username);
        for (let i = 0; i < qm.params.length; i++) {
            let v = 0;
            if (qm.params[i].starting != '[') {
                v = calculate(qm.params[i].starting, [], randomFromMathRandom);
            }
            const p: QmParam = new QmParam(qm.params[i].name, +qm.params[i].min, +qm.params[i].max, v);
            ctx.params.push(p);
        }
        return ctx;
}

export async function load(name: string, username: string): Promise<QmContext> {
    try {
        let ix = null;
        const data = fs.readFileSync(__dirname + '/../upload/' + name);
        for (let i = 0; i < hash.length; i++) {
             if (hash[i].name == name) {
                 hash[i].date = new Date();
                 const ctx = new QmContext(hash[i].name, hash[i].loc, i, username);
                 const qm = parse(data);
                 for (let i = 0; i < qm.params.length; i++) {
                    let v = 0;
                    if (qm.params[i].starting != '[') {
                       v = await calc(qm.params[i].starting, []);
                    }
                    const p: QmParam = new QmParam(qm.params[i].name, +qm.params[i].min, +qm.params[i].max, v);
                    ctx.params.push(p);
                 }
                 return ctx;
             }
             if ((ix === null) || (hash[ix].date > hash[i].date)) {
                 ix = i;
             }
        }
        const qm = parse(data);
        return addQm(name, username, qm);
    } catch (error) {
       console.error(error);
    }
}

export async function getQm(ctx: QmContext): Promise<QM> {
    try {
        if ((ctx.ix >= hash.length) || (hash[ctx.ix].name != ctx.name)) {
            const x = await load(ctx.name, ctx.username);
            ctx.ix = x.ix;
        }
        hash[ctx.ix].date = new Date();
        return hash[ctx.ix].qm;
    } catch (error) {
        console.error(error);
    }
}