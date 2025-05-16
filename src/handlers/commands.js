const { bot, botInfo } = require('../config/bot');
const { players, isStarted, timeout, isNight, gameChatId } = require('../utils/gameState');
const { startGameRegistration } = require('./registration');
const { sendRoleActionMessages } = require('./roleActions');

function setupCommandHandlers() {
  bot.onText(/^\/start(@\w+)?$/, (msg, match) => {
    if (!botInfo) return;
    
    if (!match[1] || match[1] === `@${botInfo.username}`) {
      startGameRegistration(msg);
    }
  });

  bot.onText(/^старт$/, (msg) => {
    startGameRegistration(msg);
  });

  bot.onText(/^\/stop(@\w+)?$/, (msg, match) => {
    if (!botInfo) return;

    if (!match[1] || match[1] === `@${botInfo.username}`) {
      if (isStarted) {
        timeout = -1;
        bot.sendMessage(msg.chat.id, "<b>Реєстрацію на гру зупинено</b>", {
          parse_mode: "HTML",
        });
        bot.deleteMessage(msg.chat.id, msg.message_id);
        isStarted = false;
      } else {
        bot.sendMessage(msg.chat.id, `Цю команду є сенс використовувати після використання команди /start@${botInfo.username}`);
      }
    }
  });

  bot.onText(/^\/extend(@\w+)?$/, (msg, match) => {
    if (!botInfo) return;

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
        `До часу реєстрації додано 30 секунд. До кінця реєстрації: ${timeout} секунд`
      );
      
      bot.deleteMessage(msg.chat.id, msg.message_id);
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
        bot.answerCallbackQuery(callbackQuery.id);
      }
    }
  });
}

module.exports = {
  setupCommandHandlers
}; 