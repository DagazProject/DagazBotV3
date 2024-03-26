const TelegramBot = require('node-telegram-bot-api');

import { parse } from "./qm/qmreader";
import * as fs from "fs";

import { db, getTokens, updateAccount, isAdmin, getChatsByLang, saveMessage, saveClientMessage, getAdminChats, getParentMessage, getCommands, addCommand, getActions, setNextAction, getCaption, waitValue, getWaiting, setParamValue } from "./data-source"

//const data = fs.readFileSync(__dirname + `/../upload/sample.qm`);
//const qm = parse(data);

const RUN_INTERVAL = 500;

let isProcessing = [];

async function execCommands(bot, service: number): Promise<boolean> {
    if (isProcessing[service]) return false;
    isProcessing[service] = true;
    const actions = await getActions(service);
    for (let i = 0; i < actions.length; i++) {
        switch (actions[i].type) {
            case 2:
                // Input string
                const is = await getCaption(actions[i].ctx);
                const m = await bot.sendMessage(is.chat, is.value);
                await waitValue(actions[i].ctx, m.message_id);
                break;
            case 3:
                // Output string
                const os = await getCaption(actions[i].ctx);
                await bot.sendMessage(os.chat, os.value);
                break;

        }
        await setNextAction(actions[i].ctx);
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
        const waiting = await getWaiting(user, services[i].id);
        if (waiting !== null) {
            if (waiting.hide !== null) {
                await bot.deleteMessage(msg.chat.id, waiting.hide);
            }
            await setParamValue(waiting.ctx, msg.text);
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
  }
   
}).catch((error) => console.error("Error: ", error))

