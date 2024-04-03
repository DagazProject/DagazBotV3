const TelegramBot = require('node-telegram-bot-api');

import { parse } from "./qm/qmreader";
import * as fs from "fs";

import { calculate } from "./qm/formula/index";

import { db, getTokens, updateAccount, isAdmin, isDeveloper, getChatsByLang, saveMessage, saveClientMessage, getAdminChats, getParentMessage, getCommands, addCommand, getActions, setNextAction, getCaption, waitValue, getParamWaiting, setWaitingParam, getMenuItems, getWaiting, chooseItem, getRequest, getSpParams, getSpResults, setParamValue, getParamValue, setResultAction, getCommandParams } from "./data-source";
import { randomFromMathRandom } from "./qm/randomFunc";

import {load, getQm, QmContext} from "./qmhash";

const RESULT_FIELD = 'result';

const RUN_INTERVAL = 500;

let isProcessing = [];
let ctxs = [];

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
            case 4:
                // Virtual Menu
                caption = await getCaption(actions[i].ctx);
                var v = await getParamValue(actions[i].ctx, caption.param);
                if (v !== null) {
                    const list = v.split(/,/);
                    if (list.length > 1) {
                        let menu = []; let row = [];
                        for (let j = 0; j < list.length; j++) {
                            if (row.length >= caption.width) {
                                menu.push(row);
                                row = [];
                            }
                            row.push({
                                text: list[j],
                                callback_data: list[j]
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
                    } else if (list.length == 1) {
                        await setParamValue(actions[i].ctx, caption.param, v);
                        await setNextAction(actions[i].ctx);
                    }
                }
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
      bot.on('document', async doc => {
        console.log(doc);
        const f = doc.document.file_name.match(/\.qmm?$/);
        if (f) {
            const name = await bot.downloadFile(doc.document.file_id, __dirname + '/../upload/');
            const r = name.match(/([^\/\\]+)$/);
            if (r) {
//              console.log(__dirname + '/../upload/' + r[1]);
                const data = fs.readFileSync(__dirname + '/../upload/' + r[1]);
                try {
                    const qm = parse(data);
                    await bot.sendMessage(doc.chat.id, 'Сценарий [' + r[1] + '] загружен');
//                  console.log(qm);
                    // TODO: 

                } catch (error) {
                    console.error(error);
                    fs.unlinkSync(name);
                }
            } else {
                fs.unlinkSync(name);
            }
        }
      });
      bot.on('text', async msg => {
//      console.log(msg);
        const user = await updateAccount(services[i].id, msg.from.id, msg.from.username, msg.chat.id, msg.from.first_name, msg.from.last_name, msg.from.language_code);
        let cmd = null;
        const r = msg.text.match(/\/(\w+)\s*(\S+)?\s*(\S+)?\s*(\S+)?\s*(\S+)?\s*(\S+)?/);
        if (r) {
            cmd = r[1];
        }
//      console.log(r);
        const developer = await isDeveloper(user, services[i].id);
        if (developer) {
            if ((cmd == 'calc') && r[2]) {
                let params = [];
                for (let i = 3; i < r.length; i++) {
                    params.push(r[i]);
                }
                try {
                    const x = calculate(r[2], params, randomFromMathRandom);
//                  console.log(x);
                    await bot.sendMessage(msg.chat.id, x);
                } catch (error) {
                    console.error(error);
                }
                return;
            }
            if ((cmd == 'load') && r[2]) {
                const ctx = load(r[2]);
                if (ctx) {
                    ctxs[msg.from.id] = ctx;
                    const QM = getQm(ctx);
//                  console.log(QM.locations[ctx.loc]);
                    let menu = [];
                    for (let i = 0; i < QM.jumps.length; i++) {
//                      console.log(QM.jumps[i]);
                        if (QM.jumps[i].fromLocationId == QM.locations[ctx.loc].id) {
                            menu.push([{
                                text: QM.jumps[i].text ? QM.jumps[i].text : '...',
                                callback_data: QM.jumps[i].id
                            }]);
                        }
                    }
                    if (menu.length > 0) {
                        ctxs[msg.from.id].message = await bot.sendMessage(msg.chat.id, QM.locations[ctx.loc].texts[0], {
                            reply_markup: {
                              inline_keyboard: menu
                            }
                        });
                    } else {
                        await bot.sendMessage(msg.chat.id, QM.locations[ctx.loc].texts[0]);
                    }
                }
            }
        }
        const commands = await getCommands(user, services[i].id);
        let menu = []; let c: number = null;
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
            const params = await getCommandParams(c);
            const ctx = await addCommand(user, services[i].id, c);
            for (let j = 0; j < params.length; j++) {
                let v = params[j].value;
                if (r[params[j].rn + 1]) {
                    v = r[params[j].rn + 1];
                }
                if (v) {
                    await setParamValue(ctx, params[j].id, v);
                }
            }
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
          const admin = await isAdmin(user);
          if (admin) {
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
        if (ctxs[msg.from.id] && ctxs[msg.from.id].message) {
            try {
                await bot.deleteMessage(msg.message.chat.id, ctxs[msg.from.id].message.message_id);
                ctxs[msg.from.id].message = null;
                const QM = getQm(ctxs[msg.from.id]);
                if (QM) {
                    let id = null;
                    for (let i = 0; i < QM.jumps.length; i++) {
                        if (QM.jumps[i].id == msg.data) id = QM.jumps[i].toLocationId;
                    }
                    if (id !== null) {
                        for (let i = 0; i < QM.locations.length; i++) {
                            if (QM.locations[i].id == id) {
                                ctxs[msg.from.id].loc = i;
//                              console.log(QM.locations[i]);
                                let menu = [];
                                for (let j = 0; j < QM.jumps.length; j++) {
//                                  console.log(QM.jumps[j]);
                                    if (QM.jumps[j].fromLocationId == QM.locations[i].id) {
                                        menu.push([{
                                            text: QM.jumps[j].text ? QM.jumps[j].text : '...',
                                            callback_data: QM.jumps[j].id
                                        }]);
                                    }
                                }
                                if (menu.length > 0) {
                                    ctxs[msg.from.id].message = await bot.sendMessage(msg.message.chat.id, QM.locations[i].texts[0], {
                                        reply_markup: {
                                          inline_keyboard: menu
                                        }
                                    });
                                } else {
                                    await bot.sendMessage(msg.message.chat.id, QM.locations[i].texts[0]);
                                }
                                break;
                            }
                        }
                    }
                }
            } catch (error) {
                console.error(error);
            }
            return;
        }
        const waiting = await getWaiting(msg.from.id, services[i].id, msg.data);
        if (waiting !== null) {
            if (waiting.hide !== null) {
                try {
                    await bot.deleteMessage(msg.message.chat.id, waiting.hide);
                } catch (error) {
                    console.error(error);
                }
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

