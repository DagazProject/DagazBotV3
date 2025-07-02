import { QM } from "../qm/qmreader";
import { closeContext, ParseContext, parseLine } from "./parser";

const fs = require('fs');

export function loadQms(name: string, ctx: ParseContext): QM {
    const data = fs.readFileSync(__dirname + '/../upload/' + name + '.qms', 'utf8');
    const lines = data.split(/\r?\n/);
    lines.forEach((line: string) => {
        line = line.replace(/\s*\/\/.*/, '');
        let r = line.match(/^\s*#include:([^:\s]+)/);
        if (r) {
            loadQms(r[1], ctx);
        } else {
            parseLine(line, ctx);
        }
    });
    return closeContext(ctx);
}