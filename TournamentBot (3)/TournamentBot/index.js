import { Client, GatewayIntentBits, Events, Partials, AttachmentBuilder } from 'discord.js';
import dotenv from 'dotenv';
import { 
  initDatabase, 
  getGuildSettings,
  getActiveTournament,
  registerPlayer,
  unregisterPlayer,
  getPlayerCount,
  getTrackedGuilds,
  addTrackedGuild,
  getNewGuilds,
  getThirdPlaceVisibility,
  getWinnerRoles
} from './database.js';
import {
  hasAdminRole,
  handleSetAdminRole,
  handleStartCommand,
  handleTourCommand,
  handleBracketCommand,
  handleMatchCommand,
  handleQualifyCommand,
  handleEndTourCommand,
  handleKickButton,
  updateTournamentEmbed,
  updatePlayerList,
  updateRegisterButtons,
  getRandomNormalImage,
  getImagePath,
  handleThirdPlaceCommand,
  handleWinnerRoleCommand
} from './commands.js';
import { parseQuotedArgs } from './utils.js';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Bot is ready! Logged in as ${c.user.tag}`);
  try {
    await initDatabase();
    console.log('✅ Database initialized');

    // Check for new servers added while bot was offline
    const currentGuildIds = c.guilds.cache.map(guild => guild.id);
    const newGuildIds = await getNewGuilds(currentGuildIds);

    if (newGuildIds.length > 0) {
      console.log(`🆕 Found ${newGuildIds.length} new server(s) added while offline!`);
      const OWNER_ID = '1274782339192328224';
      try {
        const owner = await client.users.fetch(OWNER_ID);
        if (owner) {
          for (const guildId of newGuildIds) {
            const guild = await client.guilds.fetch(guildId);
            if (guild) {
              let inviteLink = 'Could not create invite link.';
              const textChannel = guild.channels.cache.find(ch => ch.isTextBased() && ch.permissionsFor(guild.members.me).has('CreateInstantInvite'));
              if (textChannel) {
                try {
                  const invite = await textChannel.createInvite({ maxAge: 0 });
                  inviteLink = invite.url;
                } catch (error) {
                  console.error('Error creating invite:', error);
                }
              }

              const offlineAddMsg = `🟢 **Bot Added to Server While Offline!**

🏷️ Server: ${guild.name}
👥 Members: ${guild.memberCount}
🔗 Invite Link: ${inviteLink}
➕ Owner: <@${guild.ownerId}>

— Notification Only For: <@${OWNER_ID}>`;

              await owner.send(offlineAddMsg);
              await addTrackedGuild(guildId);
              console.log(`📧 Sent offline add notification for: ${guild.name}`);
            }
          }
        }
      } catch (error) {
        console.error('Error sending offline add notifications:', error);
      }
    }

    // Track all current guilds
    for (const guild of c.guilds.cache.values()) {
      await addTrackedGuild(guild.id);
    }
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
  }
});

client.on(Events.GuildCreate, async (guild) => {
  const channel = guild.systemChannel || guild.channels.cache.find(ch => ch.isTextBased() && ch.permissionsFor(guild.members.me).has('SendMessages'));
  if (channel) {
    const welcomeEmbed = {
      color: 0x00FF00,
      title: '🎉 **Hello everyone! I just joined the server!**',
      description: "I'm your **Tournament Management Bot** 🤖🏆\nBuilt to handle **tournaments, brackets, match codes, qualifiers, player lists** and much more — fully automatic ⚡",
      fields: [
        {
          name: '📌 **To get started:**',
          value: 'Use **`:help`** to see all commands and setup instructions.'
        },
        {
          name: '🛠️ **Bot Creator:**',
          value: '<@1274782339192328224> 💻⚡'
        },
        {
          name: '🔗 **Join our main community:**',
          value: '👉 [Join our Discord!](https://discord.gg/HKHFcPnGJt)'
        }
      ]
    };
    const imageName = getRandomNormalImage();
    const imagePath = getImagePath(imageName);
    const attachment = new AttachmentBuilder(imagePath);
    welcomeEmbed.image = { url: `attachment://${imageName}` };
    await channel.send({ embeds: [welcomeEmbed], files: [attachment] }).catch(() => {});
  }

  // Send DM to bot owner
  const OWNER_ID = '1274782339192328224';
  try {
    const owner = await client.users.fetch(OWNER_ID);
    if (!owner) return;

    // Get member who added the bot
    const fetchedGuild = await client.guilds.fetch(guild.id);
    const me = await fetchedGuild.members.fetchMe();
    const inviter = me.joinedAt ? null : guild.owner?.user;

    // Generate invite link
    let inviteLink = 'Could not create invite link.';
    const textChannel = guild.channels.cache.find(ch => ch.isTextBased() && ch.permissionsFor(guild.members.me).has('CreateInstantInvite'));
    if (textChannel) {
      try {
        const invite = await textChannel.createInvite({ maxAge: 0 });
        inviteLink = invite.url;
      } catch (error) {
        console.error('Error creating invite:', error);
      }
    }

    const ownerDM = `🟢 **Bot Added to a New Server!**

🏷️ Server: ${guild.name}
👥 Members: ${guild.memberCount}
🔗 Invite Link: ${inviteLink}
➕ Added By: <@${guild.ownerId}>

— Notification Only For: <@${OWNER_ID}>`;

    await owner.send(ownerDM);
    await addTrackedGuild(guild.id);
  } catch (error) {
    console.error('Error sending owner DM:', error);
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  
  if (message.mentions.users.has(client.user.id)) {
    const mentionEmbed = {
      color: 0xFFD700,
      title: '🌟 **Hey there! You mentioned me?**',
      description: "I'm your **Advanced Tournament Bot** 🤖✨\nHere to manage **tournaments, brackets, matches & players** — fully automatic! 🏆⚔️",
      fields: [
        {
          name: '📘 **Need help?**',
          value: 'Use **`:help`** to see all my commands and how to use me.'
        },
        {
          name: '💬 **Want more features or custom bots?**',
          value: 'This bot is proudly created by **<@1274782339192328224>** 🧑‍💻⚡'
        },
        {
          name: '🔗 **Join our Discord Community:**',
          value: '👉 [Join our Discord!](https://discord.gg/HKHFcPnGJt)'
        }
      ]
    };
    const imageName = getRandomNormalImage();
    const imagePath = getImagePath(imageName);
    const attachment = new AttachmentBuilder(imagePath);
    mentionEmbed.image = { url: `attachment://${imageName}` };
    try {
      await message.channel.send({ embeds: [mentionEmbed], files: [attachment] });
    } catch (err) {
      console.error('Error sending mention response:', err);
    }
    return;
  }
  
  if (!message.content.startsWith(':')) return;

  const commandLine = message.content.slice(1).trim();
  let args, command;
  
  if (commandLine.startsWith('tour ')) {
    const fullArgs = parseQuotedArgs(commandLine);
    command = fullArgs.shift().toLowerCase();
    args = fullArgs;
  } else {
    args = commandLine.split(/ +/);
    command = args.shift().toLowerCase();
  }

  try {
    const guildSettings = await getGuildSettings(message.guild.id);
    
    setTimeout(() => {
      message.delete().catch(() => {});
    }, 500);

    switch (command) {
      case 'setadminrole':
        await handleSetAdminRole(message, args);
        break;

      case 'start':
        await handleStartCommand(message, guildSettings);
        break;

      case 'tour':
        await handleTourCommand(message, args, guildSettings);
        break;

      case 'bracket':
        await handleBracketCommand(message, args, guildSettings);
        break;

      case 'm':
        await handleMatchCommand(message, args, guildSettings);
        break;

      case 'q':
        await handleQualifyCommand(message, args, guildSettings);
        break;

      case 'endtour':
        await handleEndTourCommand(message, args, guildSettings);
        break;

      case '3rd':
        await handleThirdPlaceCommand(message, args, guildSettings);
        break;

      case 'winner':
        await handleWinnerRoleCommand(message, args, guildSettings);
        break;

      case 'help':
        const helpEmbed = {
          color: 0x0099FF,
          title: '🤖 Tournament Bot Commands',
          fields: [
            {
              name: '⚙️ Setup Commands',
              value: '`:setadminrole @role` - Set admin role\n`:start` - Initialize tournament category and channels\n`:3rd on/off` - Enable/disable 3rd place\n`:winner role <@1st> <@2nd> <@3rd>` - Set winner roles (optional)'
            },
            {
              name: '🏆 Tournament Commands (Admin Only)',
              value: '`:tour <8/16/32/64> <name> <map> <abilities> <prize>` - Create tournament\n`:bracket r<round>` - Generate bracket for any round\n`:m r<round> <match#> <code>` - Send match code to players\n`:q r<round> @winner` - Qualify winner to next round\n`:endtour <reason>` - End active tournament with a reason (required)'
            }
          ]
        };
        const helpImageName = getRandomNormalImage();
        const helpImagePath = getImagePath(helpImageName);
        const helpAttachment = new AttachmentBuilder(helpImagePath);
        helpEmbed.image = { url: `attachment://${helpImageName}` };
        try {
          await message.channel.send({ embeds: [helpEmbed], files: [helpAttachment] });
        } catch (err) {
          console.error('Failed to send help:', err);
        }
        break;
    }
  } catch (error) {
    console.error('Error handling command:', error);
    try {
      await message.reply('An error occurred while processing your command.');
    } catch (err) {
      try {
        await message.channel.send('An error occurred while processing your command.');
      } catch (e) {
        console.error('Failed to send error message:', e);
      }
    }
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  try {
    if (interaction.customId === 'register') {
      const tournament = await getActiveTournament(interaction.guild.id);
      if (!tournament) {
        return interaction.reply({ content: 'No active tournament found.', ephemeral: true });
      }

      const playerCount = await getPlayerCount(tournament.id);
      if (playerCount >= tournament.size) {
        return interaction.reply({ content: 'Tournament is full!', ephemeral: true });
      }

      const success = await registerPlayer(
        tournament.id,
        interaction.user.id,
        interaction.user.username
      );

      if (!success) {
        return interaction.reply({ content: 'You are already registered!', ephemeral: true });
      }

      const reply = await interaction.reply({ content: 'You have been registered for the tournament!', ephemeral: true });

      updateRegisterButtons(client, tournament).catch(err => console.error('Error updating buttons:', err));
      updatePlayerList(client, tournament).catch(err => console.error('Error updating player list:', err));

      const newPlayerCount = await getPlayerCount(tournament.id);
      if (newPlayerCount >= tournament.size) {
        const settings = await getGuildSettings(interaction.guild.id);
        if (settings && settings.admin_channel_id) {
          const adminChannel = await client.channels.fetch(settings.admin_channel_id);
          const pingMessage = settings.admin_role_id ? `<@&${settings.admin_role_id}> 🎯 Tournament is full. Run \`!bracket r1\` to generate Round 1.` : '🎯 Tournament is full. Run `!bracket r1` to generate Round 1.';
          await adminChannel.send(pingMessage);
        }
      }

    } else if (interaction.customId === 'unregister') {
      const tournament = await getActiveTournament(interaction.guild.id);
      if (!tournament) {
        return interaction.reply({ content: 'No active tournament found.', ephemeral: true });
      }

      const success = await unregisterPlayer(tournament.id, interaction.user.id);

      if (!success) {
        return interaction.reply({ content: 'You are not registered!', ephemeral: true });
      }

      const reply = await interaction.reply({ content: 'You have been unregistered from the tournament.', ephemeral: true });

      updateRegisterButtons(client, tournament).catch(err => console.error('Error updating buttons:', err));
      updatePlayerList(client, tournament).catch(err => console.error('Error updating player list:', err));

    } else if (interaction.customId.startsWith('kick_')) {
      const userId = interaction.customId.split('_')[1];
      const guildSettings = await getGuildSettings(interaction.guild.id);
      await handleKickButton(interaction, userId, guildSettings);
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    if (!interaction.replied) {
      interaction.reply({ content: 'An error occurred.', ephemeral: true });
    }
  }
});

client.on(Events.Error, (error) => {
  console.error('Discord client error:', error);
});

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('❌ DISCORD_BOT_TOKEN is not set in environment variables!');
  console.log('📝 Please set your Discord bot token:');
  console.log('   1. Go to Discord Developer Portal: https://discord.com/developers/applications');
  console.log('   2. Create a new application or select an existing one');
  console.log('   3. Go to the "Bot" section and copy the token');
  console.log('   4. Add DISCORD_BOT_TOKEN to your secrets in Replit');
  process.exit(1);
} else {
  client.login(token).catch(error => {
    console.error('❌ Failed to login:', error);
    console.log('Please check your DISCORD_BOT_TOKEN is valid.');
  });
}