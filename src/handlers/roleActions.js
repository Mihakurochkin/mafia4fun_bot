const { bot } = require('../config/bot');
const { players, isNight, gameChatId } = require('../utils/gameState');

let nightActions = new Map();
let isTestMode = false;

function setupRoleActions() {
  console.log('Setting up role actions...');
  
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

function sendRoleActionMessages() {
  console.log('Sending role action messages...');
  console.log('Current players:', players);
  
  if (isTestMode) {
    console.log('In test mode');
    const testPlayer = players[0];
    if (!testPlayer) {
      console.log('No test player found');
      return;
    }

    const message = '🌙 Ніч настала. Тестовий режим:\n\n' +
      '1. Мафія: Оберіть жертву\n' +
      '2. Лікар: Оберіть кого врятувати\n' +
      '3. Комісар: Перевірте роль';

    const buttons = players
      .filter(p => p.isAlive)
      .map(p => [{
        text: `${p.name} (${p.role})`,
        callback_data: `mafia_kill_${p.id}`
      }, {
        text: `Врятувати ${p.name}`,
        callback_data: `doctor_heal_${p.id}`
      }, {
        text: `Перевірити ${p.name}`,
        callback_data: `commissioner_check_${p.id}`
      }]);

    buttons.push([{
      text: isTestMode ? '🔴 Вимкнути тестовий режим' : '🟢 Увімкнути тестовий режим',
      callback_data: 'test_mode'
    }]);

    console.log('Sending test mode message to:', testPlayer.id);
    bot.sendMessage(testPlayer.id, message, {
      reply_markup: {
        inline_keyboard: buttons
      }
    }).catch(error => {
      console.error('Error sending test mode message:', error);
    });
    return;
  }

  players.forEach(player => {
    if (!player.isAlive) return;

    let actionButtons = [];
    switch(player.role) {
      case 'mafia':
        actionButtons = players
          .filter(p => p.id !== player.id && p.isAlive)
          .map(p => [{
            text: p.name,
            callback_data: `mafia_kill_${p.id}`
          }]);
        break;
      case 'doctor':
        actionButtons = players
          .filter(p => p.id !== player.id && p.isAlive)
          .map(p => [{
            text: p.name,
            callback_data: `doctor_heal_${p.id}`
          }]);
        break;
      case 'commissioner':
        actionButtons = players
          .filter(p => p.id !== player.id && p.isAlive)
          .map(p => [{
            text: p.name,
            callback_data: `commissioner_check_${p.id}`
          }]);
        break;
    }

    if (actionButtons.length > 0) {
      bot.sendMessage(player.id, "🌙 Настала ніч. Виконайте свою дію:", {
        reply_markup: {
          inline_keyboard: actionButtons
        }
      });
    }
  });
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
  processNightActions
}; 