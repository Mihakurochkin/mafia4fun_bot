require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
let botInfo = null;

// Initialize bot info
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
const players = [];
const groupRights = new Map();
let timeout = 60;
let isStarted = false;

async function checkBotRights(chatId) {
  if (!botInfo) {
    console.error('Bot info not initialized');
    return { hasRights: false, missingRights: ["помилка ініціалізації бота"] };
  }

  try {
    const chatMember = await bot.getChatMember(chatId, botInfo.id);
    const hasAllRights = chatMember.status === "administrator" && 
                        chatMember.can_delete_messages && 
                        chatMember.can_restrict_members && 
                        chatMember.can_pin_messages;
    
    const missingRights = [];
    if (chatMember.status !== "administrator") {
      missingRights.push("адміністратор");
    } else {
      if (!chatMember.can_delete_messages) missingRights.push("видалення повідомлень");
      if (!chatMember.can_restrict_members) missingRights.push("обмеження учасників");
      if (!chatMember.can_pin_messages) missingRights.push("закріплення повідомлень");
    }
    
    groupRights.set(chatId, {
      hasRights: hasAllRights,
      missingRights: missingRights
    });
    
    return { hasRights: hasAllRights, missingRights };
  } catch (error) {
    console.error(`Error checking rights for chat ${chatId}:`, error.message);
    groupRights.set(chatId, {
      hasRights: false,
      missingRights: ["невідомі права (помилка перевірки)"]
    });
    return { hasRights: false, missingRights: ["невідомі права (помилка перевірки)"] };
  }
}

function hasRights(chatId) {
  const rights = groupRights.get(chatId);
  return rights ? rights.hasRights : false;
}

function getMissingRightsMessage(missingRights) {
  if (!missingRights || missingRights.length === 0) return "";
  return `\n\nВідсутні права:\n${missingRights.map(right => `- ${right}`).join('\n')}`;
}

function startGameRegistration(msg) {
  if (isStarted) {
    bot.sendMessage(msg.chat.id, "Реєстрація вже почалась!");
    return;
  }

  timeout = 60;
  isStarted = true;

  checkBotRights(msg.chat.id).then(({ hasRights, missingRights }) => {
    if (hasRights) {
      let registrationMessage = null;
      let lastMessageText = "";

      const sendRegistrationMessage = () => {
        const messageText = `<b>Реєстрація на гру почалась</b>\n\n` +
          `⏱ Час до кінця: ${timeout} секунд\n` +
          `👥 Зареєстровані гравці (${players.length}):\n` +
          players.map((player, index) => {
            const mention = player.username 
              ? `@${player.username}`
              : `<a href="tg://user?id=${player.id}">${player.name}</a>`;
            return `${index + 1}. ${mention}`;
          }).join('\n');

        if (messageText !== lastMessageText) {
          lastMessageText = messageText;
          
          if (!registrationMessage) {
            bot.sendMessage(msg.chat.id, messageText, {
              parse_mode: "HTML",
              disable_web_page_preview: true,
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
            }).then(message => {
              registrationMessage = message;
            }).catch(error => {
              console.error("Error sending registration message:", error.message);
              isStarted = false;
            });
          } else {
            bot.editMessageText(messageText, {
              chat_id: msg.chat.id,
              message_id: registrationMessage.message_id,
              parse_mode: "HTML",
              disable_web_page_preview: true,
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
            }).catch(error => {
              console.error("Error updating registration message:", error.message);
              isStarted = false;
            });
          }
        }
      };

      sendRegistrationMessage();

      const intervalId = setInterval(() => {
        if (timeout === -1) {
          clearInterval(intervalId);
          return;
        }
        
        if (timeout === 0) {
          bot.editMessageText("<b>Гра починається!</b>", {
            chat_id: msg.chat.id,
            message_id: registrationMessage.message_id,
            parse_mode: "HTML",
          }).catch(error => {
            console.error("Error sending game start message:", error.message);
          });
          isStarted = false;
          clearInterval(intervalId);
          return;
        }

        if (timeout % 5 === 0 || timeout <= 10) {
          sendRegistrationMessage();
        }
        timeout -= 1;
      }, 1000);

      bot.deleteMessage(msg.chat.id, msg.message_id).catch(error => {
        console.error("Error deleting command message:", error.message);
      });
    } else {
      bot.sendMessage(
        msg.chat.id,
        `Для початку гри мені потрібні наступні права адміністратора:${getMissingRightsMessage(missingRights)}`
      );
      isStarted = false;
    }
  });
}

bot.on("new_chat_members", async (msg) => {
  if (!botInfo) {
    console.error('Bot info not initialized');
    return;
  }

  const newMembers = msg.new_chat_members;

  for (const member of newMembers) {
    if (member.id === botInfo.id || member.is_bot) {
      const { missingRights } = await checkBotRights(msg.chat.id);
      bot.sendMessage(
        msg.chat.id,
        `Привіт! Я бот для гри в Мафію 🎭.${getMissingRightsMessage(missingRights)}`
      );
    }
  }
});

bot.on("my_chat_member", async (msg) => {
  if (!botInfo) {
    console.error('Bot info not initialized');
    return;
  }

  const { hasRights, missingRights } = await checkBotRights(msg.chat.id);
  if (hasRights) {
    bot.sendMessage(
      msg.chat.id,
      `Дякую! Тепер у мене є всі необхідні права адміністратора для гри в Мафію 🕵️‍♂️`
    );
  } else {
    bot.sendMessage(
      msg.chat.id,
      `Дякую, що зробили мене адміном!${getMissingRightsMessage(missingRights)}`
    );
  }
});

// Command handlers
bot.onText(/^\/start(@\w+)?$/, (msg, match) => {
  if (!botInfo) {
    console.error('Bot info not initialized');
    return;
  }
  
  // Check if the command is for this bot
  if (!match[1] || match[1] === `@${botInfo.username}`) {
    startGameRegistration(msg);
  }
});

bot.onText(/^старт$/, (msg) => {
  startGameRegistration(msg);
});

bot.onText(/^\/stop(@\w+)?$/, (msg, match) => {
  if (!botInfo) {
    console.error('Bot info not initialized');
    return;
  }

  // Check if the command is for this bot
  if (!match[1] || match[1] === `@${botInfo.username}`) {
    if (isStarted) {
      timeout = -1;
      bot.sendMessage(msg.chat.id, "<b>Реєстрацію на гру зупинено</b>", {
        parse_mode: "HTML",
      }).catch(error => {
        console.error("Error sending stop message:", error.message);
      });
      bot.deleteMessage(msg.chat.id, msg.message_id).catch(error => {
        console.error("Error deleting stop command:", error.message);
      });
      isStarted = false;
    } else {
      bot.sendMessage(msg.chat.id, `Цю команду є сенс використовувати після використання команди /start@${botInfo.username}`);
    }
  }
});

bot.onText(/^\/extend(@\w+)?$/, (msg, match) => {
  if (!botInfo) {
    console.error('Bot info not initialized');
    return;
  }

  // Check if the command is for this bot
  if (!match[1] || match[1] === `@${botInfo.username}`) {
    if (!isStarted) {
      bot.sendMessage(
        msg.chat.id,
        `Перш ніж використати цю команду, почніть реєстрацію на гру за допомогою команди: /start@${botInfo.username}`
      );
      return;
    }

    timeout += 30;
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
    ).catch(error => {
      console.error("Error sending extend message:", error.message);
    });
    
    bot.deleteMessage(msg.chat.id, msg.message_id).catch(error => {
      console.error("Error deleting extend command:", error.message);
    });
  }
});

bot.on("callback_query", (callbackQuery) => {
  const user = callbackQuery.from;

  if (callbackQuery.data === "join_game") {
    const username = user.username || "";
    const fullName = `${user.first_name} ${user.last_name || ""}`.trim() || user.username;

    if (!players.find((player) => player.id === user.id)) {
      players.push({ 
        id: user.id, 
        name: fullName,
        username: username
      });
      bot.answerCallbackQuery(callbackQuery.id).catch(error => {
        console.error("Error answering callback query:", error.message);
      });
    }
  }
});