import "reflect-metadata"
import { DataSource } from "typeorm"
import { users } from "./entity/users"
import { service } from "./entity/service"
import { user_service } from "./entity/user_service"
import { script } from "./entity/script"
import { user_context } from "./entity/user_context"
import { param_type } from "./entity/param_type"
import { param_value } from "./entity/param_value"
import { message } from "./entity/message"
import { client_message } from "./entity/client_message"
import { command } from "./entity/command"
import { localized_string } from "./entity/localized_string"
import { server } from "./entity/server"
import { action } from "./entity/action"
import { action_type } from "./entity/action_type"
import { request_param } from "./entity/request_param"
import { response_param } from "./entity/response_param"
import { task } from "./entity/task"
import { account } from "./entity/account"
import { command_param } from "./entity/command_param"
import { macro } from "./entity/macro"
import { macro_param } from "./entity/macro_param"
import { delta_type } from "./entity/delta_type"
import { global_param } from "./entity/global_param"
import { global_value } from "./entity/global_value"
import { global_fixup } from "./entity/global_fixup"
import { global_log } from "./entity/global_log"
import { text_type } from "./entity/text_type"
import { quest_text } from "./entity/quest_text"
import { info } from "./entity/info"
import { user_info } from "./entity/user_info"
import { session_type } from "./entity/session_type"
import { session } from "./entity/session"
import { session_param } from "./entity/session_param"
import { user_session } from "./entity/user_session"

export const db = new DataSource({
  type: "postgres",
  host: "127.0.0.1",
  port: 5432,
  username: "dagaz-bot",
  password: "dagaz-bot",
  database: "dagaz-bot",
  synchronize: true,
  logging: false,
  entities: [global_param, global_value, global_fixup, global_log, users, service, user_service, script, command, user_context, param_type, param_value, message, client_message, action_type, server, action, localized_string, request_param, response_param, account, task, command_param, macro, macro_param, delta_type, text_type, quest_text, info, user_info, session_type, session, session_param, user_session],
  subscribers: [],
  migrations: []
})

export class Token {
  constructor(public readonly id: number, public readonly token: string) {}
}

export async function getTokens(): Promise<Token[]> {
  try {
    let r = [];
    const x = await db.manager.query(`select id, token from service where enabled`);
    for (let i = 0; i < x.length; i++) {
        r.push(new Token(+x[i].id, x[i].token));
    }
    return r;
  } catch (error) {
    console.error(error);
  }
}

export async function updateAccount(serv: number, uid: number, name: string, chat: number, first: string, last: string, lang: string): Promise<number> {
  try {
    const x = await db.manager.query(`select updateAccount($1, $2, $3, $4, $5, $6, $7) as id`, [serv, uid, name, chat, first, last, lang]);
    return x[0].id;
  } catch (error) {
    console.error(error);
  }
}

export async function isAdmin(id: number): Promise<boolean> {
  try {
    const x = await db.manager.query(`select is_admin from users where id = $1`, [id]);
    if (!x || x.length == 0) return false;
    return x[0].is_admin;
  } catch (error) {
    console.error(error);
  }
}

export async function isDeveloper(user: number, service: number): Promise<boolean> {
  try {
    const x = await db.manager.query(`select is_developer from user_service where user_id= $1 and service_id = $2`, [user, service]);
    if (!x || x.length == 0) return false;
    return x[0].is_developer;
  } catch(error) {
    console.error(error);
  }
}

export async function getChatsByLang(serv: number, lang: string): Promise<number[]> {
  try {
    let r = [];
    const x = await db.manager.query(`
       select a.chat_id 
       from   users a
       inner  join user_service b on (b.user_id = a.id and b.service_id = $1)
       where  a.lang = $2`, [serv, lang]);
    for (let i = 0; i < x.length; i++) {
        r.push(x[i].chat_id);
    }
    return r;
  } catch (error) {
    console.error(error);
  }
}

export async function saveMessage(id: number, user: number, service: number, lang: string, data: string, reply: number): Promise<number> {
  try {
    const x = await db.manager.query(`select saveMessage($1, $2, $3, $4, $5, $6) as id`, [id, user, service, lang, data, reply]);
    return x[0].id;
  } catch (error) {
    console.error(error);
  }
}

export async function saveClientMessage(parent: number, id: number): Promise<void> {
  try {
    await db.manager.query(`insert into client_message(parent_id, message_id) values ($1, $2)`, [parent, id]);
  } catch (error) {
    console.error(error);
  }
}

export async function getAdminChats(): Promise<number[]> {
  try {
    let r = [];
    const x = await db.manager.query(`
       select a.chat_id 
       from   users a
       where  a.is_admin`);
    for (let i = 0; i < x.length; i++) {
       r.push(x[i].chat_id);
    }
    return r;
  } catch (error) {
    console.error(error);
  }
}

export async function getParentMessage(id: number): Promise<number> {
  try {
    const x = await db.manager.query(`
       select b.message_id
       from   client_message a
       inner  join message b on (b.id = a.parent_id)
       where  a.message_id = $1`, [id]);
    if (!x || x.length == 0) return null;
    return x[0].message_id;
  } catch (error) {
    console.error(error);
  }
}

export class Command {
  constructor(public readonly id: number, public readonly name: string, public readonly description: string, public readonly visible: boolean) {}
}

export async function getCommands(user: number, service: number): Promise<Command[]> {
  try {
    let r = [];
    const x = await db.manager.query(`
       select a.is_developer, b.lang
       from   user_service a
       inner  join users b on (b.id = a.user_id)
       where  a.user_id = $1 and a.service_id = $2`, [user, service]);
    if (!x || x.length == 0) return r;
    const y = await db.manager.query(`
       select a.id, a.name, coalesce(b.value, c.value) as description, a.is_visible
       from   command a
       left   join localized_string b on (b.command_id = a.id and b.lang = $1)
       inner  join localized_string c on (c.command_id = a.id and c.lang = 'en')
       where  coalesce(a.service_id, $2) = $3
       order  by a.order_num`, [x[0].lang, service, service]);
    for (let i = 0; i < y.length; i++) {
       r.push(new Command(+y[i].id, y[i].name, y[i].description, y[i].is_visible));
    }
    return r;
  } catch (error) {
    console.error(error);
  }
}

export async function addCommand(user: number, service: number, command: number): Promise<number> {
  try {
    const x = await db.manager.query(`select addCommand($1, $2, $3) as id`, [user, service, command]);
    return x[0].id;
  } catch (error) {
    console.error(error);
  }
}

export async function startCommand(ctx: number): Promise<void> {
  try {
    await db.manager.query(`select startCommand($1)`, [ctx]);
  } catch (error) {
    console.error(error);
  }
}

export class Action {
  constructor(public readonly ctx: number, public readonly action: number, public readonly type: number, public readonly param, public readonly service) {}
}

export async function getActions(service: number): Promise<Action[]> {
  try {
    let r = [];
    const x = await db.manager.query(`select x->>'id' as id, x->>'action_id' as action_id, x->>'type_id' as type_id, x->>'param_id' as param_id, x->>'service_id' as service_id from getActions($1) as x`, [service]);
    for (let i = 0; i < x.length; i++) {
      r.push(new Action(+x[i].id, +x[i].action_id, +x[i].type_id, +x[i].param_id, +x[i].service_id));
    }
    return r;
  } catch (error) {
    console.error(error);
  }
}

export async function setFirstAction(ctx: number, action: number): Promise<void> {
  try {
    await db.manager.query(`select * from setFirstAction($1, $2)`, [ctx, action]);
  } catch (error) {
    console.error(error);
  }
}

export async function setNextAction(ctx: number):Promise<void> {
  try {
    await db.manager.query(`select * from setNextAction($1)`, [ctx]);
  } catch (error) {
    console.error(error);
  }
}

async function replacePatterns(ctx: number, value: string) {
  let r = value.match(/{(\S+)}/);
  while (r) {
    const name = r[1];
    const x = await db.manager.query(
      `select c.default_value as value, c.id
       from   param_type c
       where  c.name = $1`, [name]);
    if (!x.rows && x.rows.length == 0) continue;
    const y = await db.manager.query(
      `select coalesce(b.value, $1) as value
       from   user_context a
       left   join param_value b on (b.context_id = a.id and b.param_id = $2)
       where  a.id = $3`, [x[0].value, x[0].id, ctx]);
    let v = '';
    if (y.rows && y.rows.length > 0) v = y.rows[0].value;
    value = value.replace('{' + name + '}', v);
    r = value.match(/{(\S+)}/);
  }
  return value;
}

export class Caption {
  constructor(public readonly value: string, public readonly chat: number, public readonly lang: string, public readonly width: number, public readonly param: number) {}
}

export async function getCaption(ctx: number): Promise<Caption> {
  try {
    const x = await db.manager.query(`
       select coalesce(c.value, d.value) as value, u.chat_id, b.param_id,
              coalesce(c.lang, d.lang) as lang, coalesce(b.width, 1) as width
       from   user_context a
       inner  join action b on (b.command_id = a.command_id and b.id = a.location_id)
       inner  join users u on (u.id = a.user_id)
       left   join localized_string c on (c.action_id = b.id and c.lang = u.lang)
       inner  join localized_string d on (d.action_id = b.id and d.lang = 'en')
       where  a.id = $1`, [ctx]);
       if (!x || x.length == 0) return null;
       let value = await replacePatterns(ctx, x[0].value);
       return new Caption(value, +x[0].chat_id, x[0].lang, +x[0].width, +x[0].param_id);
  } catch (error) {
    console.error(error);
  }
}

export async function waitValue(ctx: number, msg: number, hide: boolean): Promise<void> {
  try {
    await db.manager.query(`select waitValue($1, $2, $3)`, [ctx, msg, hide]);
  } catch (error) {
    console.error(error);
  }
}

export class Waiting {
  constructor(public readonly ctx: number, public readonly param: number, public readonly hide: number) {}
}

export async function getWaiting(user: number, service: number, action: number): Promise<Waiting> {
  try {
    const x = await db.manager.query(`select id from users where user_id = $1`, [user]);
    if (!x || x.length == 0) return null;
    let y = await db.manager.query(`
      select a.id as ctx, b.param_id, a.hide_id
      from   user_context a
      inner  join action b on (b.command_id = a.command_id and b.id = a.location_id)
      where  a.user_id = $1 and a.service_id = $2 and a.is_waiting`, [x[0].id, service]);
    if (!y || y.length == 0) {
      y = await db.manager.query(`
        select b.id as ctx, p.param_id, b.hide_id
        from   action a
        inner  join user_context b on (b.command_id = a.command_id and b.location_id = a.parent_id and b.is_waiting)
        inner  join action p on (p.id = a.parent_id)
        where  b.user_id = $1 and b.service_id = $2 and a.id = $3`, [x[0].id, service, action]);
    }
    if (!y || y.length == 0) return null;
    return new Waiting(+y[0].ctx, +y[0].param_id, +y[0].hide_id);
  } catch (error) {
    console.error(error);
  }
}

export async function getParamWaiting(user: number, service: number): Promise<Waiting> {
  try {
    const x = await db.manager.query(`
       select x.ctx, x.param, x.hide
       from ( select a.id as ctx, a.is_waiting, b.param_id as param, a.hide_id as hide,
                     row_number() over (order by a.priority desc) as rn
              from   user_context a
              inner  join action b on (b.command_id = a.command_id and b.id = a.location_id)
              where  a.user_id = $1 and a.service_id = $2
              and    a.closed is null ) x
       where  x.rn = 1 and x.is_waiting`, [user, service]);
    if (!x || x.length == 0) return null;
    return new Waiting(+x[0].ctx, +x[0].param, +x[0].hide);
  } catch (error) {
    console.error(error);
  }
}

export async function setWaitingParam(ctx: number, value: string): Promise<void> {
  try {
    await db.manager.query(`select setWaitingParam($1, $2)`, [ctx, value]);
  } catch (error) {
    console.error(error);
  }
}

export class MenuItem {
  constructor(public readonly id: number, public readonly value: string) {}
}

export async function getMenuItems(ctx: number, menu: number, lang: string): Promise<MenuItem[]> {
  try {
    let r = [];
    const x = await db.manager.query(`
       select a.id, c.value, a.order_num
       from   action a
       inner  join localized_string c on (c.action_id = a.id and c.lang = $1)
       where  a.parent_id = $2
       order  by a.order_num`, [lang, menu]);
    for (let i = 0; i < x.length; i++) {
       let value = await replacePatterns(ctx, x[i].value);
       r.push(new MenuItem(+x[i].id, value));
    }
    return r;
  } catch (error) {
    console.error(error);
  }
}

export async function chooseItem(ctx: number, action: number): Promise<void> {
  try {
    await db.manager.query(`select chooseItem($1, $2)`, [ctx, action]);
  } catch (error) {
    console.error(error);
  }
}

export class Request {
  constructor(public readonly user: number, public readonly service: number, public readonly value: string, public readonly type: string) {}
}

export async function getRequest(ctx: number): Promise<Request> {
  try {
    const x = await db.manager.query(`
       select a.user_id, a.service_id, b.request, b.request_type
       from   user_context a
       inner  join action b on (b.command_id = a.command_id and b.id = a.location_id)
       where  a.id = $1`, [ctx]);
    if (!x || x.length == 0) return null;
    return new Request(+x[0].user_id, +x[0].service_id, x[0].request, x[0].request_type);
  } catch (error) {
    console.error(error);
  }
}

export class SpParam {
  constructor(public readonly id: number, public readonly name: string, public readonly value: string, public readonly rn: number) {}
}

export async function getSpParams(ctx: number, user: number, service: number): Promise<SpParam[]> {
  try {
    let r = [];
    const x = await db.manager.query(`
       select d.id, c.name, coalesce(coalesce(e.value, d.default_value), c.default_value) as value, c.order_num,
              row_number() over (order by c.order_num) as rn
       from   user_context a
       inner  join action b on (b.command_id = a.command_id and b.id = a.location_id)
       inner  join request_param c on (action_id = b.id)
       left   join param_type d on (d.id = c.param_id)
       left   join param_value e on (e.param_id = d.id and e.context_id = a.id)
       where  a.id = $1
       order  by c.order_num`, [ctx]);
    for (let i = 0; i < x.length; i++) {
       let value = x[i].value;
       if (x[i].name == 'pUser') {
           value = user;
       }
       if (x[i].name == 'pService') {
           value = service;
       }
       r.push(new SpParam(+x[i].id, x[i].name, value, +x[i].rn));
    }
    return r;
  } catch (error) {
    console.error(error);
  }
}

export class SpResult {
  constructor(public readonly name: string, public readonly param: number) {}
}

export async function getSpResults(ctx: number): Promise<SpResult[]> {
  try {
    let r = [];
    const x = await db.manager.query(`
       select c.name, c.param_id
       from   user_context a
       inner  join action b on (b.command_id = a.command_id and b.id = a.location_id)
       inner  join response_param c on (action_id = b.id)
       where  a.id = $1`, [ctx]);
    for (let i = 0; i < x.length; i++) {
       r.push(new SpResult(x[i].name, +x[i].param_id));
    }
    return r;
  } catch (error) {
    console.error(error);
  }
}

export async function setParamValue(ctx: number, param: number, value: string): Promise<void> {
  try {
    await db.manager.query(`select setParamValue($1, $2, $3)`, [ctx, param, value]);
  } catch (error) {
    console.error(error);
  }
}

export async function getParamValue(ctx: number, param: number): Promise<string> {
  try {
    const x = await db.manager.query(`
       select a.value
       from   param_value a
       where  a.context_id = $1 and a.param_id = $2`, [ctx, param]);
    if (!x || x.length == 0) return null;
    return x[0].value;
  } catch (error) {
    console.error(error);
  }
}

export async function setResultAction(ctx: number, result: string): Promise<void> {
  try {
    await db.manager.query(`select setResultAction($1, $2)`, [ctx, result]);
  } catch (error) {
    console.error(error);
  }
}

export async function getCommandParams(command: number): Promise<SpParam[]> {
  try {
    let r = [];
    const x = await db.manager.query(`
       select b.id, b.name, b.default_value, a.order_num,
              row_number() over (order by a.order_num) as rn
       from   command_param a
       inner  join param_type b on (b.id = a.param_id)
       where  a.command_id = $1
       order  by a.order_num`, [command]);
    for (let i = 0; i < x.length; i++) {
       r.push(new SpParam(+x[i].id, x[i].name, x[i].default_value, +x[i].rn));
    }
    return r;
  }  catch(error) {
    console.error(error);
  }
}

export class MacroParam {
  constructor(public readonly name: string, public readonly value: string) {}
}

export class Macro {
  public params: MacroParam[] = [];
  constructor(public readonly name: string, public readonly result: string) {}
}

export async function getMacros(): Promise<Macro[]> {
  try {
    let r = [];
    const x = await db.manager.query(`select id, name, result from macro`);
    for (let i = 0; i < x.length; i++) {
        let m = new Macro(x[i].name, x[i].result);
        const y = await db.manager.query(`select name, value, order_num from macro_param where macro_id = $1 order by order_num`, [x[i].id]);
        for (let j = 0; j < y.length; j++) {
            m.params.push(new MacroParam(y[j].name, y[j].value));
        }
        r.push(m);
    }
    return r;
  } catch (error) {
    console.error(error);
  }
}

export async function saveQuestParamValue(ctx: number, ix: number, value: number, hidden: boolean): Promise<void> {
  try {
    await db.manager.query(`select saveQuestParamValue($1, $2, $3, $4)`, [ctx, ix, value, hidden]);
  } catch (error) {
    console.error(error);
  }
}

export async function saveQuestLoc(ctx: number, loc: number): Promise<void> {
  try {
    await db.manager.query(`select saveQuestLocation($1, $2)`, [ctx, loc]);
  } catch (error) {
    console.error(error);
  }
}

export async function loadQuestContext(id: number, ctx, qm): Promise<boolean> {
  try {
    const x = await db.manager.query(`
       select a.id, a.location_id
       from   user_context a
       where  a.id = $1`, [id]);
    if (!x || x.length == 0) return false;
    let f = false;
    for (let i = 0; i < qm.locations.length; i++) {
       if (qm.locations[i].id == x[0].location_id) {
           ctx.loc = i;
           f = true;
           break;
       }
    }
    if (!f) return false;
    const y = await db.manager.query(`
       select a.ix, a.value, a.hidden
       from   param_value a
       where  a.context_id = $1
       order  by a.ix`, [id]);
    for (let i = 0; i < y.length; i++) {
       ctx.params[y[i].ix].value  = y[i].value;
       ctx.params[y[i].ix].hidden = y[i].hidden;
    }
    return true;
  } catch (error) {
    console.error(error);
  }
}

export class Script {
  constructor(public readonly id: number, public readonly filename: string, public readonly bonus: number, public readonly penalty) {}
}


export async function getScript(id: string): Promise<Script> {
  try {
    const x = await db.manager.query(`
       select a.id, a.filename, a.win_bonus, a.death_penalty
       from   script a
       where  a.id = $1`, [id]);
    if (!x || x.length == 0) return null;
    return new Script(+x[0].id, x[0].filename, +x[0].win_bonus, +x[0].death_penalty);
  } catch (error) {
    console.error(error);
  }
}

export class User {
  constructor(public readonly id: number, public readonly uid: number, public readonly name: string, public readonly chat) {}
}

export async function getUserByUid(uid: number): Promise<User> {
  try {
    const x = await db.manager.query(`
       select b.id, b.user_id, coalesce(b.firstname, b.username) as name, b.chat_id
       from   users b
       where  b.user_id = $1`, [uid]);
    if (!x || x.length == 0) return null;
    return new User(+x[0].id, +x[0].user_id, x[0].name, +x[0].chat_id);
  } catch (error) {
    console.error(error);
  }
}

export async function getUserByCtx(ctx: number): Promise<User> {
  try {
    const x = await db.manager.query(`
       select b.id, b.user_id, coalesce(b.firstname, b.username) as name, b.chat_id
       from   user_context a
       inner  join users b on (b.id = a.user_id)
       where  a.id = $1`, [ctx]);
    if (!x || x.length == 0) return null;
    return new User(+x[0].id, +x[0].user_id, x[0].name, +x[0].chat_id);
  } catch (error) {
    console.error(error);
  }
}

export async function createQuestContext(script: string, ctx: number, loc: number): Promise<number> {
  try {
     const x = await db.manager.query(`select createQuestContext($1, $2, $3) as id`, [ctx, script, loc]);
     if (!x || x.length == 0) return null;
     return x[0].id;
  } catch (error) {
    console.error(error);
  }
}

export class Fixup {
  constructor(public readonly id: number, public readonly num: number, public readonly value: number) {}
}

export async function getFixups(script: string, ctx: number): Promise<Fixup[]> {
  try {
    let r = [];
    const x = await db.manager.query(`
       select a.user_id, a.service_id
       from   user_context a
       where  a.id = $1`, [ctx]);
    if (!x || x.length == 0) return r;
    const y = await db.manager.query(`
       select b.id, a.param_num - 1 as ix, coalesce(c.value, b.def_value) as value
       from   global_fixup a
       inner  join global_param b on (b.id = a.param_id and b.service_id = $1)
       left   join global_value c on (c.param_id = b.id and c.user_id = $2 and c.script_id is null)
       where  a.script_id = $3`, [x[0].service_id, x[0].user_id, script]);
    for (let i = 0; i < y.length; i++) {
       r.push(new Fixup(+y[i].id, +y[i].ix, +y[i].value));
    }
    return r;
  } catch (error) {
    console.error(error);
  }
}

export async function setGlobalValue(user: number, param: number, type: number, script: string, value: number, limit: number): Promise<void> {
  try {
    await db.manager.query(`select setGlobalValue($1, $2, $3, $4, $5, $6)`, [user, param, type, script, value, limit]);
  } catch (error) {
    console.error(error);
  }
}

export async function closeContext(id: number): Promise<void> {
  try {
    await db.manager.query(`select closeContext($1)`, [id]);
  } catch (error) {
    console.error(error);
  }
}

export async function winQuest(user: number, script: string): Promise<void> {
  try {
    await db.manager.query(`select winQuest($1, $2)`, [user, script]);
  } catch (error) {
    console.error(error);
  }
}

export async function failQuest(user: number, script: string): Promise<void> {
  try {
    await db.manager.query(`select failQuest($1, $2)`, [user, script]);
  } catch (error) {
    console.error(error);
  }
}

export async function deathQuest(user: number, script: string): Promise<void> {
  try {
    await db.manager.query(`select deathQuest($1, $2)`, [user, script]);
  } catch (error) {
    console.error(error);
  }
}

export class Context {
  constructor(public readonly id: number, public readonly filename: string, public readonly username: string, public loc: number, public user_id, public script_id) {}
}

export async function loadContext(uid: number, service: number): Promise<Context> {
  try {
    const x = await db.manager.query(`
       select a.id, b.filename, coalesce(u.firstname, u.username) as username,
              a.location_id, u.id as user_id, b.id as script_id
       from   user_context a
       inner  join users u on (u.id = a.user_id)
       inner  join script b on (b.id = a.script_id)
       where  u.user_id = $1 and a.service_id = $2`, [uid, service]);
    if (!x || x.length == 0) return null;
    return new Context(x[0].id, x[0].filename, x[0].username, x[0].location_id, x[0].user_id, x[0].script_id);
  } catch (error) {
    console.error(error);
  }
}

export class ContextParam {
  constructor(public readonly ix: number, public readonly value: number, public readonly hidden: boolean) {}
}

export async function loadContextParams(ctx: number): Promise<ContextParam[]> {
  try {
    let r = [];
    const x = await db.manager.query(`
       select a.ix, a.value, a.hidden
       from   param_value a
       where  context_id = $1
       order  by a.ix`, [ctx]);
    for (let i = 0; i < x.length; i++) {
       r.push(new ContextParam(+x[i].ix, +x[i].value, x[i].hidden));
    }
    return r;
  } catch (error) {
    console.error(error);
  }
}

export async function uploadScript(user: number, service: number, name: string, filename: string, money: number): Promise<number> {
  try {
    const x = await db.manager.query(`select uploadScript($1, $2, $3, $4, $5) as id`, [user, service, name, filename, money]);
    if (!x || x.length == 0) return null;
    return x[0].id;
  } catch (error) {
    console.error(error);
  }
}

export async function uploadImage(user: number, service: number, filename: string): Promise<number> {
  try {
    const x = await db.manager.query(`select uploadImage($1, $2, $3) as id`, [user, service,filename]);
    if (!x || x.length == 0) return null;
    return x[0].id;
  } catch (error) {
    console.error(error);
  }
}

export async function questText(script: number, type: number, text: string): Promise<void> {
  try {
    db.manager.query(`select questText($1, $2, $3) as id`, [script, type, text]);
  } catch (error) {
    console.error(error);
  }
}

export class ScheduledComand {
  constructor(public readonly cmd: number, public readonly timeout: number) {}
}

export async function getScheduledComands(service: number): Promise<ScheduledComand[]> {
  try {
    let r = [];
    const x = await db.manager.query(`
       select a.command_id, a.timeout
       from   task a
       inner  join command b on (b.id = a.command_id)
       where  b.service_id = $1`, [service]);
    for (let i = 0; i < x.length; i++) {
       r.push(new ScheduledComand(x[i].command_id, x[i].timeout));
    }
    return r;
  } catch (error) {
    console.error(error);
  }
}

export class Info {
  constructor(public readonly id: number, public readonly text: string) {}
}

export async function getInfoMessages(user: number, service: number): Promise<Info[]> {
  try {
    let r = [];
    const x = await db.manager.query(`
      select a.created, b.lang
      from   user_service a
      inner  join users b on (b.id = a.user_id)
      where  a.user_id = $1 and a.service_id = $2`, [user, service]);
    if (!x || x.length == 0) return r;
    const y = await db.manager.query(`
       select a.id, case
                 when $1 = 'ru' then a.ru
                 else a.en
              end as value
       from   info a
       left   join user_info b on (b.info_id = a.id and b.user_id = $2)
       where  a.service_id = $3 and b.id is null and (a.is_mandatory or a.created > $4)
       order  by a.created`, [x[0].lang, user, service, x[0].created]);
    for (let i = 0; i < y.length; i++) {
       r.push(new Info(y[i].id, y[i].value));
    }
    return r;
  } catch (error) {
    console.error(error);
  }
}

export async function acceptInfo(user: number, info: number): Promise<void> {
  try {
    await db.manager.query(`insert into user_info(user_id, info_id) values ($1, $2)`, [user, info]);
  } catch (error) {
    console.error(error);
  }
}

export async function getQuestText(script: number, type: number):Promise<string> {
  try {
    const x = await db.manager.query(`
      select a.value
      from   quest_text a
      where  a.script_id = $1 and a.type_id = $2`, [script, type]);
   if (!x || x.length == 0) return null;
   return x[0].value;
  } catch (error) {
    console.error(error);
  }
}

export class UserContext {
  constructor(public readonly id: number, public readonly hide: number) {}
}

export async function getQuestContexts(service: number, user: number): Promise<UserContext[]> {
  try {
    let r = [];
    const x = await db.manager.query(`
      select a.id, a.hide_id
      from   user_context a
      where  a.service_id = $1 and a.user_id = $2 and not a.script_id is null`, [service, user]);
    for (let i = 0; i < x.length; i++) {
        r.push(new UserContext(+x[i].id, x[i].hide_id));
    }
    return r;
  } catch (error) {
    console.error(error);
  }
}

export class Score {
  constructor(public readonly name: string, public readonly win: number, public readonly lose: number, public readonly death: number, public readonly launch: number) {}
}

export async function getScore(uid: number): Promise<Score[]> {
  try {
    let r = [];
    const x = await db.manager.query(`select id, lang from users where user_id = $1`, [uid]);
    if (!x || x.length == 0) return r;
    let y = await db.manager.query(`
      select coalesce(y.name, z.name) as name,
             x.win, x.lose, x.death, x.launch
      from ( select a.commonname,
             sum(case
               when b.param_id = 2 then b.value
               else 0
             end) win,
             sum(case
               when b.param_id = 5 then b.value
               else 0
             end) lose,
             sum(case
               when b.param_id = 4 then b.value
               else 0
             end) death,
             sum(case
               when b.param_id = 1 then b.value
               else 0
             end) launch
      from   script a
      inner  join global_value b on (b.script_id = a.id)
      where  b.user_id = $1
      group  by a.commonname ) x
      left   join script y on (y.commonname = x.commonname and y.lang = $2)
      left   join script z on (z.commonname = x.commonname and z.lang = 'en')
      order  by x.launch desc`, [x[0].id, x[0].lang]);
    for (let i = 0; i < y.length; i++) {
        r.push(new Score(y[i].name, +y[i].win, +y[i].lose, +y[i].death, +y[i].launch));
    }
    y = await db.manager.query(`
      select sum(case
         when b.param_id = 2 then b.value
         else 0
       end) win,
       sum(case
         when b.param_id = 5 then b.value
         else 0
       end) lose,
       sum(case
         when b.param_id = 4 then b.value
         else 0
       end) death,
       sum(case
         when b.param_id = 1 then b.value
         else 0
       end) launch
      from   global_value b
      where  b.user_id = $1 and b.script_id is null`, [x[0].id]);
    for (let i = 0; i < y.length; i++) {
        r.push(new Score('', +y[i].win, +y[i].lose, +y[i].death, +y[i].launch));
    }
    return r;
  } catch (error) {
    console.error(error);
  }
}

export async function getCredits(uid: number): Promise<number> {
  try {
    const x = await db.manager.query(`
      select b.value
      from   users a 
      inner  join global_value b on (b.user_id = a.id and b.param_id = 3)
      where  a.user_id = $1`, [uid]);
    if (!x || x.length == 0) return null;
    return x[0].value;
  } catch (error) {
    console.error(error);
  }
}
