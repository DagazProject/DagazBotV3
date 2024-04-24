import { QM, parse } from "./qm/qmreader";
import * as fs from "fs";

import { saveQuestParamValue, saveQuestParamHidden, saveQuestLoc } from "./data-source";

const MAX_SLOTS = 5;

export class QmParam {
    public hidden: boolean = true;
    constructor(public readonly title: string, public min: number, public max: number, public value: number) {}
}

export class QmContext {
    public id: number = null;
    public messageId: number = null;
    public params: QmParam[] = [];
    public fixed: string = '';
    public date: Date = new Date();
    public money: number = 100000;
    public jumps: number[] = [];
    public locs: number[] = [];

    constructor(public readonly name: string, public loc: number, public ix, public username: string) {}

    public async setLoc(loc: number) {
        if (this.loc != loc) {
            this.loc = loc;
            if (this.id !== null) {
                await saveQuestLoc(this.id, loc);
            }
        }
    }

    public async setValue(ix: number, value: number) {
        if ((ix < 0) || (ix >= this.params.length)) return;
        if (this.params[ix].max < value) value = this.params[ix].max;
        if (this.params[ix].min > value) value = this.params[ix].min;
        if (this.params[ix].value != value) {
            this.params[ix].value = value;
            if (this.id !== null) {
                await saveQuestParamValue(this.id, ix, value);
            }
        }
    }

    public async setHidden(ix: number, hidden: boolean) {
        if ((ix < 0) || (ix >= this.params.length)) return;
        if (this.params[ix].hidden != hidden) {
            this.params[ix].hidden = hidden;
            if (this.id !== null) {
                await saveQuestParamHidden(this.id, ix, hidden);
            }
        }
    }
}
  
class QmSlot {
    constructor(public name: string, public loc: number, public qm: QM, public date: Date) {}
}

let hash: QmSlot[] = [];

export function load(name: string, username: string): QmContext {
    try {
        let ix = null;
        for (let i = 0; i < hash.length; i++) {
             if (hash[i].name == name) {
                 hash[i].date = new Date();
                 return new QmContext(hash[i].name, hash[i].loc, i, username);
             }
             if ((ix === null) || (hash[ix].date > hash[i].date)) {
                 ix = i;
             }
        }
        const data = fs.readFileSync(__dirname + '/../upload/' + name);
        const qm = parse(data);
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
        return new QmContext(name, loc, ix, username);
    } catch (error) {
       console.error(error);
    }
}

export function getQm(ctx: QmContext): QM {
    try {
        if ((ctx.ix >= hash.length) || (hash[ctx.ix].name != ctx.name)) {
            const x = load(ctx.name, ctx.username);
            ctx.ix = x.ix;
        }
        hash[ctx.ix].date = new Date();
        return hash[ctx.ix].qm;
    } catch (error) {
        console.error(error);
    }
}