import { db, isAdmin, getChatsByLang, saveMessage, saveClientMessage, getAdminChats, getParentMessage, getCommands, addCommand, getActions, setNextAction, getCaption, waitValue, getParamWaiting, setWaitingParam, getMenuItems, getWaiting, chooseItem, getRequest, getSpParams, getSpResults, setParamValue, getParamValue, setResultAction, getCommandParams } from "./data-source";

import { calculate } from "./qm/formula/index";
import { randomFromMathRandom } from "./qm/randomFunc";
import { parse } from "./qm/qmreader";
import * as fs from "fs";

import { load, getQm, QmParam, QmContext } from "./qmhash";

const RESULT_FIELD = 'result';

let isProcessing = [];
let ctxs = [];
export let logLevel = 0;

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
                if (logLevel & 2) {
                    console.log(message);
                }
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
                let v = await getParamValue(actions[i].ctx, caption.param);
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
                        if (logLevel & 2) {
                            console.log(message);
                        }
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
                    if (logLevel & 2) {
                        console.log(message);
                    }
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
            if (logLevel & 2) {
                console.log(m);
            }
            await saveClientMessage(parent_id, m.message_id);
        }
    } else {
        const ids = await getAdminChats();
        for (let j = 0; j < ids.length; j++) {
            const m = await bot.sendMessage(ids[j], msg.text, (reply_id === null) ? undefined : { reply_to_message_id: reply_id});
            if (logLevel & 2) {
                console.log(m);
            }
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

export function setLog(v) {
    logLevel = v;
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

export function execSet(id, name, value) {
    if (ctxs[id]) {
        if (name == 'Money') {
            ctxs[id].money = value;
            return;
        }
        if (name == 'Ranger') {
            ctxs[id].username = value;
            return;
        }
        for (let i = 0; i < ctxs[id].params.length; i++) {
            if (name == 'p' + (i + 1)) {
                if (ctxs[id].params[i].min > value) return;
                if (ctxs[id].params[i].max > value) return;
                ctxs[id].params[i].value = value;
                return;
            }
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

function calculateParams(text, params: QmParam[]): string {
    let r = text.match(/{([^}]+)}/);
    let p = null;
    while (r) {
        const f = r[1];
        if (p === null) {
            p = [];
            for (let i = 0; i < params.length; i++) {
                p.push(params[i].value);
            }
        }
        const x = calculate(f, p, randomFromMathRandom);
        text = text.replace(r[0], x);
        r = text.match(/{([^}]+)}/);
    }
    return text;
}

function fixText(text): string {
    let s = text.replaceAll('<clr>', '<b>');
    s = s.replaceAll('<clrEnd>', '</b>');
    s = s.replaceAll('<fix>', '<code>');
    return s.replaceAll('</fix>', '</code>');
}

function replaceStrings(text, qm, ctx): string {
    const date = ctx.date.toISOString();
    const r = date.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (r) {
        text = text.replaceAll('<Date>', '<b>' + r[3] + '-' + r[2] + '-' + r[1] + '</b>');
        text = text.replaceAll('<Day>', '<b>' + r[3] + '-' + r[2] + '-' + r[1] + '</b>');
    }
    text = text.replaceAll('<ToStar>', '<b>' + qm.strings.ToStar + '</b>');
    text = text.replaceAll('<Parsec>', '<b>' + qm.strings.Parsec + '</b>');
    text = text.replaceAll('<Artefact>', '<b>' + qm.strings.Artefact + '</b>');
    text = text.replaceAll('<ToPlanet>', '<b>' + qm.strings.ToPlanet + '</b>');
    text = text.replaceAll('<FromPlanet>', '<b>' + qm.strings.FromPlanet + '</b>');
    text = text.replaceAll('<FromStar>', '<b>' + qm.strings.FromStar + '</b>');
    text = text.replaceAll('<Ranger>', '<b>' + ctx.username + '</b>');
    text = text.replaceAll('<Money>', '<b>' + ctx.money + '</b>');
    return text;
}

function getText(qm, loc, ctx): string {
    let ix = 0;
    if (qm.locations[loc].isTextByFormula) {
        let p = [];
        for (let i = 0; i < ctx.params.length; i++) {
            p.push(ctx.params[i].value);
        }
        ix = calculate(qm.locations[loc].textSelectFormula, p, randomFromMathRandom) - 1;
    }
    return qm.locations[loc].texts[ix];
}

function jumpRestricted(jump, ctx): boolean {
    for (let i = 0; i < ctx.params.length; i++) {
        if (jump.paramsConditions[i].mustFrom > ctx.params[i].value) return true;
        if (jump.paramsConditions[i].mustTo < ctx.params[i].value) return true;
        // TODO: mustEqualValues, mustModValues
    }
    if (jump.formulaToPass) {
        let p = [];
        for (let i = 0; i < ctx.params.length; i++) {
            p.push(ctx.params[i].value);
        }
        if (!calculate(jump.formulaToPass, p, randomFromMathRandom)) return true;;
    }
    // TODO:
/*  if (jump.jumpingCountLimit > 0) {
        const c = ctx.jumps[jump.id];
        if (c) {
            if (c >= jump.jumpingCountLimit) return true;
            ctx.jumps[jump.id]++;
        } else {
            ctx.jumps[jump.id] = 1;
        }
    }*/
    return false;
}

function paramChanges(changes, ctx) {
    let p = [];
    for (let i = 0; i < ctx.params.length; i++) {
        p.push(ctx.params[i].value);
    }
    for (let i = 0; i < changes.length ; i++) {
        if (i >= ctx.params.length) break;
        // TODO: isChangePercentage
        if (changes[i].isChangeValue) {
            ctx.params[i].value = changes[i].change;
            continue;
        }
        if (changes[i].isChangeFormula && changes[i].changingFormula) {
            ctx.params[i].value = calculate(changes[i].changingFormula, p, randomFromMathRandom);
            continue;
        }
        if (changes[i].change != 0) {
            ctx.params[i].value += changes.change;
            continue;
        }
    }
}

async function questMenu(bot, qm, loc, chatId, ctx: QmContext): Promise<number> {
    paramChanges(qm.locations[loc].paramsChanges, ctx);
    let jumps = []; let mx = null; let mn = null;
    for (let i = 0; i < qm.jumps.length; i++) {
         if (qm.jumps[i].fromLocationId == qm.locations[loc].id) {
             if (jumpRestricted(qm.jumps[i], ctx)) continue;
             let t = calculateParams(qm.jumps[i].text ? qm.jumps[i].text : '...', ctx.params);
             jumps.push({
                text: t,
                id: qm.jumps[i].id,
                order: qm.jumps[i].showingOrder
             });
             if ((mn === null) || (mn > qm.jumps[i].showingOrder)) mn = qm.jumps[i].showingOrder;
             if ((mx === null) || (mx < qm.jumps[i].showingOrder)) mx = qm.jumps[i].showingOrder;
        }
    }
    let menu = [];
    if ((mn !== null) && (mx !== null)) {
        for (let r = mn; r <= mx; r++) {
            for (let j = 0; j < jumps.length; j++) {
                 if (jumps[j].order == r) {
                    menu.push([{
                        text: jumps[j].text,
                        callback_data: jumps[j].id
                    }]);
                 }
            }
        }
    }
    let r = null;
    let text = getText(qm, loc, ctx);
    if (text) {
        text = replaceStrings(text, qm, ctx);
        text = calculateParams(text, ctx.params);
    } else {
        text = '...';
    }
    ctx.fixed = fixText(text);
    if (logLevel & 4) {
        console.log(text);
    }
    if (menu.length > 0) {
        r = await bot.sendMessage(chatId, ctx.fixed, {
            reply_markup: {
              inline_keyboard: menu
            },
            parse_mode: "HTML"
        });
        if (logLevel & 2) {
            console.log(r);
        }
    } else {
        await bot.sendMessage(chatId, ctx.fixed, {
            parse_mode: "HTML"
        });
    }
    return r;
}

export async function execLoad(bot, name, chatId, id, username) {
    const ctx = load(name, username);
    if (ctx) {
        ctxs[id] = ctx;
        const qm = getQm(ctx);
//      console.log(QM.locations[ctx.loc]);
        for (let i = 0; i < qm.params.length; i++) {
             if (qm.params[i].starting == '[') break;
             const r = qm.params[i].starting.match(/\[(\d+)\]/);
             if (!r) break;
             const p: QmParam = new QmParam(qm.params[i].name, qm.params[i].min, qm.params[i].max, r[1]);
//           console.log(p);
             ctxs[id].params.push(p);
        }
        ctxs[id].message = await questMenu(bot, qm, ctx.loc, chatId, ctxs[id]);
    }
}

export async function execJump(bot, chatId, id, msg): Promise<boolean> {
    if (ctxs[id] && ctxs[id].message) {
        await bot.deleteMessage(chatId, ctxs[id].message.message_id);
        await bot.sendMessage(chatId, ctxs[id].fixed, {
            parse_mode: "HTML"
        });
        ctxs[id].message = null;
        const qm = getQm(ctxs[id]);
        if (qm) {
            let to = null;
            for (let i = 0; i < qm.jumps.length; i++) {
                if (qm.jumps[i].id == msg.data) {
                    to = qm.jumps[i].toLocationId;
                    paramChanges(qm.jumps[i].paramsChanges, ctxs[id]);
                }
            }
            if (to !== null) {
                for (let i = 0; i < qm.locations.length; i++) {
                    if (qm.locations[i].id == to) {
                        ctxs[id].loc = i;
//                      console.log(QM.locations[i]);
                        ctxs[id].message = await questMenu(bot, qm, i, chatId, ctxs[id]);
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

export function showJumps(id, order) {
    if (ctxs[id]) {
        const qm = getQm(ctxs[id]);
        if (qm) {
            for (let i = 0; i < qm.jumps.length; i++) {
                if (qm.jumps[i].fromLocationId != qm.locations[ctxs[id].loc].id) continue;
                if (order) {
                    if (qm.jumps[i].showingOrder != order) continue;
                }
                console.log(qm.jumps[i]);
            }
        }
    }
}

export function showParams(id) {
    if (ctxs[id]) {
        for (let i = 0; i < ctxs[id].params.length; i++) {
            console.log(ctxs[id].params[i]);
        }
    }
}

export function showLocation(id) {
    if (ctxs[id]) {
        const qm = getQm(ctxs[id]);
        if (qm) {
            console.log(qm.locations[ctxs[id].loc]);
        }
    }
}
