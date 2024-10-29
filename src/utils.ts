import { db, isAdmin, getChatsByLang, saveMessage, saveClientMessage, getAdminChats, getParentMessage, getCommands, addCommand, getActions, setNextAction, getCaption, waitValue, getParamWaiting, setWaitingParam, getMenuItems, getWaiting, chooseItem, getRequest, getSpParams, getSpResults, setParamValue, getParamValue, setResultAction, getCommandParams, startCommand, setFirstAction, getScript, getUserByCtx, getFixups, createQuestContext, setGlobalValue, closeContext, winQuest, deathQuest, uploadScript, uploadImage, questText, getScheduledComands, getInfoMessages, acceptInfo, getQuestText, failQuest, getQuestContexts, getUserByUid, getScore, getCredits, joinToSession, getImageFileName, getSessionUsers, isCompletedSession, addSessionParams, getSessionParams, getUserLang, decorateMessage, Message } from "./data-source";
import axios from 'axios';

import { Location, ParamType, QM, parse } from "./qm/qmreader";
import * as fs from "fs";

import { load, getQm, QmParam, QmContext, addContext, getContext } from "./qmhash";
import { calc } from "./macroproc";
import { calculate } from "./qm/formula";
import { randomFromMathRandom } from "./qm/randomFunc";
import { writeQmm } from "./qm/qmwriter";
import { saveCtx } from "./qm/qmsave";
import { restore } from "./qm/qmload";

const RESULT_FIELD  = 'result_code';

const JOB_INTERVAL  = 60000;
const MX_JOBCOUNTER = 10;

let minJobInterval  = JOB_INTERVAL;
let jobInterval     = JOB_INTERVAL;
let jobCounter      = 0;

let retryQueue      = [];
let isProcessing    = [];
let shedCommands    = null;

export let logLevel = 0;

class SchedCommand {
    public timestamp: Date = new Date();
    constructor(public readonly service: number, public readonly command: number, public readonly timeout: number) {}
}

class TimeSlot {
    constructor(public readonly service, public readonly userId:number, public readonly chatId:number, public readonly timestamp: Date, public readonly data: number) {}
}

let timeslots: TimeSlot[] = [];
let sessions = [];

export function getIntervalTimeout() {
    if (jobCounter > MX_JOBCOUNTER) {
        jobInterval = minJobInterval;
    }
    jobCounter++;
    return jobInterval;
}

function setIntervalTimeout(timeout: number) {
    if (timeout < 1000) return;
    if (timeout < jobInterval) {
        jobInterval = timeout;
    }
    jobCounter = 0;
}

export async function send(bot, service: number, chat: number, msg, options, callback, data) {
    if (retryQueue[service] === undefined) {
        retryQueue[service] = [];
    }
    try {
        const ix = retryQueue[service].length;
        retryQueue[service].push({
            chat:     chat,
            msg:      msg,
            options:  options,
            callback: callback,
            data:     data
        });
        const m = await bot.sendMessage(chat, msg, options);
        if (callback !== undefined) {
            await callback(data, m);
        }
        if (ix == 0) {
            retryQueue[service] = [];
        } else {
            retryQueue[service][ix] = null;
        }
        return m;
    } catch (error) {
        console.error(error);
    }
}

async function scheduleCommands(bot, service: number) {
    if (shedCommands === null) {
        shedCommands = [];
        const commands = await getScheduledComands(service);
        for (let i = 0; i < commands.length; i++) {
            const timeout = commands[i].timeout;
            if ((timeout > 1000) && (timeout < minJobInterval)) {
                minJobInterval = timeout;
            }
            shedCommands.push(new SchedCommand(service, commands[i].cmd, timeout));
        }
    }
    let f: boolean = false;
    for (let i = 0; i < shedCommands.length; i++) {
        const dt = new Date();
        if (dt.getTime() - shedCommands[i].timestamp >= shedCommands[i].timeout) {
            const ctx = await addCommand(null, service, shedCommands[i].command);
            await startCommand(ctx);
            shedCommands[i].timestamp = new Date();
            f = true;
        }
    }
    while (f) {
        f = await execCommands(bot, service);
    }
}

export async function retry(bot, service: number) {
    if (retryQueue[service] === undefined) {
        retryQueue[service] = [];
    }
    if (isProcessing[service]) return false;
    isProcessing[service] = true;
    try {
        let n = 0;
        for (let i = 0; i < retryQueue[service].length; i++) {
            if (retryQueue[service][i]) {
                const callback = retryQueue[service][i].callback;
                const data = retryQueue[service][i].data;
                const m = await bot.sendMessage(retryQueue[service][i].chat, retryQueue[service][i].msg, retryQueue[service][i].options);
                if (callback !== undefined) {
                    await callback(data, m);
                }
                retryQueue[service][i] = null;
                n++;
            }
        }
        retryQueue[service] = [];
        if (n > 0) {
            console.log('RETRIED: ' + n);
        }
        const d = new Date();
        for (let i = 0; i < timeslots.length; i++) {
            if (timeslots[i] === null) continue;
            if (timeslots[i].timestamp.getTime() >= d.getTime()) continue;
            if (timeslots[i].service != service) continue;
            const userId = timeslots[i].userId;
            const chatId = timeslots[i].chatId;
            const data   = timeslots[i].data;
            await autoJump(bot, service, userId, chatId, data);
            timeslots[i] = null;
        }
    } catch (error) {
        console.error(error);
    }
    isProcessing[service] = false;
    await scheduleCommands(bot, service);
}

export async function execCommands(bot, service: number): Promise<boolean> {
    if (isProcessing[service]) return false;
    isProcessing[service] = true;
    const actions = await getActions(service);
    for (let i = 0; i < actions.length; i++) {
        let caption; let items;
        switch (actions[i].type) {
            case 1:
                // Folder
                await setFirstAction(actions[i].ctx, actions[i].action);
                break;
            case 2:
                // Input string
                caption = await getCaption(actions[i].ctx);
                await send(bot,service, caption.chat, caption.value, undefined, async function(data, m) {
                    await waitValue(data.ctx, m.message_id, data.hide);
                    if (logLevel & 2) {
                        console.log(m);
                    }
                }, {
                    ctx:  actions[i].ctx,
                    hide: false
                });
                break;
            case 3:
                // Output string
                caption = await getCaption(actions[i].ctx);
                await send(bot, service, caption.chat, caption.value, undefined, undefined, undefined);
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
                            const r = list[j].split(/:/);
                            row.push({
                                text: r[1],
                                callback_data: r[0]
                            });
                        }
                        if (row.length > 0) {
                            menu.push(row);
                        }
                        await send(bot, service, caption.chat, caption.value, {
                            reply_markup: {
                              inline_keyboard: menu
                            }
                        }, async function (data, m) {
                            await waitValue(data.ctx, m.message_id, data.hide);
                            if (logLevel & 2) {
                                console.log(m);
                            }
                        }, {
                            ctx:  actions[i].ctx,
                            hide: true
                        });
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
                    await send(bot, service, caption.chat, caption.value, {
                        reply_markup: {
                          inline_keyboard: menu
                        }
                    }, async function (data, m) {
                        await waitValue(data.ctx, m.message_id, data.hide);
                        if (logLevel & 2) {
                            console.log(m);
                        }
                    }, {
                        ctx:  actions[i].ctx,
                        hide: true
                    });
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
                        if (params.length > 0) {
                            sql = sql + ',';
                        }
                        sql = sql + '$' + p[j].rn;
                        params.push(p[j].value);
                    }
                    sql = sql + ') as value';
                    const z = await db.manager.query(sql, params);
                    if (z && z.length > 0) {
                        const results = await getSpResults(actions[i].ctx);
                        let r = null;
                        for (let k = 0; k < results.length; k++) {
                            const v = z[0].value[results[k].name];
                            if (results[k].name == RESULT_FIELD) {
                                r = v;
                            } else if (results[k].param) {
                                await setParamValue(actions[i].ctx, results[k].param, v);
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
            case 7:
                // HTTP Request
                const rq = await getRequest(actions[i].ctx);
                if (rq !== null) {
                    const p = await getSpParams(actions[i].ctx, rq.user, rq.service);
                    let body = {};
                    for (let j = 0; j < p.length; j++) {
                        body[p[j].name] = p[j].value;
                    }
                    if (rq.type == 'POST') {
                        axios.post(rq.value, body).then(async function (response) {
                            const results = await getSpResults(actions[i].ctx);
                            let r = null;
                            for (let k = 0; k < results.length; k++) {
                                if (results[k].name == RESULT_FIELD) {
                                    r = response.status;
                                } else {
                                    if (response.data[results[k].name]) {
                                        const v = response.data[results[k].name];
                                        if (results[k].param) {
                                            await setParamValue(actions[i].ctx, results[k].param, v);
                                        }
                                    }
                                }
                            }
                            if (r !== null) {
                                await setResultAction(actions[i].ctx, r);
                            } else {
                                await setNextAction(actions[i].ctx);
                            }
                        }).catch(async function (error) {
                            console.error(error);
                            await setNextAction(actions[i].ctx);
                        });
                    }
                }
                break;
            case 8:
                // Text Quest
                const script = await getParamValue(actions[i].ctx, actions[i].param);
                if (script) {
                    const file = await getScript(script);
                    if (file) {
                        const user = await getUserByCtx(actions[i].ctx);
                        const ctx  = await load(file.filename, user.name);
                        if (ctx) {
                            ctx.user = user.id;
                            ctx.script = script;
                            ctx.money = file.bonus;
                            ctx.penalty = file.penalty;
                            await closeQuestContexts(bot, service, user.id, user.chat);
                            ctx.id = await createQuestContext(script, actions[i].ctx, ctx.loc);
                            addContext(user.uid, actions[i].service, ctx);
                            const qm = await getQm(ctx);
                            const fixups = await getFixups(script, actions[i].ctx);
                            for (let i = 0; i < fixups.length; i++) {
                                let v = fixups[i].value;
                                if (qm.params[fixups[i].num].isMoney) {
                                    const limit = await getMoneyLimit(qm);
                                    if (v > limit) {
                                        v = limit;
                                    }
                                    await setGlobalValue(ctx.user, fixups[i].id, 3, ctx.script, fixups[i].value, null);
                                }
                                await ctx.setValue(fixups[i].num, v);
                            }
                            let text = await getQuestText(+script, 1);
                            if (text) {
                                text = await prepareText(text, qm, ctx);
                                await send(bot, service, user.chat, text, {
                                    parse_mode: "HTML"
                                }, undefined, undefined);
                            }
                            ctx.message = await questMenu(bot, service, qm, ctx.loc, user.uid, user.chat, ctx);
                        }
                    }
                }
                await setNextAction(actions[i].ctx);
                break;
        }
    }
    isProcessing[service] = false;
    return actions.length > 0;
}

async function closeQuestContexts(bot, service: number, user: number, chatId: number) {
    const ctxs = await getQuestContexts(service, user);
    for (let i = 0; i < ctxs.length; i++) {
        if (ctxs[i].hide) {
            try {
                await bot.deleteMessage(chatId, ctxs[i].hide);
            } catch (error) {
                console.error(error);
            }
        }
        await closeContext(ctxs[i].id);
    }
}

async function getMoneyLimit(qm: QM): Promise<number> {
    for (let i = 0; i < qm.params.length; i++) {
        if (qm.params[i].isMoney) {
            if (qm.params[i].starting != '[') {
                return await calc(qm.params[i].starting, []);
            } else {
                return qm.params[i].max;
            }
        }
    }
    return null;
}

async function endQuest(bot, service: number, chatId: number, ctx: QmContext, qm: QM, crit: ParamType): Promise<void> {
    if (ctx.id) {
       const fixups = await getFixups(ctx.script, ctx.id);
       for (let i = 0; i < fixups.length; i++) {
            const value = ctx.getValue(fixups[i].num);
            let limit = null;
            if (qm.params[fixups[i].num].isMoney) {
                limit = await getMoneyLimit(qm);
            }
            if (value !== null) {
                await setGlobalValue(ctx.user, fixups[i].id, 3, ctx.script, value, limit);
            }
       }
       if (qm.locations[ctx.loc].isSuccess || (crit == 2)) {
           if (ctx.script) {
               let text = await getQuestText(+ctx.script, 2);
               if (text) {
                   text = await prepareText(text, qm, ctx);
                   await send(bot, service, chatId, text, {
                    parse_mode: "HTML"
                   }, undefined, undefined);
               }
           }
           await winQuest(ctx.user, ctx.script);
       }
       if (qm.locations[ctx.loc].isFaily || (crit == 1)) {
           await failQuest(ctx.user, ctx.script);
       }
       if (qm.locations[ctx.loc].isFailyDeadly || (crit == 3)) {
           await deathQuest(ctx.user, ctx.script);
       }
       await closeContext(ctx.id);
    }
}

export async function execMessage(bot, msg, user, service) {
    let reply_msg: Message = null;
    if (msg.reply_to_message) {
        reply_msg = await getParentMessage(msg.reply_to_message.message_id);
    }
    const parent_id = await saveMessage(msg.message_id, user, service, msg.from.language_code, msg.text, (reply_msg === null) ? null : reply_msg.id);
    if (reply_msg !== null) {
        await send(bot, service, reply_msg.chat_id, msg.text, { reply_to_message_id: reply_msg.id }, async function (data, m) {
            await saveClientMessage(data.parent, m.message_id);
            if (logLevel & 2) {
                console.log(m);
            }
        }, {
            parent: parent_id
        });
        return;
    }
    const text = await decorateMessage(user, msg.text);
    const admin = await isAdmin(user);
    if (admin) {
        const ids = await getChatsByLang(service, msg.from.language_code);
        for (let j = 0; j < ids.length; j++) {
            await send(bot, service, ids[j], msg.text, undefined, async function (data, m) {
                await saveClientMessage(data.parent, m.message_id);
                if (logLevel & 2) {
                    console.log(m);
                }
            }, {
                parent: parent_id
            });
        }
    } else {
        const ids = await getAdminChats();
        for (let j = 0; j < ids.length; j++) {
             await send(bot, service, ids[j], text, undefined, async function (data, m) {
                await saveClientMessage(data.parent, m.message_id);
                if (logLevel & 2) {
                    console.log(m);
                }
            }, {
                parent: parent_id
            });
        }
    }
}

export async function setMenu(bot, user, service): Promise<void> {
    const commands = await getCommands(user, service);
    let menu = [];
    for (let i = 0; i < commands.length; i++) {
        if (commands[i].visible) {
            menu.push({
                command: commands[i].name,
                description: commands[i].description
            });
        }
    }
    if (menu.length > 0) {
        bot.setMyCommands(menu);
    }
}

export async function execCommand(bot, user, service, cmd, r, f): Promise<boolean> {
    const commands = await getCommands(user, service);
    let c: number = null;
    for (let i = 0; i < commands.length; i++) {
        if (commands[i].name == cmd) {
            c = commands[i].id;
        }
    }
    if (c !== null) {
        const params = await getCommandParams(c);
        const ctx = await addCommand(user, service, c);
        for (let j = 0; j < params.length; j++) {
            let v = params[j].value;
            if (r[params[j].rn + 1]) {
                v = r[params[j].rn + 1];
            }
            if (j == params.length - 1) {
                for (let i = params[j].rn + 2; i < r.length; i++) {
                    if (r[i] === undefined) break;
                    v = v + ' ' + r[i];
                }
            }
            if (v) {
                await setParamValue(ctx, params[j].id, v);
            }
        }
        await startCommand(ctx);
        await f(bot, service);
        return true;
    }
    return false;
}

export async function execInputWaiting(bot, user, service, msg) {
    const waiting = await getParamWaiting(user, service);
    if (waiting !== null) {
        if (waiting.hide !== null) {
            try { 
                await bot.deleteMessage(msg.chat.id, waiting.hide);
            } catch (error) {
                console.error(error);
            }
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
        if (waiting.param) {
            await setWaitingParam(waiting.ctx, msg.data);
            await setNextAction(waiting.ctx);
        } else {
            await chooseItem(waiting.ctx, msg.data);
        }
        await execCommands(bot, service);
        return true;
    }
    return false;
}

export function setLog(v) {
    logLevel = v;
}

export async function uploadFile(bot, uid: number, service: number, doc) {
    if (doc.document.file_name.match(/\.log?$/i)) {
        const name = await bot.downloadFile(doc.document.file_id, __dirname + '/../upload/');
        const r = name.match(/([^.\/\\]+)(\.log?)$/i);
        if (r) {
            try {
                console.log(doc);
                const ctx: QmContext = await getContext(uid, service);
                if (ctx) {
                    const qm = await getQm(ctx);
                    if (qm) {
                        const data = fs.readFileSync(__dirname + '/../upload/' + r[1] + r[2]).toString().split("\n");
                        for (let i = 0; i < data.length; i++) {
                            const l = data[i].match(/Location:\s*(\d+)/);
                            if (l) {
                                for (let j = 0; j < qm.locations.length; j++) {
                                    if (qm.locations[j].id == +l[1]) {
                                        await ctx.setLoc(j, qm);
                                        break;
                                    }
                                }
                            }
                            const p = data[i].match(/Param\s*(\d+)\D+(\d+)/);
                            if (p) {
                                await ctx.setValue(+p[1] - 1, +p[2]);
                            }
                            const v = data[i].match(/Param\s*(\d+)\s*([+-])/);
                            if (v) {
                                await ctx.setHidden(+v[1] - 1, v[2] == '-');
                            }
                        }
                        ctx.message = await questMenu(bot, service, qm, ctx.loc, uid, doc.chat.id, ctx);
                    }
                }
                } catch (error) {
                console.error(error);
            }
        }
        fs.unlinkSync(name);
    }
    if (doc.document.file_name.match(/\.qms?$/i)) {
        const name = await bot.downloadFile(doc.document.file_id, __dirname + '/../upload/');
        const r = name.match(/([^.\/\\]+)(\.qms?)$/i);
        if (r) {
            const data = fs.readFileSync(__dirname + '/../upload/' + r[1] + r[2]);
            try {
                const save = restore(data);
                const ctx = await load(save.name, doc.from.first_name ? doc.from.first_name : doc.from.username);
                if (ctx) {
                    const user = await getUserByUid(uid);
                    await closeQuestContexts(bot, service, user.id, doc.chat.id);
                    for (let i = 0; i < save.params.length; i++) {
                        ctx.params[i].value  = save.params[i].value;
                        ctx.params[i].hidden = save.params[i].hidden;
                    }
                    ctx.loc = save.loc;
                    addContext(uid, service, ctx);
                    const qm = await getQm(ctx);
                    ctx.message = await questMenu(bot, service, qm, ctx.loc, uid, doc.chat.id, ctx);
                }
            } catch (error) {
                console.error(error);
            }
        }
        fs.unlinkSync(name);
    }
    if (doc.document.file_name.match(/\.qmm?$/i)) {
        const name = await bot.downloadFile(doc.document.file_id, __dirname + '/../upload/');
        const r = name.match(/([^.\/\\]+)(\.qmm?)$/i);
        if (r) {
            const data = fs.readFileSync(__dirname + '/../upload/' + r[1] + r[2]);
            try {
                const qm = parse(data);
                let moneyParam = null;
                for (let i = 0; i < qm.params.length; i++) {
                     if (qm.params[i].isMoney) {
                         moneyParam = i;
                         break;
                     }
                }
                const id = await uploadScript(uid, service, r[1], r[1] + r[2], moneyParam);
                if (qm.taskText) {
                    const text = await replaceStrings(qm.taskText, qm, undefined, true);
                    await questText(id, 1, text);
                }
                if (qm.successText) {
                    const text = await replaceStrings(qm.successText, qm, undefined, true);
                    await questText(id, 1, text);
                }
                await send(bot, service, doc.chat.id, 'Сценарий [' + r[1] + r[2] + '] загружен', undefined, undefined, undefined);
            } catch (error) {
                console.error(error);
                fs.unlinkSync(name);
            }
        } else {
            fs.unlinkSync(name);
        }
    }
    if (doc.document.file_name.match(/\.(png|gif)$/i)) {
        const name = await bot.downloadFile(doc.document.file_id, __dirname + '/../upload/');
        const r = name.match(/([^\/\\]+)$/);
        if (r) {
            await uploadImage(uid, service, doc.document.file_name, r[1]);
            await send(bot, service, doc.chat.id, 'Рисунок [' + r[1] + '] загружен', undefined, undefined, undefined);
        } else {
            fs.unlinkSync(name);
        }
    }
}

function checkExists(name: string): boolean {
    try {
        fs.accessSync(name, fs.constants.R_OK);
        return true;
    } catch {
        return false;
    }
}

async function sendImg(bot, uid, chat, name): Promise<void> {
    try {
        const filename = await getImageFileName(uid, name);
        if (!checkExists(__dirname + '/../upload/' + filename)) return;
        await bot.sendPhoto(chat, __dirname + '/../upload/' + filename);
    } catch (error) {
        console.error(error);
    }
}

export async function execSet(id, service, name, value) {
    const ctx: QmContext = await getContext(id, service);
    if (ctx) {
        if (name == 'Money') {
            ctx.money = value;
            return;
        }
        if (name == 'Ranger') {
            ctx.username = value;
            return;
        }
        for (let i = 0; i < ctx.params.length; i++) {
            if (name == 'p' + (i + 1)) {
                if (ctx.params[i].min > value) return;
                if (ctx.params[i].max < value) return;
                ctx.params[i].value = +value;
                return;
            }
        }
    }
}

export async function execCalc(bot, msg, service, r) {
    let params = [];
    let cmd = r[2];
    for (let i = 3; i < r.length; i++) {
        if (r[i] === undefined) break;
        cmd = cmd + ' ' + r[i];
    }
    const ctx: QmContext = await getContext(msg.from.id, service);
    if (ctx) {
        for (let i = 0; i < ctx.params.length; i++) {
            params.push(ctx.params[i].value);
        }
    }
    const x = await calc(cmd, params);
    await send(bot, service, msg.chat.id, x, undefined, undefined, undefined);
}

async function calculateParams(text, params: QmParam[], qm): Promise<string> {
    let r = text.match(/\[d(\d+)\]/);
    while (r) { 
        const ix = r[1];
        let x = '';
        if (ix <= params.length) {
            const v = +params[ix - 1].value;
            for (let j = 0; j < qm.params[ix - 1].showingInfo.length; j++) {
                if (v < qm.params[ix - 1].showingInfo[j].from) continue;
                if (v > qm.params[ix - 1].showingInfo[j].to) continue;
                x = qm.params[ix - 1].showingInfo[j].str.replaceAll('<>', v);
                break;
            }
        }
        text = text.replace(r[0], x);
        r = text.match(/\[d(\d+)\]/);
    }
    r = text.match(/{([^}]+)}/);
    let p = null;
    while (r) {
        const f = r[1];
        if (p === null) {
            p = [];
            for (let i = 0; i < params.length; i++) {
                p.push(params[i].value);
            }
        }
        const x = await calc(f, p);
        text = text.replace(r[0], x);
        r = text.match(/{([^}]+)}/);
    }
    r = text.match(/\[p(\d+)\]/);
    while (r) {
        const ix = r[1];
        if (ix <= params.length) {
            text = text.replace(r[0], params[ix - 1].value);
        } else {
            text = text.replace(r[0], '');
        }
        r = text.match(/\[p(\d+)\]/);
    }
    return text;
}

function repeat(s: string, n: number): string {
    let r = '';
    for (let i = 0; i < n; i++) {
        r = r + s;
    }
    return r;
}

function fixText(text): string {
    let s = text.replaceAll('<clr>', '<b>');
    s = s.replaceAll('<clrEnd>', '</b>');
    s = s.replaceAll('<br>', '\n');
    s = s.replaceAll('</format>', '');
    let r = s.match(/<format=left,(\d+)>/);
    while (r) {
        const ix = r.index;
        let len = 0; let esc = false;
        for (let i = ix - 1; i >= 0; i--) {
            if (s[i] == '>') {
                esc = true;
                continue;
            }
            if (s[i] == '<') {
                esc = false;
                continue;
            }
            if (s[i] == '\n') break;
            if (esc) continue;
            len++;
        }
        s = s.replace('<format=left,' + r[1] + '>', '' + repeat(' ', r[1] - len));
        r = s.match(/<format=left,(\d+)>/);
    }
    s = s.replaceAll('<format>', '');
    s = s.replaceAll('</format>', '');
    s = s.replaceAll('<fix>', '<code>');
    return s.replaceAll('</fix>', '</code>');
}

function noTag(text): string {
    let s = text.replaceAll('<clr>', '');
    s = s.replaceAll('<clrEnd>', '');
    s = s.replaceAll('<b>', '');
    s = s.replaceAll('</b>', '');
    s = s.replaceAll('<fix>', '');
    return s.replaceAll('</fix>', '');
}

async function replaceStrings(text, qm, ctx, noRanger: boolean): Promise<string> {
    text = text.replaceAll('<ToStar>', '<b>' + qm.strings.ToStar + '</b>');
    text = text.replaceAll('<Parsec>', '<b>' + qm.strings.Parsec + '</b>');
    text = text.replaceAll('<Artefact>', '<b>' + qm.strings.Artefact + '</b>');
    text = text.replaceAll('<ToPlanet>', '<b>' + qm.strings.ToPlanet + '</b>');
    text = text.replaceAll('<FromPlanet>', '<b>' + qm.strings.FromPlanet + '</b>');
    text = text.replaceAll('<FromStar>', '<b>' + qm.strings.FromStar + '</b>');
    if (!noRanger) {
        const date = ctx.date.toISOString();
        const r = date.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (r) {
            text = text.replaceAll('<Date>', '<b>' + r[3] + '-' + r[2] + '-' + r[1] + '</b>');
            text = text.replaceAll('<CurDate>', '<b>' + r[3] + '-' + r[2] + '-' + r[1] + '</b>');
            text = text.replaceAll('<Day>', '<b>' + r[3] + '-' + r[2] + '-' + r[1] + '</b>');
        }
        text = text.replaceAll('<Ranger>', '<b>' + ctx.username + '</b>');
        let users = null;
        if (ctx.session) {
            users = await getSessionUsers(ctx.session);
        }
        if (users) {
            for (let i = 0; i < users.length; i++) {
                text = text.replaceAll('<' + users[i].num + '>', '<b>' + users[i].name + '</b>');
            }
        }
        text = text.replaceAll('<1>', '<b>' + ctx.username + '</b>');
        text = text.replaceAll('<2>', '<b>Bot</b>');
        text = text.replaceAll('<3>', '<b>Bot</b>');
        text = text.replaceAll('<4>', '<b>Bot</b>');
        text = text.replaceAll('<5>', '<b>Bot</b>');
        text = text.replaceAll('<Money>', '<b>' + ctx.money + '</b>');
    } else {
        text = text.replaceAll('<Money>', '<b>' + qm.strings.Money + '</b>');
    }
    return text;
}

async function getText(bot, uid, chat, qm, loc, ctx): Promise<string> {
    let ix = 0;
    if (qm.locations[loc].isTextByFormula && qm.locations[loc].textSelectFormula) {
        let p = [];
        for (let i = 0; i < ctx.params.length; i++) {
            p.push(ctx.params[i].value);
        }
        ix = await calc(qm.locations[loc].textSelectFormula, p) - 1;
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
    if (qm.locations[loc].media[ix] && qm.locations[loc].media[ix].img) {
        await sendImg(bot, uid, chat, qm.locations[loc].media[ix].img);
    }
    return qm.locations[loc].texts[ix];
}

async function jumpRestricted(jump, ctx): Promise<boolean> {
    for (let i = 0; i < ctx.params.length; i++) {
        if (jump.paramsConditions[i].mustFrom > ctx.params[i].value) return true;
        if (jump.paramsConditions[i].mustTo < ctx.params[i].value) return true;

        if (jump.paramsConditions[i].mustEqualValues.length > 0) {
            const f = (jump.paramsConditions[i].mustEqualValues.indexOf(+ctx.params[i].value) < 0);
            if (jump.paramsConditions[i].mustEqualValuesEqual && f) return true;
            if (!jump.paramsConditions[i].mustEqualValuesEqual && !f) return true;
        }        
        if (jump.paramsConditions[i].mustModValues.length > 0) {
            let f = true;
            for (let j = 0; j < jump.paramsConditions[i].mustModValues.length; j++) {
                if ((ctx.params[i].value % jump.paramsConditions[i].mustModValues[j]) == 0) f = false;
            }
            if (jump.paramsConditions[i].mustModValuesMod && f) return true;
            if (!jump.paramsConditions[i].mustModValuesMod && !f) return true;
        }
    }
    if (jump.formulaToPass) {
        let p = [];
        for (let i = 0; i < ctx.params.length; i++) {
            p.push(ctx.params[i].value);
        }
        const r = await calc(jump.formulaToPass, p);
        if (!r) return true;
    }
    if (jump.jumpingCountLimit > 0) {
        const c = ctx.jumps[jump.id];
        if (c) {
            if (c >= jump.jumpingCountLimit) return true;
        }
    }
    return false;
}

async function checkCritValue(bot, service, chatId, qm, ctx, ix, value): Promise<ParamType> {
    if (qm.params[ix].critValueString) {
        const r = qm.params[ix].critValueString.match(/^Сообщение/);
        if (r) return 0;
        if ((qm.params[ix].critType == 0) && (ctx.params[ix].max == value)) {
            const text = fixText(await prepareText(qm.params[ix].critValueString, qm, ctx));
            await send(bot, service, chatId, text, {
                parse_mode: "HTML"
            }, undefined, undefined);
            return qm.params[ix].type;
        }
        if ((qm.params[ix].critType == 1) && (ctx.params[ix].min == value)) {
            const text = fixText(await prepareText(qm.params[ix].critValueString, qm, ctx));
            await send(bot, service, chatId, text, {
                parse_mode: "HTML"
            }, undefined, undefined);
            return qm.params[ix].type;
        }
    }
    return 0;
}

async function paramChanges(bot, service, chatId, qm, changes, ctx): Promise<ParamType> {
    let p = [];
    for (let i = 0; i < ctx.params.length; i++) {
        p.push(ctx.params[i].value);
    }
    for (let i = 0; i < changes.length ; i++) {
        if (i >= ctx.params.length) break;
        if (changes[i].showingType) {
            if (changes[i].showingType == 1) {
                await ctx.setHidden(i, false);
            }
            if (changes[i].showingType == 2) {
                await ctx.setHidden(i, true);
            }
        }
        if (changes[i].isChangeFormula && changes[i].changingFormula) {
            const old = ctx.params[i].value;
            await ctx.setValue(i, await calc(changes[i].changingFormula, p));
            if (old != ctx.params[i].value) {
                const t = await checkCritValue(bot, service, chatId, qm, ctx, i, ctx.params[i].value);
                if (t > 0) return t;
            }
            continue;
        }
        if (changes[i].isChangeValue) {
            const old = ctx.params[i].value;
            await ctx.setValue(i, +changes[i].change);
            if (old != ctx.params[i].value) {
                const t = await checkCritValue(bot, service, chatId, qm, ctx, i, ctx.params[i].value); 
                if (t > 0) return t;
            }
            continue;
        }
        if (changes[i].isChangePercentage && (ctx.params[i].value != 0)) {
            const old = ctx.params[i].value;
            await ctx.setValue(i, ctx.params[i].value + ((+ctx.params[i].value * +changes[i].change) / 100) | 0);
            if (old != ctx.params[i].value) {
                const t = await checkCritValue(bot, service, chatId, qm, ctx, i, ctx.params[i].value); 
                if (t > 0) return t;
            }
            continue;
        }
        if (changes[i].change != 0) {
            const old = ctx.params[i].value;
            await ctx.setValue(i, (+ctx.params[i].value) + (+changes[i].change));
            if (old != ctx.params[i].value) {
                const t = await checkCritValue(bot, service, chatId, qm, ctx, i, ctx.params[i].value);
                if (t > 0) return t;
            }
            continue;
        }
    }
    return 0;
}

async function prepareText(text, qm, ctx) {
    if (text) {
        text = await replaceStrings(text, qm, ctx, false);
        text = await calculateParams(text, ctx.params, qm);
    } else {
        text = '...';
    }
    return text;
}

async function getParamBox(qm, ctx: QmContext): Promise<string> {
    let r = '';
    for (let i = 0; i < ctx.params.length; i++) {
        const v = ctx.params[i].value;
        if (ctx.params[i].hidden) continue;
        if (!qm.params[i].showWhenZero) {
            if (v == 0) continue;
        }
        for (let j = 0; j < qm.params[i].showingInfo.length; j++) {
            if (v < qm.params[i].showingInfo[j].from) continue;
            if (v > qm.params[i].showingInfo[j].to) continue;
            r = r + qm.params[i].showingInfo[j].str.replaceAll('<>', v);
            const s = r.replace('<nobr>', '');
            if (s == r) {
                r = r + "\n";
            } else {
                r = s;
            }
            break;
        }
    }
    if (r != '') {
        r = await prepareText(r, qm, ctx);
        const s = fixText(r);
        if (s != r) {
            r = s + '\n';
        } else {
            r = "<i>" + r + "</i>\n";
        }
    }
    return r;
}

function addJump(jumps, qm, ix: number, text: string) {
    if (text != '...') {
        for (let i = 0; i < jumps.length; i++) {
            if (jumps[i].text == text) {
                if (qm.jumps[ix].priority > jumps[i].priority) {
                    jumps[i].ids = [];
                }
                jumps[i].ids.push(qm.jumps[ix].id);
                return;
            }
        }
    }
    jumps.push({
        text: text,
        ids: [qm.jumps[ix].id],
        order: qm.jumps[ix].showingOrder,
        priority: qm.jumps[ix].priority
    });
}

function selectId(ids: number[]): number {
    if (ids.length == 1) return ids[0];
    if (ids.length > 1) {
        const ix = calculate('[0..' + (ids.length - 1) + ']', [], randomFromMathRandom);
        return (ix < ids.length) ? ids[ix] : ids [0];
    }
}

function getParamBlock(ctx: QmContext): string {
    let r = '';
    for (let i = 0; i < ctx.paramCount; i++) {
        if (r != '') r = r + ',';
        r = r + ctx.params[ctx.startParam + i - 1].value;
    }
    return '[' + r + ']';
}

async function getMenu(bot, service, userId, chatId, qm, loc, ctx: QmContext, menu): Promise<boolean> {
    let jumps = []; let mx = null; let mn = null;
    let isEmpty = true; let priority = null;
    for (let i = 0; i < qm.jumps.length; i++) {
         if (qm.jumps[i].fromLocationId == qm.locations[loc].id) {
             if (await jumpRestricted(qm.jumps[i], ctx)) continue;
             let t = await prepareText(qm.jumps[i].text ? qm.jumps[i].text : '...', qm, ctx);
             let r = t.match(/^!session\s*(\d*)/);
             if (r) {
                if (ctx.id) {
                    const info = await joinToSession(ctx.id);
                    if (info) {
                        await ctx.setValue(info.indexParam - 1, +info.userNum);
                        ctx.session    = +info.id;
                        ctx.indexParam = +info.indexParam;
                        ctx.startParam = +info.startParam;
                        ctx.paramCount = +info.paramCount;
                        if (r[1]) {
                            ctx.timeout = +r[1];
                        }
                    }
                }
                t = '...';
            }
            r = t.match(/^!wait\s*(\d*)/);
            if (r) {
                if (ctx.session) {
                    if (await isCompletedSession(ctx.session)) {
                        const params = getParamBlock(ctx);
                        const info = await addSessionParams(ctx.id, params);
                        if (info.leftUsers > 0) {
                            if (!sessions[ctx.session]) {
                                sessions[ctx.session] = [];
                            }
                            sessions[ctx.session].push(new TimeSlot(service, userId, chatId, new Date(), qm.jumps[i].id));
                            return;
                        }
                        const p = await getSessionParams(ctx.session, info.slotNum);
                        for (let k = 0; k < p.length; k++) {
                            const ix = +ctx.startParam + (ctx.paramCount * p[k].num) + (p[k].ix - 1);
                            await ctx.setValue(ix - 1, p[k].value);
                        }
                        if (sessions[ctx.session]) {
                            for (let j = 0; j < sessions[ctx.session].length; j++) {
                                const t = sessions[ctx.session][j];
                                const userId = t.userId;
                                const chatId = t.chatId;
                                const data   = t.data;
                                const c = await getContext(userId, t.service);
                                if (c) {
                                    for (let k = 0; k < p.length; k++) {
                                        const ix = +c.startParam + (c.paramCount * p[k].num) + (p[k].ix - 1);
                                        await c.setValue(ix - 1, p[k].value);
                                    }
                                    await autoJump(bot, service, userId, chatId, data);
                                }
                            }
                            delete sessions[ctx.session];
                        }
                    } else {
                        await ctx.setValue(ctx.indexParam - 1, 0);
                    }
                }
                t = '...';
            }
            addJump(jumps, qm, i, noTag(t));
            if ((mn === null) || (mn > qm.jumps[i].showingOrder)) mn = qm.jumps[i].showingOrder;
            if ((mx === null) || (mx < qm.jumps[i].showingOrder)) mx = qm.jumps[i].showingOrder;
            if (t != '...') {
               isEmpty = false;
               continue;
            }
            if ((priority === null) || (priority < qm.jumps[i].priority)) {
               priority = qm.jumps[i].priority;
            }
        }
    }
    if ((mn !== null) && (mx !== null)) {
        let list = [];
        for (let r = mn; r <= mx; r++) {
            for (let j = 0; j < jumps.length; j++) {
                 if ((priority !== null) && (jumps[j].text == '...')) {
                      if (jumps[j].priority < priority) continue;
                 }
                 if (jumps[j].order == r) {
                    const r = jumps[j].text.match(/^!auto\s*(\d+)/);
                    if (r) {
                       const t: number = +r[1];
                       let d = new Date();
                       d.setSeconds(d.getSeconds() + t);
                       setIntervalTimeout(t * 1000);
                       for (let k = 0; k < timeslots.length; k++) {
                           if (timeslots[k] === null) {
                               timeslots[k] = new TimeSlot(service, userId, chatId, d, jumps[j].ids[0]);
                               d = null;
                               break;
                           }
                       }
                       if (d !== null) {
                           timeslots.push(new TimeSlot(service, userId, chatId, d, jumps[j].ids[0]));
                       }
                       continue;
                    }
                    list.push(jumps[j]);
                }
            }
        }
        let width = 1;
        if (qm.locations[loc].media[0] && qm.locations[loc].media[0].img) {
            const r = qm.locations[loc].media[0].img.match(/^(\d+)$/);
            if (r) width = +r[1];
        }
        let m = [];
        for (let j = 0; j < list.length; j++) {
            if (m.length >= width) {
                menu.push(m);
                m = [];
            }
            m.push({
                text: list[j].text,
                callback_data: selectId(list[j].ids)
            });
        }
        if (m.length > 0) {
            menu.push(m);
        }
    }
    return isEmpty;
}

async function questMenu(bot, service, qm, loc, userId, chatId, ctx: QmContext): Promise<number> {
    let isCritical = await paramChanges(bot, service, chatId, qm, qm.locations[loc].paramsChanges, ctx);
    if (qm.locations[loc].dayPassed) {
        ctx.date.setDate(ctx.date.getDate() + 1);
    }
    let menu = [];
    let isEmpty = await getMenu(bot, service, userId, chatId, qm, loc, ctx, menu);
    let text = await getText(bot, userId, chatId, qm, loc, ctx);
    text = await prepareText(text, qm, ctx);
    const prefix = await getParamBox(qm, ctx);
    if ((text == '...') && (prefix != '')) {
        ctx.fixed = prefix;
    } else {
        ctx.fixed = prefix + fixText(text);
    }
    ctx.old = fixText(text);
    while (isEmpty && (menu.length > 0)) {
        if (text != '...') {
            await send(bot, service, chatId, ctx.fixed, {
                parse_mode: "HTML"
            }, undefined, undefined);
        }
        let ix = 0;
        if (menu.length > 1) {
            ix = calculate('[0..' + (menu.length - 1) + ']', [], randomFromMathRandom);
            if (ix >= menu.length) ix = 0;
        }
        let to = null;
        for (let i = 0; i < qm.jumps.length; i++) {
            if (qm.jumps[i].id != menu[ix][0].callback_data) continue;
            to = qm.jumps[i].toLocationId;
            console.log('Jump: ' + qm.jumps[i].id);
            const t = await paramChanges(bot, service, chatId, qm, qm.jumps[i].paramsChanges, ctx); 
            if (t > 0) isCritical = t;
            if (qm.jumps[i].description) {
                const text = await prepareText(qm.jumps[i].description, qm, ctx);
                await send(bot, service, chatId, fixText(text), {
                    parse_mode: "HTML"
                }, undefined, undefined);
            }
            if (qm.jumps[i].img) {
                await sendImg(bot, userId, chatId, qm.jumps[i].img);
            }
            break;
        }
        menu = []; loc = null;
        if (to === null) break;
        for (let i = 0; i < qm.locations.length; i++) {
            if (qm.locations[i].id != to) continue;
            loc = i;
            break;
        }
        if (loc === null) break;
        const t = await paramChanges(bot, service, chatId, qm, qm.locations[loc].paramsChanges, ctx); 
        if (t > 0) isCritical = t;
        if (qm.locations[loc].dayPassed) {
            ctx.date.setDate(ctx.date.getDate() + 1);
        }
        isEmpty = await getMenu(bot, service, userId, chatId, qm, loc, ctx, menu);
        text = await getText(bot, userId, chatId, qm, loc, ctx);
        text = await prepareText(text, qm, ctx);
        const prefix = await getParamBox(qm, ctx);
        if ((text == '...') && (prefix != '')) {
            ctx.fixed = prefix;
        } else {
            ctx.fixed = prefix + fixText(text);
        }
        ctx.old = fixText(text);
        if (menu.length == 0) break;
    }
    if (loc !== null) {
        await ctx.setLoc(loc, qm);
    }
    if (logLevel & 4) {
        console.log(text);
    }
    let r = null;
    if (isCritical > 0) {
        await endQuest(bot, service, chatId, ctx, qm, isCritical);
        return r;
    } 
    if (menu.length > 0) {
        const msg = await send(bot, service, chatId, ctx.fixed, {
            reply_markup: {
              inline_keyboard: menu
            },
            parse_mode: "HTML"
        }, async function (data, m) {
            data.ctx.message = m.message_id;
            if (logLevel & 2) {
                console.log(m);
            }
        }, {
            ctx: ctx
        });
        r = msg.message_id;
    } else {
        await send(bot, service, chatId, ctx.fixed, {
            parse_mode: "HTML"
        }, undefined, undefined);
    }
    const location: Location = qm.locations[loc];
    if (location.isSuccess || location.isFaily || location.isFailyDeadly) {
        await endQuest(bot, service, chatId, ctx, qm, 0);
    }
    return r;
}

export async function execLoad(bot, name, chatId, id, service, username) {
    const ctx = await load(name, username);
    if (ctx) {
        addContext(id, service, ctx);
        const qm = await getQm(ctx);
        ctx.message = await questMenu(bot, service, qm, ctx.loc, id, chatId, ctx);
    }
}

export async function execWrite(bot, chatId, service, id) {
    try {
        const ctx: QmContext = await getContext(id, service);
        if (ctx) {
            const qm  = await getQm(ctx);
            const buf = writeQmm(qm);
            fs.writeFileSync(__dirname + '/../upload/quest.qmm', buf);
            bot.sendDocument(chatId, __dirname + '/../upload/quest.qmm');
        }
    } catch (error) {
        console.error(error);
    }
}

export async function execSave(bot, chatId, service, id) {
    try {
        const ctx: QmContext = await getContext(id, service);
        if (ctx) {
            const buf = saveCtx(ctx);
            const d = new Date();
            const r = ctx.name.match(/^([^.]+)\./);
            if (r) {
                const name = r[1] + '_' + d.getHours() + '_' + d.getMinutes() + '_' + d.getSeconds();
                fs.writeFileSync(__dirname + '/../upload/' + name + '.qms', buf);
                await bot.sendDocument(chatId, __dirname + '/../upload/' + name + '.qms');
                fs.unlinkSync(__dirname + '/../upload/' + name + '.qms');
            }
        }
    } catch (error) {
        console.error(error);
    }
}

export async function execRetry(bot, service, chatId, id) {
    const ctx: QmContext = await getContext(id, service);
    if (ctx) {
        const qm = await getQm(ctx);
        ctx.message = await questMenu(bot, service, qm, ctx.loc, id, chatId, ctx);
    }
}

async function commonJump(bot, service, id, chatId, ctx, qm, itemId) {
    if (!qm.locations[ctx.loc].isStarting && !qm.locations[ctx.loc].isEmpty && (ctx.old != '...')) {
        await send(bot, service, chatId, ctx.old, {
            parse_mode: "HTML"
        }, undefined, undefined);
    }
    let to = null;
    for (let i = 0; i < qm.jumps.length; i++) {
        if (qm.jumps[i].id == itemId) {
            to = qm.jumps[i].toLocationId;
            console.log('Jump: ' + qm.jumps[i].id);
            if (qm.jumps[i].dayPassed) {
                ctx.date.setDate(ctx.date.getDate() + 1);
            }
            const isCritical = await paramChanges(bot, service, chatId, qm, qm.jumps[i].paramsChanges, ctx);
            if (isCritical > 0) {
                await endQuest(bot, service, chatId, ctx, qm, isCritical);
                return false;
            }
            if (qm.jumps[i].jumpingCountLimit > 0) {
                const c = ctx.jumps[qm.jumps[i].id];
                if (c) {
                    ctx.jumps[qm.jumps[i].id]++;
                } else {
                    ctx.jumps[qm.jumps[i].id] = 1;
                }
            }
            if (qm.jumps[i].description) {
                const text = await prepareText(qm.jumps[i].description, qm, ctx);
                await send(bot, service, chatId, fixText(text), {
                    parse_mode: "HTML"
                }, undefined, undefined);
            }
            if (qm.jumps[i].img) {
                await sendImg(bot, id, chatId, qm.jumps[i].img);
            }
        }
    }
    if (to !== null) {
        for (let i = 0; i < qm.locations.length; i++) {
            if (qm.locations[i].id == to) {
                await ctx.setLoc(i, qm);
                ctx.message = await questMenu(bot, service, qm, i, id, chatId, ctx);
                return true;
            }
        }
    }
}

async function autoJump(bot, service, id, chatId, itemId) {
    const ctx: QmContext = await getContext(id, service);
    if (ctx !== null) {
        if (ctx.message) {
            try {
                await bot.deleteMessage(chatId, ctx.message);
            } catch (error) {
                console.error(error);
            }
        }
        ctx.message = null;
        const qm = await getQm(ctx);
        if (qm) {
            await commonJump(bot, service, id, chatId, ctx, qm, itemId);
        }
    }
}

function getJumpText(qm, id): string {
    for (let i = 0; i < qm.jumps.length; i++) {
        if (qm.jumps[i].id == id) return qm.jumps[i].text;
    }
    return '';
}

export async function execJump(bot, chatId, userId, service, msg): Promise<boolean> {
    for (let i = 0; i < timeslots.length; i++) {
        if (timeslots[i] === null) continue;
        if (timeslots[i].userId  != userId) continue;
        timeslots[i] = null;
    }
    const ctx: QmContext = await getContext(userId, service);
    if (ctx !== null) {
        try {
            if (ctx.message) {
                await bot.deleteMessage(chatId, ctx.message);
            } else if (msg.message) {
                bot.deleteMessage(chatId, msg.message.message_id);
                ctx.old = '...';
            }
        } catch (error) {
            console.error(error);
        }
        ctx.message = null;
        const qm = await getQm(ctx);
        if (qm) {
            let id = +msg.data;
            if (id > 0) {
                const text = await prepareText(getJumpText(qm, msg.data), qm, ctx);
                if (text.length > 50) {
                    let menu = [];
                    const lang = await getUserLang(userId);
                    if (lang == 'ru') {
                        menu.push([{
                            text: 'Да',
                            callback_data: -id
                        }, {
                            text: 'Нет',
                            callback_data: 0
                        }]);
                    } else {
                        menu.push([{
                            text: 'Yes',
                            callback_data: -id
                        }, {
                            text: 'No',
                            callback_data: 0
                        }]);
                    }
                    await send(bot, service, chatId, fixText(text), {
                        reply_markup: {
                          inline_keyboard: menu
                        },
                        parse_mode: "HTML"
                    }, async function (data, m) {
                        data.ctx.message = m.message_id;
                    }, {
                        ctx: ctx
                    });
                    return;
                }
            } else {
                id = -id;
            }
            if (id == 0) {
                await execRetry(bot, service, chatId, userId);
                return;
            }
            await commonJump(bot, service, userId, chatId, ctx, qm, id);
        }
    }
    return false;
}

export async function showJumps(id, service, order) {
    const ctx: QmContext = await getContext(id, service);
    if (ctx !== null) {
        const qm = await getQm(ctx);
        if (qm) {
            for (let i = 0; i < qm.jumps.length; i++) {
                if (qm.jumps[i].fromLocationId != qm.locations[ctx.loc].id) continue;
                if (order) {
                    if (qm.jumps[i].showingOrder != order) continue;
                }
                console.log(qm.jumps[i]);
            }
        }
    }
}

export async function showParams(id, service) {
    const ctx: QmContext = await getContext(id, service);
    if (ctx !== null) {
        for (let i = 0; i < ctx.params.length; i++) {
            console.log(ctx.params[i]);
        }
    }
}

export async function showParameters(id, service, ix) {
    const ctx: QmContext = await getContext(id, service);
    if (ctx !== null) {
        const qm = await getQm(ctx);
        if (qm) {
            if (ix === undefined) {
                console.log(qm.params);
            } else {
                console.log(qm.params[ix]);
            }
        }
    }
}

export async function showLocation(id, service) {
    const ctx: QmContext = await getContext(id, service);
    if (ctx !== null) {
        const qm = await getQm(ctx);
        if (qm) {
            console.log(qm.locations[ctx.loc]);
        }
    }
}

export async function showLocationId(bot, msg, id, service) {
    const ctx: QmContext = await getContext(id, service);
    if (ctx !== null) {
        const qm = await getQm(ctx);
        if (qm) {
            await send(bot, service, msg.chat.id, 'Location ID: ' + qm.locations[ctx.loc].id, undefined, undefined, undefined);
        }
    }
}

export async function sendInfo(bot, user, chatId, service) {
    const info = await getInfoMessages(user, service);
    for (let i = 0; i < info.length; i++) {
        await send(bot, service, chatId, fixText(info[i].text), {
            parse_mode: "HTML"
        }, async function (data) {
            await acceptInfo(data.user, data.info);
        }, {
            info: info[i].id,
            user: user
        });

    }
}

export async function execScore(bot, service, chatId, uid) {
    const score = await getScore(uid);
    let s = '<fix><format=left,20>win</format><format=left,25>lose</format><format=left,30>death</format><format=left,36>all</format><br>';
    for (let i = 0; i < score.length; i++) {
        if (score[i].name) {
            s = s + score[i].name;
        } else {
            s = s + 'Итого:';
        }
        s = s + '<format=left,20>' + score[i].win + '</format>';
        s = s + '<format=left,25>' + score[i].lose + '</format>';
        s = s + '<format=left,30>' + score[i].death + '</format>';
        s = s + '<format=left,36>' + score[i].launch + '</format>';
        s = s + '<br>';
    }
    const credits = await getCredits(uid);
    if (credits !== null) {
        s = s + '<br>Credits: ' + credits;
    }
    s = s + '</fix>';
    await send(bot, service, chatId, fixText(s), {
        parse_mode: "HTML"
    }, undefined, undefined);
}
