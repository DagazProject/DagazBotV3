import { QM, QMParam } from "../qm/qmreader";

function prepareFormula(s: string, id: number): string {
    s = s.replace(/\[p(\d+)\]/g, '\$p$1');
    if (id) {
        s = s.replace(/<>/g, '$p' + String(id));
    }
    return s;
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
    for (let i = 0; i < qm.params.length; i++) {
        const p: QMParam = qm.params[i];
        s = s + `#var:p${+i + 1} #range:${p.min}..${p.max} #default:${p.starting} // ${p.name}\n`;
        for (let j = 0; j < p.showingInfo.length; j++) {
            const r = p.showingInfo[j];
            const t = prepareFormula(r.str, +i + 1);
            s = s + `  #text:${r.from}..${r.to} '${t}'\n`;
        }
    }
    if (s !== '') {
        s = s + '\n';
    }
    // TODO: Locations and Jumps

    return s;
}