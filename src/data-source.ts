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

export const db = new DataSource({
  type: "postgres",
  host: "127.0.0.1",
  port: 5432,
  username: "dagaz-bot",
  password: "dagaz-bot",
  database: "dagaz-bot",
  synchronize: true,
  logging: false,
  entities: [users, service, user_service, script, command, user_context, param_type, param_value, message, client_message, action_type, server, action, localized_string, request_param, response_param, account, task],
  subscribers: [],
  migrations: []
})

class Token {
  constructor(public readonly id: number, public readonly token: string) {}
}

export async function getTokens(): Promise<Token[]> {
  try {
    let r = [];
    const x = await db.manager.query(`select id, token from service`);
    for (let i = 0; i < x.length; i++) {
        r.push(new Token(x[i].id, x[i].token));
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
    if (!x || x.length == 0) return null;
    return x[0].is_admin;
  } catch (error) {
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
    const x = await db.manager.query(`insert into client_message(parent_id, message_id) values ($1, $2)`, [parent, id]);
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

class Command {
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
    if (!x || x.length == 0 || !x[0].is_developer) return r;
    const y = await db.manager.query(`
       select a.id, a.name, coalesce(b.value, c.value) as description, a.is_visible
       from   command a
       left   join localized_string b on (b.command_id = a.id and b.lang = $1)
       inner  join localized_string c on (c.command_id = a.id and c.lang = 'en')
       where  coalesce(a.service_id, $2) = $3
       order  by a.order_num`, [x[0].lang, service, service]);
    for (let i = 0; i < y.length; i++) {
       r.push(new Command(y[i].id, y[i].name, y[i].description, y[i].is_visible));
    }
    return r;
  } catch (error) {
    console.error(error);
  }
}

export async function addCommand(user: number, service: number, command: number): Promise<void> {
  try {
    const x = await db.manager.query(`select addCommand($1, $2, $3)`, [user, service, command]);
    return x[0].id;
  } catch (error) {
    console.error(error);
  }
}

class Action {
  constructor(public readonly ctx: number, public readonly action: number, public readonly type: number) {}
}

export async function getActions(service: number): Promise<Action[]> {
  try {
    let r = [];
    const x = await db.manager.query(`select * from getActions($1)`, [service]);
    for (let i = 0; i < x.length; i++) {
      r.push(new Action(x[i].id, x[i].action_id, x[i].type_id));
    }
    return r;
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
      `select coalesce(b.value, c.default_value) as value
       from   user_context a
       inner  join param_type c on (c.command_id = a.command_id)
       left   join param_value b on (b.context_id = a.id and c.id = b.param_id)
       where  a.id = $1 and c.name = $2`, [ctx, name]);
    let v = '';
    if (x.rows && x.rows.length > 0) v = x.rows[0].value;
    value = value.replace('{' + name + '}', v);
    r = value.match(/{(\S+)}/);
  }
  return value;
}

class Caption {
  constructor(public readonly value: string, public readonly chat: number) {}
}

export async function getCaption(ctx: number): Promise<Caption> {
  try {
    const x = await db.manager.query(`
       select coalesce(c.value, d.value) as value, u.chat_id
       from   user_context a
       inner  join action b on (b.command_id = a.command_id and b.id = a.locations_id)
       inner  join users u on (u.id = a.user_id)
       left   join localized_string c on (c.action_id = b.id and b.lang = u.lang)
       inner  join localized_string d on (d.action_id = b.id and d.lang = 'en')
       where  a.id = $1`, [ctx]);
       if (!x || x.length == 0) return null;
       let value = await replacePatterns(ctx, x[0].value);
       return new Caption(value, x[0].chat_id);
  } catch (error) {
    console.error(error);
  }
}

export async function waitValue(ctx: number, msg: number): Promise<void> {
  try {
    const x = await db.manager.query(`select waitValue($1, $2)`, [ctx, msg]);
  } catch (error) {
    console.error(error);
  }
}

class Waiting {
  constructor(public readonly ctx: number, public readonly param: number, public readonly hide: number) {}
}

export async function getWaiting(user: number, service: number): Promise<Waiting> {
  try {
    const x = await db.manager.query(`
       select x.ctx, x.param, x.hide
       from ( select a.id as ctx, a.is_waiting, c.id as param, a.hide_id as hide,
                     row_number() over (order by a.priority desc) as rn
              from   user_context a
              inner  join action b on (b.command_id = a.command_id and b.id = a.location_id)
              where  a.user_id = $1 and a.service_id = $2
              and    not a.closed ) x
       where  x.rn = 1 and x.is_waiting`, [user, service]);
    if (!x || x.length == 0) return null;
    return new Waiting(x[0].ctx, x[0].param, x[0].hide);
  } catch (error) {
    console.error(error);
  }
}

export async function setParamValue(ctx: number, value: string): Promise<void> {
  try {
    const x = await db.manager.query(`select setParamValue($1, $2)`, [ctx, value]);
  } catch (error) {
    console.error(error);
  }
}
