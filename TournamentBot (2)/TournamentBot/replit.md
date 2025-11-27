# Discord Tournament Bot

## Overview
A comprehensive Discord bot for managing competitive gaming tournaments with automated bracketing, player registration, match coordination, and admin controls. Built with Discord.js v14 and PostgreSQL.

## Recent Changes (November 25, 2025 - Part 3)
- **Fixed image system**:
  - Removed problematic image file with special characters that broke Discord validation
  - Normal Post Images now uses 4 clean files without special characters
- **Fixed player list display**:
  - Player list now correctly displays in "📝｜registered-players" channel
  - Fixed channel ID reference from non-existent `tour_channel_id` to `registered_players_channel_id`
  - Players now appear when they register via the `:tour` register button

## Previous Changes (November 25, 2025 - Part 2)
- **Separated image systems**:
  - Tour & Code Images (5): Used for BOTH `:tour` posts and `:m` match code DMs
    - Event_Background_Rush_Hour_1763952596303.png
    - Event_Background_Rush_Hour_Legendary_1763952596303.png
    - Event_Background_StumbleQuick1_1763952596302.png
    - Event_Background_StumbleQuickly_1764082729796.png
    - frddddddddddddddd_1763952596302.png
  - Normal Post Images (4): Used for `:help`, `:start`, mentions, joins, brackets, final results, `:endtour`
- **3rd Place System**: 
  - `:3rd on` - Enable 3rd place visibility in final results
  - `:3rd off` - Hide 3rd place (default)
  - When enabled, shows semifinal loser as 3rd place winner
- **Winner Role System** (Optional):
  - `:winner role <@1st> <@2nd> <@3rd>` - Set roles for 1st/2nd/3rd place winners
  - Roles auto-assigned when tournament completes
  - Optional feature - no roles assigned if not configured
- **Fixed mention handler**:
  - Bot now only replies to **direct mentions**, not @here or @everyone
  - Responds only when bot is directly mentioned in message

## Previous Changes (November 25, 2025 - Part 1)
- Changed bot prefix from `!` to `:`
- Added bot join message: displays welcome with commands and Discord link
- Added mention response: replies with bot info when mentioned
- **Deleted `:cancel` command** - user indicated it doesn't work, removed completely
- **Deleted `:pick` command** - removed auto-generation feature
- **Deleted `:settourchannel` and `:setadminchannel` commands** - channels are auto-created with proper permissions via `:start`
- Removed auto-generation of next rounds - now admin must manually use `:bracket r<round>`
- Updated `:bracket` command: now supports manual generation for any round (`:bracket r2`, `:bracket r3`, etc.) - can be called up to 2 times per round for regeneration
- Added Express web server listening on port 3000 with `/` endpoint returning "Bot is alive!"
- Fixed button interaction timeout error by replying immediately before async operations
- Fixed register button player count: now shows `Register (X/Size)` and updates in real-time
- Fixed system messages: now friendly and user-focused with emojis
- Implemented auto-delete for user command messages (0.5 seconds)
- Implemented auto-delete for bot error/status messages (4 seconds) so users can read them
- Fixed `:help` message to persist permanently (no auto-delete)
- Fixed `:tour` message to persist permanently (no auto-delete) 
- Fixed `:endtour` result message to persist permanently (no auto-delete)
- Fixed tournament post jumping issue by only updating buttons, not the embed
- Fixed message reply errors by using channel.send instead of message.reply
- Admin pinged in admin channel when tournament reaches full capacity
- **CRITICAL FIX - `:endtour <reason>` command**: 
  - Fixed database schema to include new channel columns (tour_info_channel_id, registered_players_channel_id, admin_only_channel_id)
  - Now REQUIRES a reason parameter (no ending without reason)
  - **DELETES the admin's command message** before sending end announcement
  - Posts as a **Discord Embed** with:
    - **Title:** 🛑 Tournament Ended
    - **Color:** Red (#FF0000)
    - **Description:** "The tournament has been officially closed."
    - **Fields:** 📌 Ended By (admin mention), 📝 Reason (custom reason)
    - **Footer:** 💫 Thank you to everyone who participated!
  - **Embed persists permanently** (does NOT auto-delete)
  - Sends to tour-info channel (or tournament channel as fallback)
  - Prevents silent failures - message will always post if channels are set
- **Fixed all command error messages**: changed from `!` prefix to `:` prefix (e.g., `:m r1`, `:q r<round>`, etc.)
- **Updated `:help` command**: now properly shows all commands with descriptions using `:` prefix, removed `:cancel` and channel setting commands
- **Locked channels for non-admins**: Tour Info and Registered Players channels now deny SendMessages for regular users; only admins can send messages
- **Bot join DM notification**: When bot joins a new server, automatically sends DM to owner (1274782339192328224) with:
  - Server name (🏷️)
  - Member count (👥)
  - Invite link (🔗) - generated from first available text channel
  - Who added the bot (➕)
  - Fallback message if invite creation fails
- **Offline detection system**: Bot now detects when it was added to servers while offline:
  - Tracks all guilds in database (bot_guild_tracking table)
  - On startup, checks for new servers not in tracking
  - Sends "Bot Added to Server While Offline!" message for each new server
  - Includes same info as real-time join (server name, member count, invite link, owner)
- **Added tournament-themed images** with dual system:
  - Tournament Code Images (5 images): Event_Background_Rush_Hour files used for match code DMs
  - Normal Post Images (5 images): Stumble Tournament Hub images for ui posts
  - Random selection ensures variety in all posts

## Project Architecture

### Tech Stack
- **Runtime**: Node.js 20
- **Framework**: Discord.js v14
- **Web Server**: Express.js
- **Database**: PostgreSQL (Replit-provided)
- **Package Manager**: npm

### File Structure
```
src/
├── index.js        # Bot initialization and event handlers
├── commands.js     # All command handlers and logic
└── database.js     # Database connection and queries

Configuration:
├── package.json    # Dependencies and scripts
├── .env.example    # Environment variable template
└── README.md       # Documentation
```

### Database Schema
- `guild_settings`: Admin roles and channel configurations per server
- `tournaments`: Tournament metadata (size, name, map, abilities, prize, status)
- `tournament_players`: Player registrations and status
- `matches`: Bracket structure with rounds, players, winners, codes

## Key Features Implemented
1. Tournament creation with 8/16/32/64 player support
2. Live registration with button UI
3. Player list channel with admin kick buttons
4. Manual single-elimination bracket generation (admins control bracket creation per round)
5. Bye handling for odd player counts
6. Match code DM system with rotating background images
7. Winner qualification with manual round advancement
8. Tournament completion with 1st/2nd/3rd place announcements
9. Admin role-based permissions
10. Tournament end with custom reason and formatted embed message
11. All commands use `:` prefix with proper error messages
12. `:help` command displays all available commands with descriptions
13. **Bot join notification** - Sends DM to owner with server info, member count, invite link, and who added the bot

## Environment Variables
- `DISCORD_BOT_TOKEN`: Discord bot authentication token (required)
- `DATABASE_URL`: PostgreSQL connection string (auto-configured by Replit)

## User Preferences
None documented yet.

## Available Commands
**Setup Commands (Prefix: `:`)**
- `:setadminrole @role` - Set admin role (Server Admin or higher required)
- `:start` - Initialize tournament category and channels with proper permissions
- `:3rd on` - Enable 3rd place display in final results
- `:3rd off` - Disable 3rd place display (default)
- `:winner role <@1st> <@2nd> <@3rd>` - Set winner roles (optional - auto-assigns at tournament end)

**Tournament Commands (Admin Only)**
- `:tour <8/16/32/64> <name> <map> <abilities> <prize>` - Create tournament (message persists)
- `:bracket r<round>` - Generate bracket for any round (manually controlled)
- `:m r<round> <match#> <code>` - Send match code to players via DM
- `:q r<round> @winner` - Qualify winner to next round
- `:endtour <reason>` - End active tournament with reason (REQUIRED - message persists)
- `:help` - Show all commands and descriptions (message persists)

## Known Limitations
- One active tournament per server at a time
- Players must have DMs enabled to receive match codes
- Maximum 5 kick buttons per row in player list (Discord limitation)
- `:cancel`, `:pick`, `:settourchannel`, and `:setadminchannel` commands removed per user request
- 3rd place detection requires at least 4 players (semifinal losers needed)
