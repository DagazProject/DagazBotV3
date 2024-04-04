const TelegramBot = require('node-telegram-bot-api');

import { db, getTokens, updateAccount, isDeveloper } from "./data-source";
import { execCommands, execMessage, execCommand, execInputWaiting, execMenuWaiting, uploadFile, execCalc, execLoad, execJump } from "./utils";

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
//      console.log(doc);
        await uploadFile(bot, doc);
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
        try {
            const developer = await isDeveloper(user, services[i].id);
            if (developer) {
                if ((cmd == 'calc') && r[2]) {
                    await execCalc(bot, msg, r);
                    return;
                }
                if ((cmd == 'load') && r[2]) {
                    await execLoad(bot, r[2], msg.chat.id, msg.from.id);
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
//      console.log(msg);
        try {
            if (await execJump(bot, msg.message.chat.id, msg.from.id, msg)) return;
            await execMenuWaiting(bot, services[i].id, msg);
        } catch (error) {
            console.error(error);
        }
    });
}
   
}).catch((error) => console.error("Error: ", error))

