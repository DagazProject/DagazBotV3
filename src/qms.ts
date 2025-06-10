import { addJump, addLocation, createJump, createLocation, createQm, Location, QM } from "./qm/qmreader";

const fs = require('fs');
const readline = require('readline');

const CX = 25;
const DX = 64;
const DY = 42;

let compatibility: boolean = false;

interface ParseLocation {
  name: string;
  loc: Location;
};

interface ParseJump {
  from: string;
  to: string;
  text: string;
  descr: string;
  order: number;
};

interface ParseContext {
  qm: QM;
  text: string;
  inc: number;
  ix: number;
  iy: number;
  locations: ParseLocation[];
  jumps: ParseJump[];
  loc: Location;
  jump: ParseJump;
  start: Location;
  page: number;
};

function createContext(): ParseContext {
  const qm = createQm();
  const t = '';
  const locations: ParseLocation[] = [];
  const jumps: ParseJump[] = [];
  return {
    qm, text: t, inc: 1, ix: 0, iy: 0,
    locations,
    jumps,
    loc: undefined,
    jump: undefined,
    start: undefined,
    page: 1
  };
}

interface ParseOption {
  name: string;
  value: string;
};

interface ParseCommand {
  cmd: string;
  name: string;
  options: ParseOption[];
  text: string;
}

function isEmpty(line: string): boolean {
  const r = line.match(/\S/);
  return !r;
}

function createOption(name: string, value: string): ParseOption {
  return { name, value };
}

function decorate(s): string {
  s = s.replaceAll(/\*([^*]+)\*/g, '<clr>$1<clrEnd>');
  return s;
}

function getCommand(line: string): ParseCommand {
  let r = line.match(/^\s*#([^:\s]+):(\S*)/);
  if (!r) return null;
  const c: ParseCommand = {
    cmd: r[1],
    name: r[2],
    options: [],
    text: ''
  };
  r = line.match(/#default/);
  if (r) c.options.push(createOption('default', '1'));
  r = line.match(/#win/);
  if (r) c.options.push(createOption('win', '1'));
  r = line.match(/#lose/);
  if (r) c.options.push(createOption('lose', '1'));
  r = line.match(/#death/);
  if (r) c.options.push(createOption('death', '1'));
  r = line.match(/#order:(\d+)/);
  if (r) c.options.push(createOption('order', decorate(r[1])));
  r = line.match(/'([^']*)'/);
  if (r) c.text = r[1];
  return c;
}

function getOption(c: ParseCommand, name: string): string {
  for (let i = 0; i < c.options.length; i++) {
    if (c.options[i].name == name) return c.options[i].value;
  }
  return '0';
}

function getLocationByName(ctx: ParseContext, name: string): Location {
  for (let i = 0; i < ctx.locations.length; i++) {
    if (ctx.locations[i].name == name) return ctx.locations[i].loc;
  }
  return null;
}

function getLocationNameById(ctx: ParseContext, id: number): string {
  for (let i = 0; i < ctx.locations.length; i++) {
    if (ctx.locations[i].loc.id == id) return ctx.locations[i].name;
  }
  return null;
}

function closeCommand(ctx: ParseContext) {
  if (!ctx.start) return;
  let queue: Location[] = [ctx.start];
  let ids: number[] = [ctx.start.id];
  for (let i = 0; i < queue.length; i++) {
    const l: Location = queue[i];
    l.locX = (ctx.ix * DX) + 32;
    l.locY = (ctx.iy * DY) + 63;
    addLocation(ctx.qm, l);
    ctx.ix += ctx.inc;
    if (ctx.ix >= CX) {
        ctx.iy++;
        ctx.inc = -1;
        ctx.ix--;
    }
    if (ctx.ix < 0) {
        ctx.iy++;
        ctx.inc = 1;
        ctx.ix++;
    }
    const from:string = getLocationNameById(ctx, l.id);
    if (from !== null) {
      for (let j = 0; j < ctx.jumps.length; j++) {
        if (ctx.jumps[j].from == from) {
            const loc = getLocationByName(ctx, ctx.jumps[j].to);
            if ((loc !== null) && (ids.indexOf(loc.id) < 0)) {
              queue.push(loc);
              ids.push(loc.id);
            }
        }
      }
    }
  }
  for (let i = 0; i < ctx.jumps.length; i++) {
    const j: ParseJump = ctx.jumps[i];
    const fromId = getLocationByName(ctx, j.from).id;
    const toId = getLocationByName(ctx, j.to).id;
    if (fromId === null) continue;
    if (toId === null) continue;
    const jump = createJump(i + 1, fromId, toId, j.text, j.descr);
    addJump(ctx.qm, jump);
  }
}

export function compile(name: string, callback, username, id, service) {
    const ctx = createContext();
    const rl = readline.createInterface({
      input: fs.createReadStream(__dirname + '/../upload/' + name),
      crlfDelay: Infinity
    });
    rl.on('line', (line) => {
      const c = getCommand(line);
      if (c) {
        if (c.cmd == 'site') {
          ctx.text = '';
          const id: number = ctx.locations.length + 1;
          delete ctx.jump;
          ctx.loc = createLocation(id);
          if (getOption(c, 'default') == '1') {
            ctx.loc.isStarting = true;
            ctx.start = ctx.loc;
          }
          if (getOption(c, 'win') == '1') ctx.loc.isSuccess = true;
          if (getOption(c, 'lose') == '1') ctx.loc.isFaily = true;
          if (getOption(c, 'death') == '1') ctx.loc.isFailyDeadly = true;
          ctx.locations.push({
            name: c.name,
            loc: ctx.loc
          });
        }
        if (c.cmd == 'page') {
          ctx.text = '';
          ctx.page = Number(c.name);
        }
        if (c.cmd == 'case') {
          ctx.text = '';
          delete ctx.loc;
          if (ctx.locations.length > 0) {
             const from: string = ctx.locations[ctx.locations.length - 1].name;
             ctx.jumps.push({
              from: from,
              to: c.name,
              text: c.text,
              descr: '',
              order: Number(getOption(c, 'order'))
             });
          }
        }
      } else {
        if ((ctx.text != '') || !isEmpty(line)) {
          if (ctx.text == '') {
              ctx.text = decorate(line);
          } else {
              ctx.text = ctx.text + '\n' + decorate(line);
          }
          if (ctx.loc) {
            ctx.loc.texts[ctx.page - 1] = ctx.text;
            if (compatibility) {
                ctx.loc.isEmpty = false;
            }
          }
          if (ctx.jump) {
            ctx.jump.descr = String(ctx.text);
          }
        }
      }
    });    
    rl.on('error', (err) => {
      console.error('Parse Error:', err);
    });    
    rl.on('close', () => {
      closeCommand(ctx);
      callback(ctx.qm, name, username, id, service);
    });    
}