import { Jump, Location, QM, QMParam } from "../qm/qmreader";

function prepareText(s: string, id: number): string {
    s = s.replace(/\[p(\d+)\]/g, '\$p$1');
    if (id) {
        s = s.replace(/<>/g, '$p' + String(id));
    }
    s = s.replace(/<fix>/g, '^');
    s = s.replace(/<\/fix>/g, '^');
    s = s.replace(/<clr>/g, '*');
    s = s.replace(/<clrEnd>/g, '*');
    return s;
}

function isEmpty(t: string): boolean {
    t = t.replace(/\s+/, '');
    return t == '';
}

export function decompileQms(qm: QM): string {
    let s = '';
    if (qm.taskText) {
        s = s + '#intro\n';
        s = s + qm.taskText + '\n\n';
    }
    if (qm.successText) {
        s = s + '#congratulation\n';
        s = s + qm.successText + '\n\n';
    }
    for (let i = 0; i < Math.min(qm.params.length, qm.paramsCount) ; i++) {
        const p: QMParam = qm.params[i];
        s = s + `#var:p${+i + 1} #range:${p.min}..${p.max} #default:${p.starting} #order:${+i + 1}`;
        if (p.isMoney) {
            s = s + ' #money';
        }
        if (p.showWhenZero) {
            s = s + ' #zero';
        }
        s = s + ' // ${p.name}\n';
        for (let j = 0; j < p.showingInfo.length; j++) {
            const r = p.showingInfo[j];
            const t = prepareText(r.str, +i + 1);
            s = s + `  #text:${r.from}..${r.to} '${t}'\n`;
        }
    }
    if (s !== '') {
        s = s + '\n';
    }
    for (let i = 0; i < Math.min(qm.locations.length, qm.locationsCount); i++) {
        const l: Location = qm.locations[i];
        s = s + `#site:L${l.id}`;
        if (l.isStarting) {
            s = s + ' #default';
        }
        if (l.isSuccess) {
            s = s + ' #win';
        }
        if (l.isFaily) {
            s = s + ' #lose';
        }
        if (l.isFailyDeadly) {
            s = s + ' #death';
        }
        if (l.dayPassed) {
            s = s + ' #day';
        }
        if (l.isTextByFormula) {
            const t = prepareText(l.textSelectFormula, null);
            s = s + ` {${t}}`;
        }
        let show: string = '';
        let hide: string = '';
        for (let t = 0; t < Math.min(l.paramsChanges.length, qm.paramsCount); t++) {
             const c = l.paramsChanges[t];
             if (c.showingType === 0x01) {
                if (show !== '') {
                    show = show + ';';
                }
                show = show + `p${+t + 1}`;
             }
             if (c.showingType === 0x02) {
                if (hide !== '') {
                    hide = hide + ';';
                }
                hide = hide + `p${+t + 1}`;
             }
        }
        if (show !== '') {
            s = s + ` #show:${show}`;
        }
        if (hide !== '') {
            s = s + ` #hide:${hide}`;
        }
        s = s + '\n';
        for (let j = 0; j < l.texts.length; j++) {
            if (isEmpty(l.texts[j])) continue;
            s = s + `#page:${+j + 1}\n`;
            const t = prepareText(l.texts[j], null);
            s = s + t + '\n';
        }
        for (let t = 0; t < Math.min(l.paramsChanges.length, qm.paramsCount); t++) {
             const c = l.paramsChanges[t];
             if (c.isChangeFormula) {
                 const f = prepareText(c.changingFormula, null);
                 s = s + '\n$' + `p${+t + 1}=${f}`;
            } else
            if (c.change !== 0) {
                 if (c.isChangeValue) {
                     s = s + '\n$' + `p${+t + 1}=${c.change}`;
                 } else {
                     if (c.change > 0) {
                         s = s + '\n$' + `p${+t + 1}=$p${+t + 1}+${c.change}`;
                     } else {
                         s = s + '\n$' + `p${+t + 1}=$p${+t + 1}-${-c.change}`;
                     }
                 }
            }
        }
        for (let k = 0; k < Math.min(qm.jumps.length, qm.jumpsCount); k++) {
            const j: Jump = qm.jumps[k];
            if (j.fromLocationId !== l.id) continue;
            s = s + `#case:L${j.toLocationId}`;
            if (!isEmpty(j.text)) {
                const t = prepareText(j.text, null);
                s = s + ` '${t}'`;
            }
            if (!isEmpty(j.formulaToPass)) {
                const t = prepareText(j.formulaToPass, null);
                s = s + ` {${t}}`;
            }
            s = s + ` #order:${j.showingOrder}`;
            s = s + ` #priority:${j.priority}`;
            if (j.dayPassed) {
                s = s + ' #day';
            }
            if (j.jumpingCountLimit > 0) {
                s = s + ` #count:${j.jumpingCountLimit}`;
            }
            let show: string = '';
            let hide: string = '';
            for (let t = 0; t < Math.min(j.paramsChanges.length, qm.paramsCount); t++) {
                 const c = j.paramsChanges[t];
                 if (c.showingType === 0x01) {
                    if (show !== '') {
                        show = show + ';';
                    }
                    show = show + `p${+t + 1}`;
                 }
                 if (c.showingType === 0x02) {
                    if (hide !== '') {
                        hide = hide + ';';
                    }
                    hide = hide + `p${+t + 1}`;
                 }
            }
            if (show !== '') {
                s = s + ` #show:${show}`;
            }
            if (hide !== '') {
                s = s + ` #hide:${hide}`;
            }
            for (let t = 0; t < Math.min(j.paramsChanges.length, qm.paramsCount); t++) {
                const c = j.paramsChanges[t];
                if (c.isChangeFormula) {
                    const f = prepareText(c.changingFormula, null);
                    s = s + '\n$' + `p${+t + 1}=${f}`;
                } else
                if (c.change !== 0) {
                    if (c.isChangeValue) {
                        s = s + '\n$' + `p${+t + 1}=${c.change}`;
                    } else {
                        if (c.change > 0) {
                            s = s + '\n$' + `p${+t + 1}=$p${+t + 1}+${c.change}`;
                        } else {
                            s = s + '\n$' + `p${+t + 1}=$p${+t + 1}-${-c.change}`;
                        }
                    }
                }
            }
            s = s + '\n';
        }
        s = s + '\n';
    }
    for (let i = 0; i < Math.min(qm.locations.length, qm.locationsCount); i++) {
        const l: Location = qm.locations[i];
        s = s + `#position:L${l.id}:${l.locX}:${l.locY}\n`;
    }
    return s;
}