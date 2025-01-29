export class Reader {

    private i = 0;
    constructor(private readonly data: Buffer) {}
    int32() {
      const result = this.data.readInt32LE(this.i);
      this.i += 4;
      return result;
    }
  
    readString(): string;
    readString(canBeUndefined: true): string | undefined;
    readString(canBeUndefined: boolean = false) {
      const ifString = this.int32();
      if (ifString) {
        const strLen = this.int32();
        const str = this.data.slice(this.i, this.i + strLen * 2).toString("utf16le");
        this.i += strLen * 2;
        return str;
      } else {
        return canBeUndefined ? undefined : "";
      }
    }
    byte() {
      return this.data[this.i++];
    }
}

interface QMSParam {
    title: string;
    min: number;
    max: number;
    value: number;
    hidden: boolean;
}

function parseParam(r: Reader): QMSParam {
    const title = r.readString();
    const min = r.int32();
    const max = r.int32();
    const value = r.int32();
    const hidden = r.int32();
    return {
        title: title,
        min: min,
        max: max,
        value: value,
        hidden: (hidden > 0) ? true : false
    };
}

interface QMSave {
    name: string;
    id: number;
    params: QMSParam[];
}

function parseSave(r: Reader): QMSave {
    const name = r.readString();
    const id = r.int32();
    const cnt = r.int32();
    const params: QMSParam[] = [];
    for (let i = 0; i < cnt; i++) {
        params.push(parseParam(r));
    }
    return {
        name: name,
        id: id,
        params: params
    };
}

export function restore(data: Buffer): QMSave {
    const r = new Reader(data);
    return parseSave(r);
}