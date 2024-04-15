const TelegramBot = require('node-telegram-bot-api');

import { db, getTokens, updateAccount, isDeveloper } from "./data-source";
import { execCommands, execMessage, execCommand, execInputWaiting, execMenuWaiting, uploadFile, execCalc, execLoad, execJump, execSet, setLog, logLevel, showJumps, showParams, showLocation, showParameters } from "./utils";

const RUN_INTERVAL = 500;

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
        if (logLevel & 1) {
            console.log(doc);
        }
        await uploadFile(bot, doc);
      });
      bot.on('text', async msg => {
        if (logLevel & 1) {
            console.log(msg);
        }
        const user = await updateAccount(services[i].id, msg.from.id, msg.from.username, msg.chat.id, msg.from.first_name, msg.from.last_name, msg.from.language_code);
        let cmd = null;
        const r = msg.text.match(/\/(\w+)\s*(\S+)?\s*(\S+)?\s*(\S+)?\s*(\S+)?\s*(\S+)?/);
        if (r) {
            cmd = r[1];
        }
        try {
            const developer = await isDeveloper(user, services[i].id);
            if (developer) {
                if ((cmd == 'calc') && r[2]) {
                    await execCalc(bot, msg, r);
                    return;
                }
                if ((cmd == 'load') && r[2]) {
                    await execLoad(bot, r[2], msg.chat.id, msg.from.id, msg.from.first_name ? msg.from.first_name : msg.from.username);
                    return;
                }
                if ((cmd == 'set') && r[2] && r[3]) {
                    execSet(msg.from.id, r[2], r[3]);
                    return;
                }
                if ((cmd == 'show') && r[2]) {
                    if (r[2] == 'jumps') showJumps(msg.from.id, r[3]);
                    if (r[2] == 'params') showParams(msg.from.id);
                    if (r[2] == 'loc') showLocation(msg.from.id);
                    if (r[2] == 'parameters') showParameters(msg.from.id, r[3]);
                    return;
                }
                if ((cmd == 'log') && r[2]) {
                    setLog(r[2]);
                    return;
                }
            }
            if (await execCommand(bot, user, services[i].id, cmd, r, run)) return;
            await execInputWaiting(bot, user, services[i].id, msg);
            if (cmd === null) {
                await execMessage(bot, msg, user, services[i].id);
            }
        } catch (error) {
            console.error(error);
        }
    });
    bot.on('callback_query', async msg => {
        if (logLevel & 1) {
            console.log(msg);
        }
        try {
            if (await execJump(bot, msg.message.chat.id, msg.from.id, msg)) return;
            await execMenuWaiting(bot, services[i].id, msg);
        } catch (error) {
            console.error(error);
        }
    });
}
   
}).catch((error) => console.error("Error: ", error))
