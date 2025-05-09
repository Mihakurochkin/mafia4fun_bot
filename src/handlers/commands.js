const { bot, botInfo } = require('../config/bot');
const { players, isStarted, timeout } = require('../utils/gameState');
const { startGameRegistration } = require('./registration');

function setupCommandHandlers() {
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
}

module.exports = {
  setupCommandHandlers
}; 