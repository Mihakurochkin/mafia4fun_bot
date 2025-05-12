let players = [];
const groupRights = new Map();
const warningCooldowns = new Map();

let timeout = 30;
let isStarted = false;
let isNight = false;
let gameChatId = null;
let nightTimeout = null;

function assignRoles(players) {
  const roles = [];
  const mafiaCount = Math.floor(players.length / 4);
  
  for (let i = 0; i < mafiaCount; i++) {
    roles.push('mafia');
  }
  roles.push('doctor');
  roles.push('commissioner');
  while (roles.length < players.length) {
    roles.push('peaceful');
  }
  
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  
  return players.map((player, index) => ({
    ...player,
    role: roles[index],
    isAlive: true
  }));
}

function startNightPhase() {
  isNight = true;
  if (nightTimeout) {
    clearTimeout(nightTimeout);
  }
  nightTimeout = setTimeout(() => {
    isNight = false;
    processNightActions();
  }, 60000);
}

module.exports = {
  players,
  groupRights,
  warningCooldowns,
  timeout,
  isStarted,
  isNight,
  gameChatId,
  assignRoles,
  startNightPhase
}; 