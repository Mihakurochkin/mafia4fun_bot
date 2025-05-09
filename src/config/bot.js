require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
let botInfo = null;

bot.getMe().then(info => {
  botInfo = info;
  console.log(`Bot initialized with username: @${botInfo.username}`);
}).catch(error => {
  console.error('Error getting bot info:', error);
  process.exit(1);
});

const commands = [
  { command: "/start", description: "почати реєстрацію на гру" },
  { command: "/extend", description: "продовжити реєстрацію на 30 секунд" },
  { command: "/stop", description: "зупинити реєстрацію" },
];

module.exports = {
  bot,
  botInfo,
  commands
}; 