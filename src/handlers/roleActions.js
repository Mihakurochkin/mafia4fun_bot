const { bot } = require('../config/bot');
const { players, isNight, gameChatId } = require('../utils/gameState');
const { generateBotMessage } = require('../utils/gemini');

let nightActions = new Map();
let isTestMode = false;

function setupRoleActions() {
  bot.on("callback_query", async (callbackQuery) => {
    const [action, targetId] = callbackQuery.data.split('_');
    const userId = callbackQuery.from.id;
    
    if (!isNight) {
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Ці дії можна виконувати тільки вночі!",
        show_alert: true
      });
      return;
    }

    const player = players.find(p => p.id === userId);
    if (!player || !player.isAlive) {
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Ви не можете виконувати дії!",
        show_alert: true
      });
      return;
    }

    const target = players.find(p => p.id === parseInt(targetId));
    if (!target || !target.isAlive) {
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Цей гравець не може бути обраний!",
        show_alert: true
      });
      return;
    }

    switch(action) {
      case 'mafia_kill':
        if (player.role !== 'mafia') {
          bot.answerCallbackQuery(callbackQuery.id, {
            text: "Тільки мафія може виконувати цю дію!",
            show_alert: true
          });
          return;
        }
        nightActions.set('kill', targetId);
        bot.answerCallbackQuery(callbackQuery.id, {
          text: `Ви обрали ${target.name} для вбивства`,
          show_alert: true
        });
        break;

      case 'doctor_heal':
        if (player.role !== 'doctor') {
          bot.answerCallbackQuery(callbackQuery.id, {
            text: "Тільки лікар може виконувати цю дію!",
            show_alert: true
          });
          return;
        }
        nightActions.set('heal', targetId);
        bot.answerCallbackQuery(callbackQuery.id, {
          text: `Ви обрали ${target.name} для порятунку`,
          show_alert: true
        });
        break;

      case 'commissioner_check':
        if (player.role !== 'commissioner') {
          bot.answerCallbackQuery(callbackQuery.id, {
            text: "Тільки комісар може виконувати цю дію!",
            show_alert: true
          });
          return;
        }
        nightActions.set('check', targetId);
        bot.answerCallbackQuery(callbackQuery.id, {
          text: `Ви перевіряєте ${target.name}`,
          show_alert: true
        });
        break;

      case 'test_mode':
        isTestMode = !isTestMode;
        bot.sendMessage(userId, `Тестовий режим ${isTestMode ? 'увімкнено' : 'вимкнено'}`);
        break;
    }
  });
}

async function sendRoleActionMessages() {
  if (!isNight) return;

  for (const player of players) {
    if (!player.isAlive) continue;

    let actionButtons = [];
    if (player.role === 'mafia') {
      actionButtons = createPlayerButtons(players, player.id, 'mafia_kill');
    } else if (player.role === 'doctor') {
      actionButtons = createPlayerButtons(players, player.id, 'doctor_heal');
    } else if (player.role === 'commissioner') {
      actionButtons = createPlayerButtons(players, player.id, 'commissioner_check');
    }

    if (actionButtons.length > 0) {
      const message = await generateBotMessage('roleAction', { role: player.role });
      bot.sendMessage(player.id, message, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: actionButtons
        }
      });
    }
  }
}

function createPlayerButtons(players, currentPlayerId, action) {
  return players
    .filter(player => player.id !== currentPlayerId && player.isAlive)
    .map(player => [{
      text: player.name,
      callback_data: `${action}_${player.id}`
    }]);
}

async function handleRoleAction(callbackQuery) {
  const [action, targetId] = callbackQuery.data.split('_');
  const player = players.find(p => p.id === callbackQuery.from.id);
  const target = players.find(p => p.id === parseInt(targetId));

  if (!player || !target || !isNight) {
    bot.answerCallbackQuery(callbackQuery.id, {
      text: "Ця дія недоступна",
      show_alert: true
    });
    return;
  }

  let message;
  switch (action) {
    case 'mafia_kill':
      if (player.role !== 'mafia') {
        message = await generateBotMessage('error', { type: 'not_mafia' });
      } else {
        target.isAlive = false;
        message = await generateBotMessage('playerDeath', { 
          playerName: target.name,
          role: target.role
        });
      }
      break;

    case 'doctor_heal':
      if (player.role !== 'doctor') {
        message = await generateBotMessage('error', { type: 'not_doctor' });
      } else {
        message = await generateBotMessage('doctorHeal', { playerName: target.name });
      }
      break;

    case 'commissioner_check':
      if (player.role !== 'commissioner') {
        message = await generateBotMessage('error', { type: 'not_commissioner' });
      } else {
        const isMafia = target.role === 'mafia';
        message = await generateBotMessage('commissionerCheck', { 
          playerName: target.name,
          isMafia: isMafia
        });
      }
      break;
  }

  if (message) {
    bot.sendMessage(player.id, message, { parse_mode: "HTML" });
  }

  bot.answerCallbackQuery(callbackQuery.id);
}

function processNightActions() {
  const killTarget = nightActions.get('kill');
  const healTarget = nightActions.get('heal');
  const checkTarget = nightActions.get('check');

  if (killTarget && killTarget !== healTarget) {
    const target = players.find(p => p.id === parseInt(killTarget));
    if (target) {
      target.isAlive = false;
      bot.sendMessage(gameChatId, `🌅 Настає ранок...\n\n😢 ${target.name} був вбитий мафією.`);
    }
  } else {
    bot.sendMessage(gameChatId, '🌅 Настає ранок...\n\n😌 Ніхто не помер цієї ночі.');
  }

  if (checkTarget) {
    const target = players.find(p => p.id === parseInt(checkTarget));
    const commissioner = players.find(p => p.role === 'commissioner');
    if (target && commissioner) {
      bot.sendMessage(commissioner.id, 
        `🔍 Результат перевірки ${target.name}: ${target.role === 'mafia' ? '🕵️‍♂️ Мафія' : '👨‍🌾 Мирний'}`
      );
    }
  }

  nightActions.clear();
  isTestMode = false;
}

module.exports = {
  setupRoleActions,
  sendRoleActionMessages,
  processNightActions,
  handleRoleAction
}; 