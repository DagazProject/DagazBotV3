const TelegramBot = require('node-telegram-bot-api');

import { parse } from "./qm/qmreader";
import * as fs from "fs";

import { db, getTokens, updateAccount, isAdmin, getChatsByLang, saveMessage, saveClientMessage, getAdminChats, getParentMessage, getCommands, addCommand, getActions, setNextAction, getCaption, waitValue, getParamWaiting, setWaitingParam, getMenuItems, getWaiting, chooseItem, getRequest, getSpParams, getSpResults, setParamValue, setResultAction } from "./data-source"

//const data = fs.readFileSync(__dirname + `/../upload/sample.qm`);
//const qm = parse(data);

const RESULT_FIELD = 'result';

const RUN_INTERVAL = 500;

let isProcessing = [];

async function execCommands(bot, service: number): Promise<boolean> {
    if (isProcessing[service]) return false;
    isProcessing[service] = true;
    const actions = await getActions(service);
    for (let i = 0; i < actions.length; i++) {
        let caption; let message; let items;
        switch (actions[i].type) {
            case 2:
                // Input string
                caption = await getCaption(actions[i].ctx);
                message = await bot.sendMessage(caption.chat, caption.value);
                await waitValue(actions[i].ctx, message.message_id, false);
                break;
            case 3:
                // Output string
                caption = await getCaption(actions[i].ctx);
                await bot.sendMessage(caption.chat, caption.value);
                await setNextAction(actions[i].ctx);
                break;
            case 5:
                // Menu
                caption = await getCaption(actions[i].ctx);
                items = await getMenuItems(actions[i].ctx, actions[i].action, caption.lang);
                if (items.length > 0) {
                    let menu = []; let row = [];
                    for (let j = 0; j < items.length; j++) {
                        if (row.length >= caption.width) {
                            menu.push(row);
                            row = [];
                        }
                        row.push({
                            text: items[j].value,
                            callback_data: items[j].id
                        });
                    }
                    if (row.length > 0) {
                        menu.push(row);
                    }
                    message = await bot.sendMessage(caption.chat, caption.value, {
                        reply_markup: {
                          inline_keyboard: menu
                        }
                    });
                    await waitValue(actions[i].ctx, message.message_id, true);
                }
                break;
            case 6:
                // Stored Procedure
                const sp = await getRequest(actions[i].ctx);
                if (sp !== null) {
                    const p = await getSpParams(actions[i].ctx, sp.user, sp.service);
                    let sql = 'select ' + sp.value + '(';
                    let params = [];
                    for (let j = 0; j < p.length; j++) {
                        sql = sql + ',$' + p[j].rn;
                        params.push(p[j].value);
                    }
                    sql = sql + ') as value';
                    const z = await db.manager.query(sql, params);
                    if (z && z.length > 0) {
                        const results = await getSpResults(actions[i].ctx);
                        let r = null;
                        for (let k = 0; k < results.length; k++) {
                            const v = z[0].value[results[k].name];
                            if (results[k].param) {
                                await setParamValue(actions[i].ctx, results[k].param, v);
                            } else if (results[k].name == RESULT_FIELD) {
                                r = v;
                            }
                        }
                        if (r !== null) {
                            await setResultAction(actions[i].ctx, r);
                        } else {
                            await setNextAction(actions[i].ctx);
                        }
                    }
                }
                break;
        }
    }
    isProcessing[service] = false;
    return actions.length > 0;
}

let run = async function(bot, service: number) {
    if (await execCommands(bot, service)) {
        setTimeout(run, RUN_INTERVAL, bot, service);
    }
}

db.initialize().then(async () => {
  const services = await getTokens();
  for (let i = 0; i < services.length; i++) {
      const bot = new TelegramBot(services[i].token, { polling: true });
      bot.on('text', async msg => {
//        console.log(msg);
          const user = await updateAccount(services[i].id, msg.from.id, msg.from.username, msg.chat.id, msg.from.first_name, msg.from.last_name, msg.from.language_code);
          let cmd = null;
          const r = msg.text.match(/\/(\w+)\s*(\S+)*/);
          if (r) {
            cmd = r[1];
        }
        const commands = await getCommands(user, services[i].id);
        let menu = []; let c = null;
        for (let i = 0; i < commands.length; i++) {
            if (commands[i].visible) {
                menu.push({
                    command: commands[i].name,
                    description: commands[i].description
                });
            }
            if (commands[i].name == cmd) {
                c = commands[i].id;
            }
        }
//      console.log(menu);
        if (menu.length > 0) {
            bot.setMyCommands(menu);
        }
        if (c !== null) {
            await addCommand(user, services[i].id, c);
            await run(bot, services[i].id);
            return;
        }
        const waiting = await getParamWaiting(user, services[i].id);
        if (waiting !== null) {
            if (waiting.hide !== null) {
                await bot.deleteMessage(msg.chat.id, waiting.hide);
            }
            await setWaitingParam(waiting.ctx, msg.text);
            await setNextAction(waiting.ctx);
            return;
        }
        if (cmd === null) {
          let reply_id = null;
          if (msg.reply_to_message) {
              reply_id = await getParentMessage(msg.reply_to_message.message_id);
          }
          const parent_id = await saveMessage(msg.message_id, user, services[i].id, msg.from.language_code, msg.text, reply_id);
          const f = await isAdmin(user);
          if (f) {
              const ids = await getChatsByLang(services[i].id, msg.from.language_code);
              for (let j = 0; j < ids.length; j++) {
                  const m = await bot.sendMessage(ids[j], msg.text, (reply_id === null) ? undefined : { reply_to_message_id: reply_id});
//                console.log(m);
                  await saveClientMessage(parent_id, m.message_id);
              }
          } else {
              const ids = await getAdminChats();
              for (let j = 0; j < ids.length; j++) {
                  const m = await bot.sendMessage(ids[j], msg.text, (reply_id === null) ? undefined : { reply_to_message_id: reply_id});
//                console.log(m);
                  await saveClientMessage(parent_id, m.message_id);
              }
          }
        }
    });
    bot.on('callback_query', async msg => {
//      console.log(msg);
        const waiting = await getWaiting(msg.from.id, services[i].id, msg.data);
        if (waiting !== null) {
            if (waiting.hide !== null) {
                await bot.deleteMessage(msg.chat.id, waiting.hide);
            }
            if (waiting.param !== null) {
                await setWaitingParam(waiting.ctx, msg.text);
                await setNextAction(waiting.ctx);
                return;
            }
            await chooseItem(waiting.ctx, msg.data);
        }
    });
}
   
}).catch((error) => console.error("Error: ", error))

