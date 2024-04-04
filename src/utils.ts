import { db, getTokens, updateAccount, isAdmin, isDeveloper, getChatsByLang, saveMessage, saveClientMessage, getAdminChats, getParentMessage, getCommands, addCommand, getActions, setNextAction, getCaption, waitValue, getParamWaiting, setWaitingParam, getMenuItems, getWaiting, chooseItem, getRequest, getSpParams, getSpResults, setParamValue, getParamValue, setResultAction, getCommandParams } from "./data-source";

import { calculate } from "./qm/formula/index";
import { randomFromMathRandom } from "./qm/randomFunc";
import { parse } from "./qm/qmreader";
import * as fs from "fs";

import { load, getQm } from "./qmhash";

const RESULT_FIELD = 'result';

let isProcessing = [];
let ctxs = [];

export async function execCommands(bot, service: number): Promise<boolean> {
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

export async function execMessage(bot, msg, user, service) {
    let reply_id = null;
    if (msg.reply_to_message) {
        reply_id = await getParentMessage(msg.reply_to_message.message_id);
    }
    const parent_id = await saveMessage(msg.message_id, user, service, msg.from.language_code, msg.text, reply_id);
    const admin = await isAdmin(user);
    if (admin) {
        const ids = await getChatsByLang(service, msg.from.language_code);
        for (let j = 0; j < ids.length; j++) {
            const m = await bot.sendMessage(ids[j], msg.text, (reply_id === null) ? undefined : { reply_to_message_id: reply_id});
//          console.log(m);
            await saveClientMessage(parent_id, m.message_id);
        }
    } else {
        const ids = await getAdminChats();
        for (let j = 0; j < ids.length; j++) {
            const m = await bot.sendMessage(ids[j], msg.text, (reply_id === null) ? undefined : { reply_to_message_id: reply_id});
//          console.log(m);
            await saveClientMessage(parent_id, m.message_id);
        }
    }
}

export async function execCommand(bot, user, service, cmd, r, f): Promise<boolean> {
    const commands = await getCommands(user, service);
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
//  console.log(menu);
    if (menu.length > 0) {
        bot.setMyCommands(menu);
    }
    if (c !== null) {
        const params = await getCommandParams(c);
        const ctx = await addCommand(user, service, c);
        for (let j = 0; j < params.length; j++) {
            let v = params[j].value;
            if (r[params[j].rn + 1]) {
                v = r[params[j].rn + 1];
            }
            if (v) {
                await setParamValue(ctx, params[j].id, v);
            }
        }
        await f(bot, service);
        return true;
    }
    return false;
}

export async function execInputWaiting(bot, user, service, msg) {
    const waiting = await getParamWaiting(user, service);
    if (waiting !== null) {
        if (waiting.hide !== null) {
            await bot.deleteMessage(msg.chat.id, waiting.hide);
        }
        await setWaitingParam(waiting.ctx, msg.text);
        await setNextAction(waiting.ctx);
        return;
    }
}

export async function execMenuWaiting(bot, service, msg) {
    const waiting = await getWaiting(msg.from.id, service, msg.data);
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
}

export async function uploadFile(bot, doc) {
    const f = doc.document.file_name.match(/\.qmm?$/);
    if (f) {
        const name = await bot.downloadFile(doc.document.file_id, __dirname + '/../upload/');
        const r = name.match(/([^\/\\]+)$/);
        if (r) {
//          console.log(__dirname + '/../upload/' + r[1]);
            const data = fs.readFileSync(__dirname + '/../upload/' + r[1]);
            try {
                const qm = parse(data);
                await bot.sendMessage(doc.chat.id, 'Сценарий [' + r[1] + '] загружен');
//              console.log(qm);
                // TODO: 

            } catch (error) {
                console.error(error);
                fs.unlinkSync(name);
            }
        } else {
            fs.unlinkSync(name);
        }
    }
}

export async function execCalc(bot, msg, r) {
    let params = [];
    for (let i = 3; i < r.length; i++) {
        params.push(r[i]);
    }
    const x = calculate(r[2], params, randomFromMathRandom);
//  console.log(x);
    await bot.sendMessage(msg.chat.id, x);
}

async function questMenu(bot, qm, loc, chatId): Promise<number> {
    let menu = [];
    for (let i = 0; i < qm.jumps.length; i++) {
//       console.log(QM.jumps[i]);
         if (qm.jumps[i].fromLocationId == qm.locations[loc].id) {
             menu.push([{
                text: qm.jumps[i].text ? qm.jumps[i].text : '...',
                callback_data: qm.jumps[i].id
            }]);
        }
    }
    let r = null;
    if (menu.length > 0) {
        r = await bot.sendMessage(chatId, qm.locations[loc].texts[0], {
            reply_markup: {
              inline_keyboard: menu
            }
        });
    } else {
        await bot.sendMessage(chatId, qm.locations[loc].texts[0]);
    }
    return r;
}

export async function execLoad(bot, name, chatId, id) {
    const ctx = load(name);
    if (ctx) {
        ctxs[id] = ctx;
        const qm = getQm(ctx);
//      console.log(QM.locations[ctx.loc]);
        ctxs[id].message = await questMenu(bot, qm, ctx.loc, chatId);
    }
}

export async function execJump(bot, chatId, id, msg): Promise<boolean> {
    if (ctxs[id] && ctxs[id].message) {
        await bot.deleteMessage(chatId, ctxs[id].message.message_id);
        await bot.sendMessage(chatId, msg.message.text);
        ctxs[msg.from.id].message = null;
        const qm = getQm(ctxs[msg.from.id]);
        if (qm) {
            let to = null;
            for (let i = 0; i < qm.jumps.length; i++) {
                if (qm.jumps[i].id == msg.data) to = qm.jumps[i].toLocationId;
            }
            if (to !== null) {
                for (let i = 0; i < qm.locations.length; i++) {
                    if (qm.locations[i].id == to) {
                        ctxs[msg.from.id].loc = i;
//                      console.log(QM.locations[i]);
                        ctxs[msg.from.id].message = await questMenu(bot, qm, i, chatId);
                        return true;
                    }
                }
            }
        }
    }
    return false;
}