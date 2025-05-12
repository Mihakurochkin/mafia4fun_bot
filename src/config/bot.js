require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
let botInfo = null;

const commands = [
  { command: "/start", description: "почати реєстрацію на гру" },
  { command: "/extend", description: "продовжити реєстрацію на 30 секунд" },
  { command: "/stop", description: "зупинити реєстрацію" },
  { command: "/test", description: "увімкнути тестовий режим" }
];

bot.getMe().then(info => {
  botInfo = info;
  console.log(`Bot initialized with username: @${botInfo.username}`);
  
  bot.setMyCommands(commands).catch(error => {
    console.error('Error setting commands:', error);
  });
}).catch(error => {
  console.error('Error getting bot info:', error);
  process.exit(1);
});

module.exports = {
  bot,
  botInfo,
  commands
}; 