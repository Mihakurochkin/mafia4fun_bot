const { bot, botInfo } = require('../config/bot');
const { players, timeout, isStarted, isNight, gameChatId } = require('../utils/gameState');
const { assignRoles } = require('../utils/roles');
const { checkBotRights, getMissingRightsMessage } = require('../utils/rights');

function createPlayerButtons(players, currentPlayerId, action) {
  return players
    .filter(player => player.id !== currentPlayerId && player.isAlive)
    .map(player => [{
      text: player.name,
      callback_data: `${action}_${player.id}`
    }]);
}

async function unpinAllBotMessages(chatId) {
  try {
    // Get all pinned messages
    const chat = await bot.getChat(chatId);
    if (chat.pinned_message) {
      // Unpin all messages
      await bot.unpinAllChatMessages(chatId);
    }
  } catch (error) {
    console.error("Error unpinning messages:", error.message);
  }
}

async function startGameRegistration(msg) {
  if (isStarted) {
    bot.sendMessage(msg.chat.id, "Реєстрація на гру вже почалась");
    return;
  }

  if (isNight) {
    bot.sendMessage(msg.chat.id, "Зараз ніч, почекайте до ранку");
    return;
  }

  const { hasRights, missingRights } = await checkBotRights(msg.chat.id);
  if (!hasRights) {
    bot.sendMessage(msg.chat.id, getMissingRightsMessage(missingRights));
    return;
  }

  isStarted = true;
  timeout = 30;

  const registrationMessage = await bot.sendMessage(
    msg.chat.id,
    "🎮 <b>Реєстрація на гру в Мафію</b>\n\n" +
    "Натисніть кнопку нижче, щоб приєднатися до гри.\n" +
    "Реєстрація триватиме 30 секунд.",
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "Приєднатися до гри", callback_data: "join_game" }]
        ]
      }
    }
  );

  try {
    await bot.pinChatMessage(msg.chat.id, registrationMessage.message_id);
  } catch (error) {
    console.error("Error pinning registration message:", error.message);
  }

  const countdownInterval = setInterval(async () => {
    if (timeout <= 0) {
      clearInterval(countdownInterval);
      if (players.length < 4) {
        isStarted = false;
        bot.sendMessage(msg.chat.id, "Недостатньо гравців для початку гри. Мінімум 4 гравці.");
        await unpinAllBotMessages(msg.chat.id);
        return;
      }

      await unpinAllBotMessages(msg.chat.id);

      const mafiaCount = Math.floor(players.length / 4);
      const message = "🎮 <b>Гра почалась!</b>\n\n" +
        "Кількість гравців: " + players.length + "\n" +
        "Розподіл ролей:\n" +
        "👥 Мирні: " + (players.length - mafiaCount) + "\n" +
        "🕵️‍♂️ Мафія: " + mafiaCount + "\n\n" +
        "Перевірте свої ролі в приватних повідомленнях.";

      bot.sendMessage(msg.chat.id, message, { parse_mode: "HTML" });

      assignRoles(players);
      for (const player of players) {
        let roleMessage = '';
        let actionButtons = [];

        switch(player.role) {
          case 'mafia':
            roleMessage = `🕵️‍♂️ Ви - Мафія!\n\n` +
              `Ваше завдання - усувати мирних жителів по черзі.\n` +
              `Ви знаєте інших мафіозів: ${players
                .filter(p => p.role === 'mafia' && p.id !== player.id)
                .map(p => p.name)
                .join(', ')}`;
            actionButtons = createPlayerButtons(players, player.id, 'mafia_kill');
            break;
          case 'doctor':
            roleMessage = `👨‍⚕️ Ви - Лікар!\n\n` +
              `Ваше завдання - рятувати гравців від мафії.\n` +
              `Кожну ніч ви можете вибрати одного гравця для порятунку.`;
            actionButtons = createPlayerButtons(players, player.id, 'doctor_heal');
            break;
          case 'commissioner':
            roleMessage = `👮 Ви - Комісар!\n\n` +
              `Ваше завдання - викривати мафію.\n` +
              `Кожну ніч ви можете перевірити роль одного гравця.`;
            actionButtons = createPlayerButtons(players, player.id, 'commissioner_check');
            break;
          case 'peaceful':
            roleMessage = `👨‍🌾 Ви - Мирний житель!\n\n` +
              `Ваше завдання - знайти та усунути мафію.\n` +
              `Обговорюйте та голосуйте разом з іншими гравцями.`;
            break;
        }

        bot.sendMessage(player.id, roleMessage, {
          parse_mode: "HTML",
          reply_markup: actionButtons.length > 0 ? {
            inline_keyboard: actionButtons
          } : undefined
        });
      }
    } else {
      timeout--;
      if (timeout % 5 === 0) {
        bot.editMessageText(
          "🎮 <b>Реєстрація на гру в Мафію</b>\n\n" +
          "Натисніть кнопку нижче, щоб приєднатися до гри.\n" +
          "До кінця реєстрації: " + timeout + " секунд",
          {
            chat_id: msg.chat.id,
            message_id: registrationMessage.message_id,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "Приєднатися до гри", callback_data: "join_game" }]
              ]
            }
          }
        );
      }
    }
  }, 1000);
}

module.exports = {
  startGameRegistration
}; 