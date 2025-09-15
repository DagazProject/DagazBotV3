import { QM, QMParam } from "../qm/qmreader";

export function decompileQms(qm: QM): string {
    let s = '';
    for (let i = 0; i < qm.params.length; i++) {
        const p: QMParam = qm.params[i];
        s = s + `#var:p${i + 1} #range:${p.min}..${p.max} #default:${p.starting} // ${p.name}\n`;
    }
    if (s !== '') {
        s = s + '\n';
    }
    // TODO: Locations and Jumps

    return s;
}