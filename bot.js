const TelegramBot = require('node-telegram-bot-api');

const token = '8119403473:AAHlxMGHbXaHx8o97s3Wh0Y1Azgt-GL6KLs';

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Привіт, Я твій Мафія-бот!')
})

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `Ти написав: ${msg}`)
})