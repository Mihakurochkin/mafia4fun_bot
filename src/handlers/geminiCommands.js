const { bot } = require('../config/bot');
const { getGeminiResponse } = require('../utils/gemini');

function setupGeminiCommands() {
  bot.onText(/^\/ask (.+)$/, async (msg, match) => {
    const prompt = match[1];
    const response = await getGeminiResponse(prompt);
    
    if (response) {
      bot.sendMessage(msg.chat.id, response, {
        parse_mode: "HTML"
      });
    } else {
      bot.sendMessage(msg.chat.id, "Вибачте, не вдалося отримати відповідь. Спробуйте пізніше.");
    }
  });

  bot.onText(/^\/fact$/, async (msg) => {
    const prompt = "Розкажи цікавий факт про розробку ігор українською мовою.";
    const response = await getGeminiResponse(prompt);
    
    if (response) {
      bot.sendMessage(msg.chat.id, response, {
        parse_mode: "HTML"
      });
    } else {
      bot.sendMessage(msg.chat.id, "Вибачте, не вдалося отримати факт. Спробуйте пізніше.");
    }
  });
}

module.exports = {
  setupGeminiCommands
}; 