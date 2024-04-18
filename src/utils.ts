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
                if (ctxs[id].params[i].max < value) return;
                ctxs[id].params[i].value = +value;
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
    } else {
        if (qm.locations[loc].texts.length == 0) return '...';
        if (qm.locations[loc].texts.length > 1) {
            if (ctx.locs[loc]) {
                ctx.locs[loc]++;
                if (ctx.locs[loc] >= qm.locations[loc].texts.length) {
                    ctx.locs[loc] = 0;
                }
            } else {
                ctx.locs[loc] = 0;
            }
            ix = ctx.locs[loc];
        }
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
        if (!calculate(jump.formulaToPass, p, randomFromMathRandom)) return true;
    }
    if (jump.jumpingCountLimit > 0) {
        const c = ctx.jumps[jump.id];
        if (c) {
            if (c >= jump.jumpingCountLimit) return true;
        }
    }
    return false;
}

async function checkCritValue(bot, chatId, qm, ctx, ix, value): Promise<boolean> {
    if (qm.params[ix].critValueString) {
        const r = qm.params[ix].critValueString.match(/^Сообщение/);
        if (r) return false;
        if ((qm.params[ix].critType == 0) && (ctx.params[ix].max == value)) {
            const text = fixText(prepareText(qm.params[ix].critValueString, qm, ctx));
            await bot.sendMessage(chatId, text, {
                parse_mode: "HTML"
            });
            return true;
        }
        if ((qm.params[ix].critType == 1) && (ctx.params[ix].min == value)) {
            const text = fixText(prepareText(qm.params[ix].critValueString, qm, ctx));
            await bot.sendMessage(chatId, text, {
                parse_mode: "HTML"
            });
            return true;
        }
    }
    return false;
}

async function paramChanges(bot, chatId, qm, changes, ctx): Promise<boolean> {
    let p = [];
    for (let i = 0; i < ctx.params.length; i++) {
        p.push(ctx.params[i].value);
    }
    for (let i = 0; i < changes.length ; i++) {
        if (i >= ctx.params.length) break;
        if (changes[i].showingType) {
            if (changes[i].showingType == 1) {
                ctx.params[i].hidden = false;
            }
            if (changes[i].showingType == 2) {
                ctx.params[i].hidden = true;
            }
        }
        if (changes[i].isChangeFormula && changes[i].changingFormula) {
            ctx.params[i].value = calculate(changes[i].changingFormula, p, randomFromMathRandom);
            if (await checkCritValue(bot, chatId, qm, ctx, i, ctx.params[i].value)) return true;
            continue;
        }
        if (changes[i].isChangeValue) {
            ctx.params[i].value = +changes[i].change;
            if (await checkCritValue(bot, chatId, qm, ctx, i, ctx.params[i].value)) return true;
            continue;
        }
        if (changes[i].isChangePercentage && (ctx.params[i].value != 0)) {
            ctx.params[i].value += ((+ctx.params[i].value * +changes[i].change) / 100) | 0;
            if (await checkCritValue(bot, chatId, qm, ctx, i, ctx.params[i].value)) return true;
            continue;
        }
        if (changes[i].change != 0) {
            ctx.params[i].value = (+ctx.params[i].value) + (+changes[i].change);
            if (await checkCritValue(bot, chatId, qm, ctx, i, ctx.params[i].value)) return true;
            continue;
        }
    }
    return false;
}

function prepareText(text, qm, ctx) {
    if (text) {
        text = replaceStrings(text, qm, ctx);
        text = calculateParams(text, ctx.params);
    } else {
        text = '...';
    }
    return text;
}

function getParamBox(qm, ctx: QmContext): string {
    let r = '';
    for (let i = 0; i < ctx.params.length; i++) {
        const v = ctx.params[i].value;
        if (ctx.params[i].hidden) continue;
        for (let j = 0; j < qm.params[i].showingInfo.length; j++) {
            if (v < qm.params[i].showingInfo[j].from) continue;
            if (v > qm.params[i].showingInfo[j].to) continue;
            r = r + qm.params[i].showingInfo[j].str.replace('<>', v) + "\n";
            break;
        }
    }
    if (r != '') {
        r = prepareText(r, qm, ctx);
        const s = fixText(r);
        if (s != r) {
            r = s + '\n';
        } else {
            r = "<i>" + r + "</i>\n";
        }
    }
    return r;
}

function getMenu(qm, loc, ctx, menu) {
    let jumps = []; let mx = null; let mn = null;
    let isEmpty = true;
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
             if (t != '...') isEmpty = false;
        }
    }
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
    return isEmpty;
}

async function questMenu(bot, qm, loc, chatId, ctx: QmContext): Promise<number> {
    let isCritical = await paramChanges(bot, chatId, qm, qm.locations[loc].paramsChanges, ctx);
    let menu = [];
    let isEmpty = getMenu(qm, loc, ctx, menu);
    let text = getText(qm, loc, ctx);
    text = prepareText(text, qm, ctx);
    const prefix = getParamBox(qm, ctx);
    if ((text == '...') && (prefix != '')) {
        ctx.fixed = prefix;
    } else {
        ctx.fixed = prefix + fixText(text);
    }
    while (isEmpty && (text == '...')) {
        let ix = 0;
        if (menu.length > 1) {
            ix = calculate('[0..' + (menu.length - 1) + ']', [], randomFromMathRandom);
        }
        let to = null;
        for (let i = 0; i < qm.jumps.length; i++) {
            if (qm.jumps[i].id != menu[ix][0].callback_data) continue;
            to = qm.jumps[i].toLocationId;
            if (await paramChanges(bot, chatId, qm, qm.jumps[i].paramsChanges, ctx)) isCritical = true;
            break;
        }
        menu = []; loc = null;
        if (to === null) break;
        for (let i = 0; i < qm.locations.length; i++) {
            if (qm.locations[i].id != to) continue;
            loc = i;
            ctx.loc = loc;
            break;
        }
        if (loc === null) break;
        if (await paramChanges(bot, chatId, qm, qm.locations[loc].paramsChanges, ctx)) isCritical = true;
        isEmpty = getMenu(qm, loc, ctx, menu);
        text = getText(qm, loc, ctx);
        text = prepareText(text, qm, ctx);
        const prefix = getParamBox(qm, ctx);
        if ((text == '...') && (prefix != '')) {
            ctx.fixed = prefix;
        } else {
            ctx.fixed = prefix + fixText(text);
        }
        if (menu.length == 0) break;
    }
    if (logLevel & 4) {
        console.log(text);
    }
    let r = null;
    if (isCritical) return r;
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
        for (let i = 0; i < qm.params.length; i++) {
             const r = qm.params[i].starting.match(/\[(\d+)\]/);
             let v = 0;
             if (r) {
                 v = +r[1];
             }
             const p: QmParam = new QmParam(qm.params[i].name, +qm.params[i].min, +qm.params[i].max, v);
             ctxs[id].params.push(p);
        }
        ctxs[id].message = await questMenu(bot, qm, ctx.loc, chatId, ctxs[id]);
    }
}

export async function execJump(bot, chatId, id, msg): Promise<boolean> {
    if (ctxs[id] && ctxs[id].message) {
        await bot.deleteMessage(chatId, ctxs[id].message.message_id);
        ctxs[id].message = null;
        const qm = getQm(ctxs[id]);
        if (qm) {
            if (!qm.locations[ctxs[id].loc].isEmpty) {
                await bot.sendMessage(chatId, ctxs[id].fixed, {
                    parse_mode: "HTML"
                });
            }
            let to = null;
            for (let i = 0; i < qm.jumps.length; i++) {
                if (qm.jumps[i].id == msg.data) {
                    to = qm.jumps[i].toLocationId;
                    if (await paramChanges(bot, chatId, qm, qm.jumps[i].paramsChanges, ctxs[id])) return true;
                    if (qm.jumps[i].jumpingCountLimit > 0) {
                        const c = ctxs[id].jumps[qm.jumps[i].id];
                        if (c) {
                            ctxs[id].jumps[qm.jumps[i].id]++;
                        } else {
                            ctxs[id].jumps[qm.jumps[i].id] = 1;
                        }
                    }
                    if (qm.jumps[i].description) {
                        const text = prepareText(qm.jumps[i].description, qm, ctxs[id]);
                        await bot.sendMessage(chatId, text);
                    }
                }
            }
            if (to !== null) {
                for (let i = 0; i < qm.locations.length; i++) {
                    if (qm.locations[i].id == to) {
                        ctxs[id].loc = i;
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

export function showParameters(id, ix) {
    if (ctxs[id]) {
        const qm = getQm(ctxs[id]);
        if (qm) {
            if (ix === undefined) {
                console.log(qm.params);
            } else {
                console.log(qm.params[ix]);
            }
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