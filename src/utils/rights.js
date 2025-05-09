const { botInfo } = require('../config/bot');
const { groupRights } = require('./gameState');

async function checkBotRights(chatId) {
  if (!botInfo) {
    console.error('Bot info not initialized');
    return { hasRights: false, missingRights: ["помилка ініціалізації бота"] };
  }

  try {
    const chatMember = await bot.getChatMember(chatId, botInfo.id);
    const hasAllRights = chatMember.status === "administrator" && 
                        chatMember.can_delete_messages && 
                        chatMember.can_restrict_members && 
                        chatMember.can_pin_messages;
    
    const missingRights = [];
    if (chatMember.status !== "administrator") {
      missingRights.push("адміністратор");
    } else {
      if (!chatMember.can_delete_messages) missingRights.push("видалення повідомлень");
      if (!chatMember.can_restrict_members) missingRights.push("обмеження учасників");
      if (!chatMember.can_pin_messages) missingRights.push("закріплення повідомлень");
    }
    
    groupRights.set(chatId, {
      hasRights: hasAllRights,
      missingRights: missingRights
    });
    
    return { hasRights: hasAllRights, missingRights };
  } catch (error) {
    console.error(`Error checking rights for chat ${chatId}:`, error.message);
    groupRights.set(chatId, {
      hasRights: false,
      missingRights: ["невідомі права (помилка перевірки)"]
    });
    return { hasRights: false, missingRights: ["невідомі права (помилка перевірки)"] };
  }
}

function hasRights(chatId) {
  const rights = groupRights.get(chatId);
  return rights ? rights.hasRights : false;
}

function getMissingRightsMessage(missingRights) {
  if (!missingRights || missingRights.length === 0) return "";
  return `\n\nВідсутні права:\n${missingRights.map(right => `- ${right}`).join('\n')}`;
}

module.exports = {
  checkBotRights,
  hasRights,
  getMissingRightsMessage
}; 