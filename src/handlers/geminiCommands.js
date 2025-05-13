const { bot } = require('../config/bot');
const { getGeminiResponse, getGameResponse, generateBotMessage } = require('../utils/gemini');

function setupGeminiCommands() {
  bot.onText(/^\/ask (.+)$/, async (msg, match) => {
    const prompt = match[1];
    const response = await getGeminiResponse(prompt);
    
    if (response) {
      bot.sendMessage(msg.chat.id, response, {
        parse_mode: "HTML"
      });
    } else {
      const errorMessage = await generateBotMessage('error');
      bot.sendMessage(msg.chat.id, errorMessage || "😔 Вибачте, не вдалося отримати відповідь. Спробуйте пізніше.");
    }
  });

  bot.onText(/^\/fact$/, async (msg) => {
    const prompt = "Розкажи цікавий факт про розробку ігор";
    const response = await getGeminiResponse(prompt);
    
    if (response) {
      bot.sendMessage(msg.chat.id, response, {
        parse_mode: "HTML"
      });
    } else {
      const errorMessage = await generateBotMessage('error');
      bot.sendMessage(msg.chat.id, errorMessage || "😔 Вибачте, не вдалося отримати факт. Спробуйте пізніше.");
    }
  });

  bot.onText(/^\/game (.+)$/, async (msg, match) => {
    const prompt = match[1];
    const response = await getGameResponse(prompt);
    
    if (response) {
      bot.sendMessage(msg.chat.id, response, {
        parse_mode: "HTML"
      });
    } else {
      const errorMessage = await generateBotMessage('error');
      bot.sendMessage(msg.chat.id, errorMessage || "😔 Вибачте, не вдалося отримати відповідь. Спробуйте пізніше.");
    }
  });
}

module.exports = {
  setupGeminiCommands
}; 