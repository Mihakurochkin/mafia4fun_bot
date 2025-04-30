const TelegramBot = require("node-telegram-bot-api");
const token = "8119403473:AAHlxMGHbXaHx8o97s3Wh0Y1Azgt-GL6KLs";
const bot = new TelegramBot(token, { polling: true });
const botUsername = "Mafia4FunBot";
const commands = [
  { command: "/start", description: "почати реєстрацію на гру" },
  { command: "/extend", description: "продовжити реєстрацію на 30 секунд" },
  { command: "/stop", description: "зупинити реєстрацію" },
];

bot
  .setMyCommands(commands)
  .then(() => {
    console.log("Commands set successfully");
  })
  .catch((error) => {
    console.error("Error setting commands:", error);
  });

bot.on("message", (msg) => {
  const newMembers = msg.new_chat_members;
  if (newMembers) {
    newMembers.forEach((member) => {
      if (member.username === bot.botInfo.username) {
        bot.sendMessage(
          msg.chat.id,
          `Привіт! Я бот для гри в Мафію 🎭. Для роботи мені потрібні наступні права адміністратора:
* Видалення повідомлень
* Обмеження інших учасників
* Закріплення повідомлень`
        );
      }
    });
  }
});

let timeout = 30;
let isStarted = false;

bot.onText(`/start@${botUsername}`, (msg, match) => {
  timeout = 30;
  isStarted = true;

  bot.sendMessage(
    msg.chat.id,
    `Привіт, Я твій Мафія-бот! До початку гри ${timeout} секунд.`
  );
  bot.deleteMessage(msg.chat.id, msg.message_id);

  const intervalId = setInterval(() => {
    timeout -= 1;

    switch (timeout) {
      case 30:
        bot.sendMessage(
          msg.chat.id,
          "До закінчення реєстрації залишилось 30 секунд"
        );
        break;
      case -1:
        clearInterval(intervalId);
        break;
      case 0:
        bot.sendMessage(msg.chat.id, "<b>Гра починається!</b>", {
          parse_mode: "HTML",
        });
        isStarted = false;
        clearInterval(intervalId);
    }
  }, 1000);
});

bot.onText(`/stop@${botUsername}`, (msg) => {
  timeout = -1;
  bot.sendMessage(msg.chat.id, "<b>Реєстрацію на гру зупинено</b>", {
    parse_mode: "HTML",
  });
  bot.deleteMessage(msg.chat.id, msg.message_id);
});

bot.onText(`/extend@${botUsername}`, (msg) => {
  timeout += 30;
  if (isStarted) {
    bot.sendMessage(
      msg.chat.id,
      `До часу реєстрації додано 30 секунд. До кінця реєстрації: ${
        timeout >= 60
          ? `${
              timeout % 60 >= 60
                ? `${Math.floor(timeout / 60)} хвилини ${timeout % 60} секунд`
                : `1 хвилина ${timeout - 60} секунд`
            }`
          : `${timeout} секунд`
      }`
    );
  } else {
    bot.sendMessage(
      msg.chat.id,
      `Перш ніж використати цю команду, почніть реєстрацію на гру за допомогою команди: /start@${botUsername}`
    );
  }
  bot.deleteMessage(msg.chat.id, msg.message_id);
});
