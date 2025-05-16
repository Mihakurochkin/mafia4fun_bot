const { bot } = require('../config/bot');
const { getGeminiResponse, generateBotMessage } = require('../utils/gemini');
const { isNight, gameChatId } = require('../utils/gameState');

// Track last message time to avoid spam
const lastMessageTime = new Map();
const MESSAGE_COOLDOWN = 5 * 60 * 1000; // 5 minutes

// Helper function to format message
function formatMessage(text) {
  // Remove excessive emojis (keep max 1)
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;
  const emojis = text.match(emojiRegex) || [];
  if (emojis.length > 1) {
    text = text.replace(emojiRegex, '');
    text = emojis[0] + ' ' + text;
  }
  
  // Trim to 30 characters (reduced from 50)
  if (text.length > 30) {
    text = text.substring(0, 27) + '...';
  }
  
  return text.trim();
}

function setupAutoResponses() {
  // Registration start event
  bot.on('message', async (msg) => {
    if (msg.text && msg.text.toLowerCase().includes('реєстрація почалась')) {
      try {
        const prompt = 'Registration started. Super short message (max 30 chars) to gather players. One emoji max.';
        const response = await getGeminiResponse(prompt);
        if (response) {
          await bot.sendMessage(msg.chat.id, formatMessage(response), {
            parse_mode: "HTML"
          });
        }
      } catch (error) {
        console.error('Error in registration start response:', error);
      }
    }
  });

  // Registration extend event
  bot.on('message', async (msg) => {
    if (msg.text && msg.text.toLowerCase().includes('реєстрацію продовжено')) {
      try {
        const prompt = 'Registration extended. Super short message (max 30 chars) about extra time. One emoji max.';
        const response = await getGeminiResponse(prompt);
        if (response) {
          await bot.sendMessage(msg.chat.id, formatMessage(response), {
            parse_mode: "HTML"
          });
        }
      } catch (error) {
        console.error('Error in registration extend response:', error);
      }
    }
  });

  // Registration stop event
  bot.on('message', async (msg) => {
    if (msg.text && msg.text.toLowerCase().includes('реєстрацію зупинено')) {
      try {
        const prompt = 'Registration closed. Super short message (max 30 chars) about finalizing. One emoji max.';
        const response = await getGeminiResponse(prompt);
        if (response) {
          await bot.sendMessage(msg.chat.id, formatMessage(response), {
            parse_mode: "HTML"
          });
        }
      } catch (error) {
        console.error('Error in registration stop response:', error);
      }
    }
  });

  // Game start event
  bot.on('message', async (msg) => {
    if (msg.text && msg.text.toLowerCase().includes('гра починається')) {
      try {
        const prompt = 'Game starting. Super short message (max 30 chars) about beginning. One emoji max.';
        const response = await getGeminiResponse(prompt);
        if (response) {
          await bot.sendMessage(msg.chat.id, formatMessage(response), {
            parse_mode: "HTML"
          });
        }
      } catch (error) {
        console.error('Error in game start response:', error);
      }
    }
  });

  // Player death event
  bot.on('message', async (msg) => {
    if (msg.text && msg.text.toLowerCase().includes('помер') || msg.text.toLowerCase().includes('вбито')) {
      try {
        const prompt = 'Player died. Super short message (max 30 chars) about death. One emoji max.';
        const response = await getGeminiResponse(prompt);
        if (response) {
          await bot.sendMessage(msg.chat.id, formatMessage(response), {
            parse_mode: "HTML"
          });
        }
      } catch (error) {
        console.error('Error in death response:', error);
      }
    }
  });

  // Night phase event
  bot.on('message', async (msg) => {
    if (msg.text && msg.text.toLowerCase().includes('настала ніч')) {
      try {
        const prompt = 'Night fell. Super short message (max 30 chars) about night. One emoji max.';
        const response = await getGeminiResponse(prompt);
        if (response) {
          await bot.sendMessage(msg.chat.id, formatMessage(response), {
            parse_mode: "HTML"
          });
        }
      } catch (error) {
        console.error('Error in night phase response:', error);
      }
    }
  });

  // Welcome new players
  bot.on('new_chat_members', async (msg) => {
    const chatId = msg.chat.id;
    const newMembers = msg.new_chat_members.filter(member => !member.is_bot);
    
    if (newMembers.length > 0) {
      try {
        const names = newMembers.map(m => m.first_name).join(', ');
        const prompt = `Welcome ${names}. Super short message (max 30 chars). One emoji max.`;
        
        const response = await getGeminiResponse(prompt);
        if (response) {
          await bot.sendMessage(chatId, formatMessage(response), {
            parse_mode: "HTML"
          });
        }
      } catch (error) {
        console.error('Error in welcome response:', error);
      }
    }
  });
}

module.exports = {
  setupAutoResponses
}; 