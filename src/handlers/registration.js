const { bot, botInfo } = require('../config/bot');
const { players, timeout, isStarted, isNight, gameChatId, assignRoles } = require('../utils/gameState');
const { checkBotRights, getMissingRightsMessage } = require('../utils/rights');

function startGameRegistration(msg) {
  if (isStarted) {
    bot.sendMessage(msg.chat.id, "Реєстрація вже почалась!");
    return;
  }

  timeout = 60;
  isStarted = true;
  gameChatId = msg.chat.id;

  checkBotRights(msg.chat.id).then(({ hasRights, missingRights }) => {
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

      const intervalId = setInterval(() => {
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
          playersWithRoles.forEach(player => {
            let roleMessage = '';
            switch(player.role) {
              case 'mafia':
                roleMessage = `🎭 Ви - Мафія!\n\n` +
                  `Ваше завдання - усувати мирних жителів по черзі.\n` +
                  `Ви знаєте інших мафіозів: ${playersWithRoles
                    .filter(p => p.role === 'mafia' && p.id !== player.id)
                    .map(p => p.name)
                    .join(', ')}`;
                break;
              case 'doctor':
                roleMessage = `👨‍⚕️ Ви - Лікар!\n\n` +
                  `Ваше завдання - рятувати гравців від мафії.\n` +
                  `Кожну ніч ви можете вибрати одного гравця для порятунку.`;
                break;
              case 'commissioner':
                roleMessage = `👮 Ви - Комісар!\n\n` +
                  `Ваше завдання - викривати мафію.\n` +
                  `Кожну ніч ви можете перевірити роль одного гравця.`;
                break;
              case 'peaceful':
                roleMessage = `👨‍🌾 Ви - Мирний житель!\n\n` +
                  `Ваше завдання - знайти та усунути мафію.\n` +
                  `Обговорюйте та голосуйте разом з іншими гравцями.`;
                break;
            }

            bot.sendMessage(
              player.id,
              roleMessage,
              { parse_mode: "HTML" }
            ).catch(error => {
              console.error(`Error sending role message to ${player.name}:`, error.message);
            });
          });

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

module.exports = {
  startGameRegistration
}; 