const TelegramBot = require('node-telegram-bot-api');

const token = '8119403473:AAHlxMGHbXaHx8o97s3Wh0Y1Azgt-GL6KLs';

const bot = new TelegramBot(token, { polling: true });

bot.on('message', (msg) => {
  const newMembers = msg.new_chat_members;
  if (newMembers) {
    newMembers.forEach((member) => {
      if (member.username === bot.botInfo.username) {
        bot.sendMessage(msg.chat.id, `Привіт! Я бот для гри в Мафію 🎭. Для роботи мені потрібні наступні права адміністратора:
* Видалення повідомлень
* Обмеження інших учасників
* Закріплення повідомлень`);
      }
    });
  }
});

bot.getMe().then((botInfo) => {
  const botUsername = botInfo.username;
  let timeout = 30;

  bot.onText(/\/start(@\w+)?/, (msg, match) => {
    const mentionedBot = match[1];

    if (!mentionedBot || mentionedBot.toLowerCase() === `@${botUsername.toLowerCase()}`) {
      bot.sendMessage(msg.chat.id, `Привіт, Я твій Мафія-бот! До початку гри ${timeout} секунд`);
      bot.deleteMessage(msg.chat.id, msg.message_id);

      setInterval(() => {
        timeout -= 1;

        if (timeout === 30) {
          bot.sendMessage(msg.chat.id, 'До закінчення реєстрації залишилось 30 секунд');
        }

        if (timeout === 0) {
          bot.sendMessage(msg.chat.id, 'Гра починається');
          return;
        }
      }, 1000);
    }
  });

  bot.onText(/\/extend(@\w+)?/, (msg, match) => {
    const mentionedBot = match[1];

    if (!mentionedBot || mentionedBot.toLowerCase() === `@${botUsername.toLowerCase()}`) {
      timeout += 30;
      bot.sendMessage(
        msg.chat.id, 
        `До часу реєстрації додано 30 секунд. До кінця реєстрації ${
          timeout >= 60 
          ? `${timeout % 60 >= 60 ? `${Math.floor(timeout / 60)} хвилини ${timeout % 60} секунд` : `1 хвилина ${timeout - 60} секунд`}` 
          : `${timeout} секунд`
        }`
      );
      bot.deleteMessage(msg.chat.id, msg.message_id);
    }
  })
});

