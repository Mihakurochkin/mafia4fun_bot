const { bot, botInfo } = require('../config/bot');
const { players, timeout, isStarted, isNight, gameChatId } = require('../utils/gameState');
const { assignRoles } = require('../utils/roles');
const { checkBotRights, getMissingRightsMessage } = require('../utils/rights');
const { generateBotMessage } = require('../utils/gemini');

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
    const chat = await bot.getChat(chatId);
    if (chat.pinned_message) {
      await bot.unpinAllChatMessages(chatId);
    }
  } catch (error) {
    console.error("Error unpinning messages:", error.message);
  }
}

async function startGameRegistration(msg) {
  if (isStarted) {
    console.log('Game already started, generating error message...');
    const message = await generateBotMessage('error', { type: 'registration_already_started' });
    console.log('Generated error message:', message);
    bot.sendMessage(msg.chat.id, message);
    return;
  }

  if (isNight) {
    console.log('Night time, generating error message...');
    const message = await generateBotMessage('error', { type: 'night_time' });
    console.log('Generated night error message:', message);
    bot.sendMessage(msg.chat.id, message);
    return;
  }

  const { hasRights, missingRights } = await checkBotRights(msg.chat.id);
  if (!hasRights) {
    bot.sendMessage(msg.chat.id, getMissingRightsMessage(missingRights));
    return;
  }

  isStarted = true;
  timeout = 30;

  console.log('Starting game registration, generating initial message...');
  const initialMessage = await generateBotMessage('gameStart', { timeout });
  console.log('Generated initial message:', initialMessage);

  const registrationMessage = await bot.sendMessage(
    msg.chat.id,
    initialMessage,
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
        const message = await generateBotMessage('error', { type: 'not_enough_players' });
        bot.sendMessage(msg.chat.id, message);
        await unpinAllBotMessages(msg.chat.id);
        return;
      }

      await unpinAllBotMessages(msg.chat.id);

      const mafiaCount = Math.floor(players.length / 4);
      const message = await generateBotMessage('gameStart', {
        playersCount: players.length,
        mafiaCount: mafiaCount,
        peacefulCount: players.length - mafiaCount
      });

      bot.sendMessage(msg.chat.id, message, { parse_mode: "HTML" });

      assignRoles(players);
      for (const player of players) {
        const roleMessage = await generateBotMessage('roleAssignment', {
          role: player.role,
          otherMafia: players
            .filter(p => p.role === 'mafia' && p.id !== player.id)
            .map(p => p.name)
            .join(', ')
        });

        let actionButtons = [];
        if (player.role === 'mafia') {
          actionButtons = createPlayerButtons(players, player.id, 'mafia_kill');
        } else if (player.role === 'doctor') {
          actionButtons = createPlayerButtons(players, player.id, 'doctor_heal');
        } else if (player.role === 'commissioner') {
          actionButtons = createPlayerButtons(players, player.id, 'commissioner_check');
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
        const message = await generateBotMessage('gameStart', { timeout });
        bot.editMessageText(message, {
          chat_id: msg.chat.id,
          message_id: registrationMessage.message_id,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "Приєднатися до гри", callback_data: "join_game" }]
            ]
          }
        });
      }
    }
  }, 1000);
}

module.exports = {
  startGameRegistration
}; 