const { bot, botInfo } = require('./config/bot');
const { isNight, gameChatId, warningCooldowns } = require('./utils/gameState');
const { checkBotRights, getMissingRightsMessage } = require('./utils/rights');
const { setupCommandHandlers } = require('./handlers/commands');

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

setupCommandHandlers(); 