import { assertNever } from "./assertNever";
import { DeepImmutable } from "./deepImmutable";

import { QmContext } from "../qmhash";

export class Writer {
    private buf = Buffer.alloc(this.chunkSize);
    private pos = 0;
  
    private ensure(len: number) {
      if (this.pos + len > this.buf.length) {
        this.buf = Buffer.concat([this.buf as Uint8Array, Buffer.alloc(this.chunkSize) as Uint8Array]);
      }
    }
  
    constructor(private readonly chunkSize = 1024 * 1024) {}
  
    export() {
        return this.buf.slice(0, this.pos);
    }
    
    int32(i: number) {
        this.ensure(4);
        this.buf.writeInt32LE(i, this.pos);
        this.pos += 4;
    }
    writeString(str: string | null | undefined) {
        if (str === null || str === undefined) {
          this.int32(0);
        } else {
          this.int32(1);
          const stringBuffer = Buffer.from(str, "utf16le");
          if (stringBuffer.length % 2 !== 0) {
            throw new Error(`Internal error, utf16le is not even`);
          }
          const length = stringBuffer.length / 2;
    
          this.int32(length);
    
          this.ensure(stringBuffer.length);
          stringBuffer.copy(this.buf as Uint8Array, this.pos);
          this.pos += stringBuffer.length;
        }
    }
    byte(b: number) {
        this.ensure(1);
        this.buf[this.pos] = b;
        this.pos += 1;
    }
}

export function saveCtx(ctx: DeepImmutable<QmContext>, qm) {
    const w = new Writer();

    w.writeString(ctx.name);
    w.int32(qm.locations[ctx.loc].id);
    w.int32(ctx.params.length);

    for (let i = 0; i < ctx.params.length; i++) {
        w.writeString(ctx.params[i].title);
        w.int32(ctx.params[i].min);
        w.int32(ctx.params[i].max);
        w.int32(ctx.params[i].value);
        w.int32(ctx.params[i].hidden ? 1 : 0);
    }

    return w.export();
}