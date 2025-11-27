# Discord Tournament Bot

A comprehensive Discord bot for managing competitive tournaments with automated bracketing, registration, match coordination, and admin controls.

## Features

- **Tournament Creation**: Create tournaments with configurable sizes (8, 16, 32, or 64 players)
- **Interactive Registration**: Players can register/unregister via buttons with live count updates
- **Player Management**: Dedicated channel for player lists with admin kick functionality
- **Automated Brackets**: Generate single-elimination brackets with automatic bye handling
- **Match Coordination**: Send match codes via DM to participants
- **Winner Advancement**: Qualify winners and automatically generate next rounds
- **Player Replacement**: Randomly select replacements for absent players
- **Tournament Completion**: Automated announcements for 1st, 2nd, and 3rd place

## Setup Instructions

### 1. Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section and click "Add Bot"
4. Enable these **Privileged Gateway Intents**:
   - Server Members Intent
   - Message Content Intent
5. Copy the bot token

### 2. Invite Bot to Server

1. Go to "OAuth2" → "URL Generator"
2. Select scopes: `bot`
3. Select permissions:
   - Send Messages
   - Embed Links
   - Read Message History
   - Use External Emojis
   - Manage Messages
   - Add Reactions
4. Copy the generated URL and open it to invite the bot

### 3. Configure Environment

Add your Discord bot token as a secret named `DISCORD_BOT_TOKEN` in Replit.

### 4. Run the Bot

Click the "Run" button in Replit.

## Commands

### Setup Commands (Administrator Permission Required)

- `:setadminrole @role` - Set the role that can manage tournaments
- `:settourchannel #channel` - Set the channel for player lists
- `:setadminchannel #channel` - Set the channel for admin notifications

### Tournament Commands (Admin Role Required)

- `:tour <size> <name> <map> <abilities> <prize>` - Create a new tournament
  - Use quotes for multi-word values
  - Example: `:tour 16 "Summer Cup" "Final Destination" "All Abilities" "100 USD Prize Pool"`
  - Example: `:tour 8 QuickMatch Battlefield All "Trophy and bragging rights"`
- `:bracket r<round>` - Generate bracket for any round (can use up to 2 times per round)
  - Example: `:bracket r1` or `:bracket r2`
  - First use generates bracket, second use regenerates it, third attempt is blocked
- `:m r<round> <match#> <code>` - Send match code to both players
  - Example: `:m r1 1 ABC123`
- `:q r<round> @winner` - Qualify a winner to the next round
  - Example: `:q r1 @PlayerName`
- `:cancel` - Cancel the active tournament
- `:endtour` - End the active tournament
- `:help` - Display help information

## Workflow

1. Admin sets up channels using `:setadminrole`, `:settourchannel`, and `:setadminchannel`
2. Admin creates tournament with `:tour` (use quotes for multi-word values)
3. Players register by clicking the "Register" button
4. When full, admin receives notification in admin channel
5. Admin generates Round 1 bracket with `:bracket r1`
6. Admin sends match codes with `:m r<round> <match#> <code>`
7. Admin qualifies winners with `:q r<round> @winner`
8. Admin manually generates next rounds with `:bracket r2`, `:bracket r3`, etc. (can regenerate up to 2 times per round)
9. Repeat steps 6-8 until final winner is crowned
10. Tournament completes with placement announcements

## Database Schema

The bot uses PostgreSQL to store:
- Guild settings (admin roles, channels)
- Tournament data (size, name, map, abilities, prize, status)
- Player registrations
- Match brackets and results

## Support

Only ONE tournament can be active per server at a time. Complete or cancel the current tournament before creating a new one.
