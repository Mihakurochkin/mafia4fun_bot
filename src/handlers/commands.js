const { bot, botInfo } = require('../config/bot');
const { players, isStarted, timeout } = require('../utils/gameState');
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

  bot.onText(/^\/test$/, (msg) => {
    if (isStarted) {
      bot.sendMessage(msg.chat.id, "Спочатку завершіть поточну гру командою /stop");
      return;
    }

    players.length = 0;
    
    players.push(
      { 
        id: msg.from.id, 
        name: msg.from.first_name,
        username: msg.from.username || "",
        role: 'mafia',
        isAlive: true
      },
      {
        id: 123456789,
        name: "Test Doctor",
        username: "test_doctor",
        role: 'doctor',
        isAlive: true
      },
      {
        id: 987654321,
        name: "Test Commissioner",
        username: "test_commissioner",
        role: 'commissioner',
        isAlive: true
      },
      {
        id: 111222333,
        name: "Test Citizen",
        username: "test_citizen",
        role: 'peaceful',
        isAlive: true
      }
    );

    bot.sendMessage(msg.chat.id, "🔄 Тестовий режим увімкнено\n\n" +
      "Додані тестові гравці:\n" +
      "1. Ви (мафія)\n" +
      "2. Test Doctor (лікар)\n" +
      "3. Test Commissioner (комісар)\n" +
      "4. Test Citizen (мирний)\n\n" +
      "Перевірте приватні повідомлення для тестування ролей."
    ).then(() => {
      sendRoleActionMessages();
    });
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