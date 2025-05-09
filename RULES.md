# Mafia Game Rules

## General Rules
- The game is played in a group chat
- Players are divided into two teams: Mafia and Peaceful Citizens
- The game alternates between Day and Night phases
- The game continues until one team wins

## Roles

### Peaceful Citizens
- Regular players who try to identify and eliminate the Mafia
- Win when all Mafia members are eliminated

### Mafia
- Secret team that eliminates one player each night
- Win when the number of Mafia equals the number of Peaceful Citizens

### Doctor
- Can save one player from elimination each night
- Cannot save the same player two nights in a row
- Belongs to the Peaceful Citizens team

### Commissioner
- Can check one player's role each night
- Belongs to the Peaceful Citizens team

## Game Phases

### Day Phase
- All players can communicate in the chat
- Players discuss and vote to eliminate a suspicious player
- The player with the most votes is eliminated
- If there's a tie, no one is eliminated

### Night Phase
- All players must be silent
- Special roles perform their actions:
  - Mafia chooses a victim
  - Doctor chooses someone to save
  - Commissioner checks a player's role
- The bot processes all actions and announces the results

## Additional Rules
- Players must follow the bot's instructions
- No private communication about the game is allowed
- Dead players cannot participate in the game
- The game requires a minimum of 4 players
- Maximum number of players is 20

## Bot Commands
- `/start` - Start game registration
- `/extend` - Extend registration time by 30 seconds
- `/stop` - Stop registration

## Role Distribution
- Mafia: 1/4 of total players (rounded down)
- Doctor: 1 player
- Commissioner: 1 player
- Peaceful Citizens: Remaining players 