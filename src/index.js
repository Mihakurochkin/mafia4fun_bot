const { bot, botInfo, commands } = require('./config/bot');
const { isNight, gameChatId } = require('./utils/gameState');
const { checkBotRights, getMissingRightsMessage } = require('./utils/rights');
const { setupCommandHandlers } = require('./handlers/commands');
const { setupRoleActions } = require('./handlers/roleActions');
const { setupAutoResponses } = require('./handlers/autoResponses');

bot.setMyCommands(commands).then(() => {
  console.log('Bot commands set successfully');
}).catch(error => {
  console.error('Error setting bot commands:', error);
});

bot.on("message", async (msg) => {
  if (isNight && msg.chat.id === gameChatId && !msg.from.is_bot) {
    bot.deleteMessage(msg.chat.id, msg.message_id).catch(error => {
      console.error("Error deleting night message:", error.message);
    });
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

setupCommandHandlers();
setupRoleActions();
setupAutoResponses(); 