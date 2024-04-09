import { QM, parse } from "./qm/qmreader";
import * as fs from "fs";

const MAX_SLOTS = 5;

export class QmParam {
    constructor(public readonly title: string, public min: number, public max: number, public value) {}
}

export class QmContext {
    public messageId: number = null;
    public params: QmParam[] = [];
    public fixed: string = '';
    public date: Date = new Date();
    public money: number = 100000;
    constructor(public readonly name: string, public readonly loc: number, public ix, public username: string) {}
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