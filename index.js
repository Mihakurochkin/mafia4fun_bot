require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { generateBotMessage } = require('./src/utils/gemini');
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
  { command: "/error", description: "показати повідомлення про помилку" },
  { command: "/welcome", description: "показати привітання" },
  { command: "/gamestart", description: "показати повідомлення про початок гри" },
  { command: "/gameend", description: "показати повідомлення про кінець гри" },
  { command: "/nightstart", description: "показати повідомлення про початок ночі" },
  { command: "/daystart", description: "показати повідомлення про початок дня" },
  { command: "/role", description: "показати повідомлення про призначення ролі" },
  { command: "/votestart", description: "показати повідомлення про початок голосування" },
  { command: "/voteend", description: "показати повідомлення про кінець голосування" },
  { command: "/death", description: "показати повідомлення про смерть гравця" },
  { command: "/win", description: "показати повідомлення про перемогу" },
  { command: "/action", description: "показати повідомлення про дію ролі" },
  { command: "/heal", description: "показати повідомлення про лікування" },
  { command: "/check", description: "показати повідомлення про перевірку ролі" }
];

bot.setMyCommands(commands).catch(error => {
  console.error('Error setting bot commands:', error);
});

const players = [];
const groupRights = new Map();
let timeout = 60;
let isStarted = false;
let isNight = false;
let gameChatId = null;
const warningCooldowns = new Map();

function assignRoles(players) {
  const roles = [];
  const mafiaCount = Math.floor(players.length / 4);
  
  for (let i = 0; i < mafiaCount; i++) {
    roles.push('mafia');
  }
  roles.push('doctor');
  roles.push('commissioner');
  while (roles.length < players.length) {
    roles.push('peaceful');
  }
  
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  
  return players.map((player, index) => ({
    ...player,
    role: roles[index]
  }));
}

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
  gameChatId = msg.chat.id;

  checkBotRights(msg.chat.id).then(async ({ hasRights, missingRights }) => {
    if (hasRights) {
      let registrationMessage = null;
      let lastMessageText = "";

      const sendRegistrationMessage = () => {
        const messageText = `<b>Реєстрація на гру почалась</b>\n\n` +
          `⏱ Час до кінця: ${timeout} секунд\n` +
          `👥 Зареєстровані гравці (${players.length}):\n` +
          players.map((player, index) => {
            return `${index + 1}. <a href="tg://user?id=${player.id}">${player.name}</a>`;
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
              bot.pinChatMessage(msg.chat.id, message.message_id).catch(error => {
                console.error("Error pinning registration message:", error.message);
              });
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

      const intervalId = setInterval(async () => {
        if (timeout === -1) {
          clearInterval(intervalId);
          return;
        }
        
        if (timeout === 0) {
          if (players.length < 1) {
            const messageText = `<b>Реєстрацію зупинено</b>\n\n` +
              `❌ Недостатньо гравців для початку гри.\n` +
              `👥 Зареєстровано: ${players.length}/1\n\n` +
              `Спробуйте розпочати реєстрацію знову.`;

            bot.editMessageText(messageText, {
              chat_id: msg.chat.id,
              message_id: registrationMessage.message_id,
              parse_mode: "HTML",
            }).catch(error => {
              console.error("Error sending insufficient players message:", error.message);
            });

            isStarted = false;
            clearInterval(intervalId);
            return;
          }

          bot.sendMessage(msg.chat.id, 
            `✅ Реєстрація успішно завершена!\n` +
            `👥 Кількість гравців: ${players.length}\n` +
            `🎮 Гра починається...`,
            { parse_mode: "HTML" }
          ).catch(error => {
            console.error("Error sending registration success message:", error.message);
          });

          const mafiaCount = Math.floor(players.length / 4);
          const messageText = `<b>Гра починається!</b>\n\n` +
            `👥 Розподіл ролей:\n` +
            `- Мафіози: ${mafiaCount}\n` +
            `- Доктор: 1\n` +
            `- Комісар: 1\n` +
            `- Мирні жителі: ${players.length - mafiaCount - 2}\n\n` +
            `🌙 Настала ніч. Всі засинають...\n\n` +
            `📱 Перевірте свої ролі в приватних повідомленнях.\n\n` +
            `👥 Живі гравці (${players.length}):\n` +
            players.map((player, index) => {
              return `${index + 1}. <a href="tg://user?id=${player.id}">${player.name}</a>`;
            }).join('\n');

          bot.editMessageText(messageText, {
            chat_id: msg.chat.id,
            message_id: registrationMessage.message_id,
            parse_mode: "HTML",
          }).catch(error => {
            console.error("Error sending game start message:", error.message);
          });

          const playersWithRoles = assignRoles(players);
          const sendRoleMessages = async () => {
            for (const player of playersWithRoles) {
              let roleMessage = '';
              const otherMafia = playersWithRoles
                .filter(p => p.role === 'mafia' && p.id !== player.id)
                .map(p => p.name)
                .join(', ');

              switch(player.role) {
                case 'mafia':
                  roleMessage = await generateBotMessage('roleAssignment', {
                    role: 'mafia',
                    otherMafia
                  });
                  break;
                case 'doctor':
                  roleMessage = await generateBotMessage('roleAssignment', {
                    role: 'doctor'
                  });
                  break;
                case 'commissioner':
                  roleMessage = await generateBotMessage('roleAssignment', {
                    role: 'commissioner'
                  });
                  break;
                case 'peaceful':
                  roleMessage = await generateBotMessage('roleAssignment', {
                    role: 'peaceful'
                  });
                  break;
              }

              bot.sendMessage(
                player.id,
                roleMessage,
                { parse_mode: "HTML" }
              ).catch(error => {
                console.error(`Error sending role message to ${player.name}:`, error.message);
              });
            }
          };

          await sendRoleMessages();

          isStarted = false;
          isNight = true;
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

bot.on("message", async (msg) => {
  if (isNight && msg.chat.id === gameChatId && !msg.from.is_bot) {
    const userId = msg.from.id;
    const lastWarning = warningCooldowns.get(userId) || 0;
    const now = Date.now();
    
    bot.deleteMessage(msg.chat.id, msg.message_id).catch(error => {
      console.error("Error deleting night message:", error.message);
    });
    
    if (now - lastWarning > 30000) {
      bot.sendMessage(
        msg.chat.id,
        "⚠️ Під час ночі заборонено писати повідомлення в чат!",
        { reply_to_message_id: msg.message_id }
      ).catch(error => {
        console.error("Error sending night warning:", error.message);
      });
      
      warningCooldowns.set(userId, now);
    }
  }
});

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

bot.onText(/^\/start(@\w+)?$/, (msg, match) => {
  if (!botInfo) {
    console.error('Bot info not initialized');
    return;
  }
  
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

bot.onText(/^\/error(@\w+)?$/, async (msg, match) => {
  if (!botInfo || (match[1] && match[1] !== `@${botInfo.username}`)) return;
  const message = await generateBotMessage('error', { type: 'registration_already_started' });
  bot.sendMessage(msg.chat.id, message);
});

bot.onText(/^\/welcome(@\w+)?$/, async (msg, match) => {
  if (!botInfo || (match[1] && match[1] !== `@${botInfo.username}`)) return;
  const message = await generateBotMessage('welcome');
  bot.sendMessage(msg.chat.id, message);
});

bot.onText(/^\/gamestart(@\w+)?$/, async (msg, match) => {
  if (!botInfo || (match[1] && match[1] !== `@${botInfo.username}`)) return;
  const message = await generateBotMessage('gameStart', { timeout: 30 });
  bot.sendMessage(msg.chat.id, message);
});

bot.onText(/^\/gameend(@\w+)?$/, async (msg, match) => {
  if (!botInfo || (match[1] && match[1] !== `@${botInfo.username}`)) return;
  const message = await generateBotMessage('gameEnd');
  bot.sendMessage(msg.chat.id, message);
});

bot.onText(/^\/nightstart(@\w+)?$/, async (msg, match) => {
  if (!botInfo || (match[1] && match[1] !== `@${botInfo.username}`)) return;
  const message = await generateBotMessage('nightStart');
  bot.sendMessage(msg.chat.id, message);
});

bot.onText(/^\/daystart(@\w+)?$/, async (msg, match) => {
  if (!botInfo || (match[1] && match[1] !== `@${botInfo.username}`)) return;
  const message = await generateBotMessage('dayStart');
  bot.sendMessage(msg.chat.id, message);
});

bot.onText(/^\/role(@\w+)?$/, async (msg, match) => {
  if (!botInfo || (match[1] && match[1] !== `@${botInfo.username}`)) return;
  const message = await generateBotMessage('roleAssignment', { role: 'mafia', otherMafia: 'Player1, Player2' });
  bot.sendMessage(msg.chat.id, message);
});

bot.onText(/^\/votestart(@\w+)?$/, async (msg, match) => {
  if (!botInfo || (match[1] && match[1] !== `@${botInfo.username}`)) return;
  const message = await generateBotMessage('voteStart');
  bot.sendMessage(msg.chat.id, message);
});

bot.onText(/^\/voteend(@\w+)?$/, async (msg, match) => {
  if (!botInfo || (match[1] && match[1] !== `@${botInfo.username}`)) return;
  const message = await generateBotMessage('voteEnd');
  bot.sendMessage(msg.chat.id, message);
});

bot.onText(/^\/death(@\w+)?$/, async (msg, match) => {
  if (!botInfo || (match[1] && match[1] !== `@${botInfo.username}`)) return;
  const message = await generateBotMessage('playerDeath');
  bot.sendMessage(msg.chat.id, message);
});

bot.onText(/^\/win(@\w+)?$/, async (msg, match) => {
  if (!botInfo || (match[1] && match[1] !== `@${botInfo.username}`)) return;
  const message = await generateBotMessage('gameWin');
  bot.sendMessage(msg.chat.id, message);
});

bot.onText(/^\/action(@\w+)?$/, async (msg, match) => {
  if (!botInfo || (match[1] && match[1] !== `@${botInfo.username}`)) return;
  const message = await generateBotMessage('roleAction', { role: 'mafia' });
  bot.sendMessage(msg.chat.id, message);
});

bot.onText(/^\/heal(@\w+)?$/, async (msg, match) => {
  if (!botInfo || (match[1] && match[1] !== `@${botInfo.username}`)) return;
  const message = await generateBotMessage('doctorHeal', { playerName: 'Player1' });
  bot.sendMessage(msg.chat.id, message);
});

bot.onText(/^\/check(@\w+)?$/, async (msg, match) => {
  if (!botInfo || (match[1] && match[1] !== `@${botInfo.username}`)) return;
  const message = await generateBotMessage('commissionerCheck', { playerName: 'Player1', isMafia: true });
  bot.sendMessage(msg.chat.id, message);
});