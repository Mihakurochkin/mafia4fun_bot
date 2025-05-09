require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const botUsername = "Mafia4FunBot";
const commands = [
  { command: "/start", description: "почати реєстрацію на гру" },
  { command: "/extend", description: "продовжити реєстрацію на 30 секунд" },
  { command: "/stop", description: "зупинити реєстрацію" },
];
const players = [];
let allRights = false;
let timeout = 60;
let isStarted = false;

async function checkBotRights(chatId) {
  try {
    const chatMember = await bot.getChatMember(chatId, botUsername);
    if (chatMember.status === "administrator") {
      const missingRights = checkRights({
        can_delete_messages: chatMember.can_delete_messages,
        can_restrict_members: chatMember.can_restrict_members,
        can_pin_messages: chatMember.can_pin_messages
      });
      if (missingRights.length === 0) {
        allRights = true;
      } else {
        allRights = false;
      }
    } else {
      allRights = false;
    }
  } catch (error) {
    allRights = false;
  }
}

function startGameRegistration(msg) {
  timeout = 60;
  isStarted = true;

  if (allRights) {
    bot.sendMessage(msg.chat.id, `<b>Реєстрація на гру почалась</b>`, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Приєднатися",
              callback_data: "join_game",
            },
          ],
        ],
      },
    });

    const intervalId = setInterval(() => {
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
      timeout -= 1;
    }, 1000);
    bot.deleteMessage(msg.chat.id, msg.message_id);
  } else {
    bot.sendMessage(
      msg.chat.id,
      `Схоже що мені надано не всі права адміністратора з цього списку:
- Видалення повідомлень
- Обмеження інших учасників
- Закріплення повідомлень`
    );
  }
}

function checkRights(newChatMember) {
  const rightsList = [
    [newChatMember.can_delete_messages, "- Видалення повідомлень"],
    [newChatMember.can_restrict_members, "- Обмеження інших учасників"],
    [newChatMember.can_pin_messages, "- Закріплення повідомлень"],
  ];
  const missingRights = [];

  rightsList.forEach((right) => {
    if (!right[0]) {
      missingRights.push(right[1]);
    }
  });

  return missingRights;
}

bot
  .setMyCommands(commands)
  .then(() => {
    return checkBotRights(process.env.GROUP_ID);
  })
  .catch((error) => {
    allRights = false;
  });

bot.on("new_chat_members", (msg) => {
  const newMembers = msg.new_chat_members;

  newMembers.forEach((member) => {
    if (member.username === bot.username || member.is_bot) {
      bot.sendMessage(
        msg.chat.id,
        `Привіт!
Я бот для гри в Мафію 🎭. Для роботи мені потрібні наступні права адміністратора:
- Видалення повідомлень
- Обмеження інших учасників
- Закріплення повідомлень`
      );
    }
  });
});

bot.on("my_chat_member", (msg) => {
  if (msg.new_chat_member.status !== "administrator") return;

  if (checkRights(msg.new_chat_member).length === 0) {
    bot.sendMessage(
      msg.chat.id,
      `Дякую! Тепер у мене є всі необхідні права адміністратора для гри в Мафію 🕵️‍♂️`
    );
    allRights = true;
  } else {
    bot.sendMessage(
      msg.chat.id,
      `Дякую, що зробили мене адміном!\n\nАле мені не вистачає кількох важливих прав:\n${checkRights(
        msg.new_chat_member
      ).join("\n")}`
    );
    allRights = false;
  }
});

bot.onText(`/start@${botUsername}`, (msg) => {
  startGameRegistration(msg);
});

bot.onText("старт", (msg) => {
  startGameRegistration(msg);
});

bot.on("callback_query", (callbackQuery) => {
  const user = callbackQuery.from;

  if (callbackQuery.data === "join_game") {
    const username =
      `${user.first_name} ${user.last_name || ""}`.trim() || user.username;

    if (!players.find((player) => player.id === user.id)) {
      players.push({ id: user.id, name: username });
    }
  }
});

bot.onText(`/stop@${botUsername}`, (msg) => {
  if (isStarted) {
    timeout = -1;
    bot.sendMessage(msg.chat.id, "<b>Реєстрацію на гру зупинено</b>", {
      parse_mode: "HTML",
    });
    bot.deleteMessage(msg.chat.id, msg.message_id);
    isStarted = false;
  } else {
    bot.sendMessage(msg.chat.id, `Цю команду є сенс використовувати після використання команди /start@${botUsername}`);
  }
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

bot.on("message", async (msg) => {
  if (msg.chat.type === "group" || msg.chat.type === "supergroup") {
    await checkBotRights(msg.chat.id);
  }
});
