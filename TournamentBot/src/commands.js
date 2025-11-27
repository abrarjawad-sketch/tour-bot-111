import { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  AttachmentBuilder 
} from 'discord.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
  getGuildSettings,
  setAdminRole,
  setTourChannel,
  setAdminChannel,
  setTournamentChannels,
  createTournament,
  getActiveTournament,
  registerPlayer,
  unregisterPlayer,
  getPlayers,
  getPlayerCount,
  updateTournamentStatus,
  updatePlayerListMessage,
  createMatch,
  getMatches,
  getMatchByNumber,
  updateMatchCode,
  setMatchWinner,
  updateMatchPlayer,
  removePlayer,
  getTournamentById,
  getBracketGenerationCount,
  incrementBracketGeneration,
  deleteMatchesByRound,
  setThirdPlaceVisibility,
  setWinnerRoles,
  getWinnerRoles,
  getThirdPlaceVisibility
} from './database.js';

// Tour and Code Images (5 images) - Used for :tour and :m commands
const TOUR_AND_CODE_IMAGES = [
  'Event_Background_Rush_Hour_1763952596303.png',
  'Event_Background_Rush_Hour_Legendary_1763952596303.png',
  'Event_Background_StumbleQuick1_1763952596302.png',
  'Event_Background_StumbleQuickly_1764082729796.png',
  'frddddddddddddddd_1763952596302.png'
];

// Normal Post Images (4 images)
const NORMAL_POST_IMAGES = [
  'stumble_hub_1.png',
  'stumble_hub_2.png',
  'stumble_hub_3.png',
  'stumble_hub_4.png'
];

export function getRandomTourCodeImage() {
  return TOUR_AND_CODE_IMAGES[Math.floor(Math.random() * TOUR_AND_CODE_IMAGES.length)];
}

export function getRandomNormalImage() {
  return NORMAL_POST_IMAGES[Math.floor(Math.random() * NORMAL_POST_IMAGES.length)];
}

export function getImagePath(filename) {
  return path.join(__dirname, 'images', filename);
}

export function hasAdminRole(member, guildSettings) {
  if (!guildSettings || !guildSettings.admin_role_id) return false;
  return member.roles.cache.has(guildSettings.admin_role_id);
}

export async function handleSetAdminRole(message, args) {
  if (!message.member.permissions.has('Administrator')) {
    const reply = await message.channel.send('You need Administrator permission to set the admin role.');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  const role = message.mentions.roles.first();
  if (!role) {
    const reply = await message.channel.send('Please mention a role. Usage: `:setadminrole @Role`');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  await setAdminRole(message.guild.id, role.id);
  const reply = await message.channel.send(`✅ Admin role set to ${role.name}. Run \`:start\` to initialize the tournament system.`);
  setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
}

export async function handleStartCommand(message, guildSettings) {
  if (!hasAdminRole(message.member, guildSettings)) {
    const reply = await message.channel.send('You do not have permission to use this command.');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  if (!guildSettings || !guildSettings.admin_role_id) {
    const reply = await message.channel.send('Please set an admin role first using `:setadminrole @Role`');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  try {
    const categoryName = '𔘓𓂃Tournament 𓂃𔘓';
    
    const category = await message.guild.channels.create({
      name: categoryName,
      type: 4,
      permissionOverwrites: [
        {
          id: message.guild.id,
          deny: ['ViewChannel']
        }
      ]
    });

    const tourInfoChannel = await message.guild.channels.create({
      name: '📢｜tour-info',
      parent: category.id,
      permissionOverwrites: [
        {
          id: message.guild.id,
          allow: ['ViewChannel'],
          deny: ['SendMessages']
        },
        {
          id: guildSettings.admin_role_id,
          allow: ['ViewChannel', 'SendMessages']
        }
      ]
    });

    const registeredPlayersChannel = await message.guild.channels.create({
      name: '📝｜registered-players',
      parent: category.id,
      permissionOverwrites: [
        {
          id: message.guild.id,
          allow: ['ViewChannel'],
          deny: ['SendMessages']
        },
        {
          id: guildSettings.admin_role_id,
          allow: ['ViewChannel', 'SendMessages']
        }
      ]
    });

    const adminOnlyChannel = await message.guild.channels.create({
      name: '🔐｜admin-only',
      parent: category.id,
      permissionOverwrites: [
        {
          id: message.guild.id,
          deny: ['ViewChannel']
        },
        {
          id: guildSettings.admin_role_id,
          allow: ['ViewChannel', 'SendMessages']
        }
      ]
    });

    await setTournamentChannels(
      message.guild.id,
      category.id,
      tourInfoChannel.id,
      registeredPlayersChannel.id,
      adminOnlyChannel.id
    );

    const imageName = getRandomNormalImage();
    const imagePath = getImagePath(imageName);
    const attachment = new AttachmentBuilder(imagePath);
    await message.channel.send({
      content: `✅ Tournament system initialized!\n📁 Category: ${categoryName}\n📢 Tour Info: ${tourInfoChannel}\n📝 Players: ${registeredPlayersChannel}\n🔐 Admin: ${adminOnlyChannel}`,
      files: [attachment]
    });
  } catch (error) {
    console.error('Error creating tournament channels:', error);
    const reply = await message.channel.send('Error initializing tournament system. Make sure I have permission to create channels.');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
  }
}


export async function handleTourCommand(message, args, guildSettings) {
  if (!hasAdminRole(message.member, guildSettings)) {
    const reply = await message.channel.send('You do not have permission to use this command.');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  const activeTour = await getActiveTournament(message.guild.id);
  if (activeTour) {
    const reply = await message.channel.send('There is already an active tournament. Complete or end it first with `:endtour <reason>`.');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  if (args.length < 5) {
    const reply = await message.channel.send('Usage: `:tour <8/16/32/64> <name> <map> <abilities> <prize>`');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  const sizeStr = args[0];
  const size = parseInt(sizeStr);
  
  if (![8, 16, 32, 64].includes(size)) {
    const reply = await message.channel.send('❌ Tournament size must be 8, 16, 32, or 64.');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  const name = args[1];
  const map = args[2];
  const abilities = args[3];
  const prize = args.slice(4).join(' ');

  const randomImage = getRandomTourCodeImage();
  const imagePath = path.join(__dirname, 'images', randomImage);
  const attachment = new AttachmentBuilder(imagePath, { name: randomImage });
  
  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle(`Tour ${name}`)
    .setDescription(`🗺️ **Map:** ${map}\n🥊 **Ability:** ${abilities}\n🎁 **Prize:** ${prize}\n👥 **Max Teams:** ${size}`)
    .addFields(
      { 
        name: '📌 Important Rules', 
        value: '🔹 You have 2 minutes to join the match after receiving the code.\n🔹 No rematch in case of bugs or technical issues.\n🔹 Respect all players and tournament organizers. 🤝\n🔹 Match codes will be sent in private messages. 📩\n🔹 For any issues, contact support immediately. 🆘',
        inline: false 
      },
      { 
        name: '📢 Additional Information', 
        value: '📩 Match codes are sent via DM. Check your messages!\n📊 Tournament bracket can be generated with `:bracket r1`\n🆘 Need help? Contact support immediately.',
        inline: false 
      }
    )
    .setImage(`attachment://${randomImage}`)
    .setFooter({ text: 'Click Register to join the tournament!' })
    .setTimestamp();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('register')
        .setLabel('Register (0/' + size + ')')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('unregister')
        .setLabel('Unregister')
        .setStyle(ButtonStyle.Danger)
    );

  const tourMessage = await message.channel.send({ embeds: [embed], components: [row], files: [attachment] });

  await createTournament(
    message.guild.id,
    size,
    name,
    map,
    abilities,
    prize,
    tourMessage.id,
    message.channel.id
  );
}

export async function updateRegisterButtons(client, tournament) {
  try {
    const channel = await client.channels.fetch(tournament.channel_id);
    const tourMessage = await channel.messages.fetch(tournament.message_id);
    const playerCount = await getPlayerCount(tournament.id);

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('register')
          .setLabel(`Register (${playerCount}/${tournament.size})`)
          .setStyle(ButtonStyle.Success)
          .setDisabled(playerCount >= tournament.size),
        new ButtonBuilder()
          .setCustomId('unregister')
          .setLabel('Unregister')
          .setStyle(ButtonStyle.Danger)
      );

    await tourMessage.edit({ components: [row] });
  } catch (error) {
    console.error('Error updating register buttons:', error);
  }
}

export async function updateTournamentEmbed(client, tournament) {
  try {
    const channel = await client.channels.fetch(tournament.channel_id);
    const tourMessage = await channel.messages.fetch(tournament.message_id);
    const playerCount = await getPlayerCount(tournament.id);

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`Tour ${tournament.name}`)
      .setDescription(`🗺️ **Map:** ${tournament.map}\n🥊 **Ability:** ${tournament.abilities}\n🎁 **Prize:** ${tournament.prize}\n👥 **Max Teams:** ${tournament.size}`)
      .addFields(
        { 
          name: '📌 Important Rules', 
          value: '🔹 You have 2 minutes to join the match after receiving the code.\n🔹 No rematch in case of bugs or technical issues.\n🔹 Respect all players and tournament organizers. 🤝\n🔹 Match codes will be sent in private messages. 📩\n🔹 For any issues, contact support immediately. 🆘',
          inline: false 
        },
        { 
          name: '📢 Additional Information', 
          value: '📩 Match codes are sent via DM. Check your messages!\n📊 Tournament bracket can be generated with `:bracket r1`\n🆘 Need help? Contact support immediately.',
          inline: false 
        }
      )
      .setFooter({ text: 'Click Register to join the tournament!' })
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('register')
          .setLabel(`Register (${playerCount}/${tournament.size})`)
          .setStyle(ButtonStyle.Success)
          .setDisabled(playerCount >= tournament.size),
        new ButtonBuilder()
          .setCustomId('unregister')
          .setLabel('Unregister')
          .setStyle(ButtonStyle.Danger)
      );

    await tourMessage.edit({ embeds: [embed], components: [row] });
  } catch (error) {
    console.error('Error updating tournament embed:', error);
  }
}

export async function updatePlayerList(client, tournament) {
  try {
    const settings = await getGuildSettings(tournament.guild_id);
    if (!settings || !settings.registered_players_channel_id) return;

    let channel;
    try {
      channel = await client.channels.fetch(settings.registered_players_channel_id);
    } catch (error) {
      if (error.code === 10003) {
        console.warn(`Channel ${settings.registered_players_channel_id} not found - skipping player list update`);
        return;
      }
      throw error;
    }
    
    const players = await getPlayers(tournament.id);

    let content = `**📋 ${tournament.name} - Player List**\n\n`;
    if (players.length === 0) {
      content += 'No players registered yet.';
    } else {
      players.forEach((player, index) => {
        content += `${index + 1}. <@${player.user_id}>\n`;
      });
    }

    if (tournament.player_list_message_id) {
      try {
        const listMessage = await channel.messages.fetch(tournament.player_list_message_id);
        
        const components = [];
        for (let i = 0; i < players.length; i += 5) {
          const row = new ActionRowBuilder();
          const chunk = players.slice(i, i + 5);
          chunk.forEach(player => {
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`kick_${player.user_id}`)
                .setLabel(`Kick ${player.username}`)
                .setStyle(ButtonStyle.Danger)
            );
          });
          components.push(row);
        }

        await listMessage.edit({ content, components: components.slice(0, 5) });
      } catch (error) {
        const listMessage = await channel.send({ content });
        await updatePlayerListMessage(tournament.id, listMessage.id);
      }
    } else {
      const listMessage = await channel.send({ content });
      await updatePlayerListMessage(tournament.id, listMessage.id);
    }
  } catch (error) {
    console.error('Error updating player list:', error);
  }
}

export async function handleBracketCommand(message, args, guildSettings) {
  if (!hasAdminRole(message.member, guildSettings)) {
    const reply = await message.channel.send('You do not have permission to use this command.');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  const roundStr = args[0];
  if (!roundStr || !roundStr.startsWith('r')) {
    const reply = await message.channel.send('Usage: `:bracket r<round>` (e.g., `:bracket r1` or `:bracket r2`)');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  const round = parseInt(roundStr.substring(1));
  if (!round) {
    const reply = await message.channel.send('Usage: `:bracket r<round>` (e.g., `:bracket r1` or `:bracket r2`)');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  const tournament = await getActiveTournament(message.guild.id);
  if (!tournament) {
    const reply = await message.channel.send('No active tournament found.');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  if (round === 1) {
    const players = await getPlayers(tournament.id);
    if (players.length < 2) {
      const reply = await message.channel.send('⚠️ Need at least 2 players to generate brackets.');
      setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
      return;
    }

    const generationCount = await getBracketGenerationCount(tournament.id, 1);
    if (generationCount >= 2) {
      const reply = await message.channel.send('⚠️ Round 1 already exists!');
      setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
      return;
    }

    await incrementBracketGeneration(tournament.id, 1);
    await updateTournamentStatus(tournament.id, 'in_progress');

    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const matches = [];
    let matchNumber = 1;

    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        matches.push({
          number: matchNumber,
          player1: shuffled[i],
          player2: shuffled[i + 1]
        });
        await createMatch(tournament.id, 1, matchNumber, shuffled[i].user_id, shuffled[i + 1].user_id);
        matchNumber++;
      } else {
        matches.push({
          number: matchNumber,
          player1: shuffled[i],
          player2: null
        });
        const matchId = await createMatch(tournament.id, 1, matchNumber, shuffled[i].user_id, null);
        await setMatchWinner(matchId, shuffled[i].user_id);
        matchNumber++;
      }
    }

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`🎮 ${tournament.name} - Round 1 Bracket`)
      .setDescription('Matches have been generated!')
      .setTimestamp();

    let matchList = '';
    matches.forEach(match => {
      if (match.player2) {
        matchList += `**Match ${match.number}:** <@${match.player1.user_id}> vs <@${match.player2.user_id}>\n`;
      } else {
        matchList += `**Match ${match.number}:** <@${match.player1.user_id}> (BYE)\n`;
      }
    });

    embed.addFields({ name: 'Matches', value: matchList || 'No matches' });

    const imageName = getRandomNormalImage();
    const imagePath = getImagePath(imageName);
    const attachment = new AttachmentBuilder(imagePath);
    embed.setImage(`attachment://${imageName}`);

    await message.channel.send({ embeds: [embed], files: [attachment] });
    const reply = await message.channel.send('🎮 Round 1 bracket is ready!');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
  } else {
    const prevRound = round - 1;
    const prevRoundMatches = await getMatches(tournament.id, prevRound);
    
    if (prevRoundMatches.length === 0) {
      const reply = await message.channel.send(`❌ Round ${prevRound} doesn't exist yet. Generate it first.`);
      setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
      return;
    }

    const completedMatches = prevRoundMatches.filter(m => m.winner_id);
    if (completedMatches.length !== prevRoundMatches.length) {
      const reply = await message.channel.send(`⚠️ Round ${prevRound} is not complete yet. Complete all matches before generating Round ${round}.`);
      setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
      return;
    }

    const generationCount = await getBracketGenerationCount(tournament.id, round);
    if (generationCount >= 2) {
      const reply = await message.channel.send(`⚠️ Round ${round} already exists!`);
      setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
      return;
    }

    await incrementBracketGeneration(tournament.id, round);
    await deleteMatchesByRound(tournament.id, round);

    const winners = completedMatches.map(m => m.winner_id);
    const matches = [];

    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        matches.push({
          player1: winners[i],
          player2: winners[i + 1]
        });
        await createMatch(tournament.id, round, Math.floor(i / 2) + 1, winners[i], winners[i + 1]);
      } else {
        const matchId = await createMatch(tournament.id, round, Math.floor(i / 2) + 1, winners[i], null);
        await setMatchWinner(matchId, winners[i]);
        matches.push({
          player1: winners[i],
          player2: null
        });
      }
    }

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`🎮 ${tournament.name} - Round ${round} Bracket`)
      .setDescription('Matches have been generated!')
      .setTimestamp();

    let matchList = '';
    const newMatches = await getMatches(tournament.id, round);
    newMatches.forEach(match => {
      if (match.player2_id) {
        matchList += `**Match ${match.match_number}:** <@${match.player1_id}> vs <@${match.player2_id}>\n`;
      } else {
        matchList += `**Match ${match.match_number}:** <@${match.player1_id}> (BYE)\n`;
      }
    });

    embed.addFields({ name: 'Matches', value: matchList || 'No matches' });

    const imageName = getRandomNormalImage();
    const imagePath = getImagePath(imageName);
    const attachment = new AttachmentBuilder(imagePath);
    embed.setImage(`attachment://${imageName}`);

    await message.channel.send({ embeds: [embed], files: [attachment] });
    const reply = await message.channel.send(`🎮 Round ${round} bracket is ready!`);
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
  }
}

export async function handleThirdPlaceCommand(message, args, guildSettings) {
  if (!hasAdminRole(message.member, guildSettings)) {
    const reply = await message.channel.send('You do not have permission to use this command.');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  if (args.length === 0) {
    const reply = await message.channel.send('Usage: `:3rd on` or `:3rd off`');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  const action = args[0].toLowerCase();
  if (action !== 'on' && action !== 'off') {
    const reply = await message.channel.send('Usage: `:3rd on` or `:3rd off`');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  const show = action === 'on';
  await setThirdPlaceVisibility(message.guild.id, show);

  const replyMsg = await message.channel.send(`✅ 3rd place ${show ? 'enabled' : 'disabled'}.`);
  replyMsg.delete().catch(() => {});
}

export async function handleWinnerRoleCommand(message, args, guildSettings) {
  if (!hasAdminRole(message.member, guildSettings)) {
    const reply = await message.channel.send('You do not have permission to use this command.');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  if (args[0] !== 'role') {
    const reply = await message.channel.send('Usage: `:winner role <@1st> <@2nd> <@3rd>`');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  const roles = message.mentions.roles;
  if (roles.size < 3) {
    const reply = await message.channel.send('Usage: `:winner role <@1st> <@2nd> <@3rd>` - You must mention 3 roles.');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  const roleArray = Array.from(roles.values());
  const firstPlaceRole = roleArray[0].id;
  const secondPlaceRole = roleArray[1].id;
  const thirdPlaceRole = roleArray[2].id;

  await setWinnerRoles(message.guild.id, firstPlaceRole, secondPlaceRole, thirdPlaceRole);

  const replyMsg = await message.channel.send(`✅ Winner roles set!\n🥇 1st: <@&${firstPlaceRole}>\n🥈 2nd: <@&${secondPlaceRole}>\n🥉 3rd: <@&${thirdPlaceRole}>`);
  replyMsg.delete().catch(() => {});
}

export async function handleMatchCommand(message, args, guildSettings) {
  if (!hasAdminRole(message.member, guildSettings)) {
    const reply = await message.channel.send('You do not have permission to use this command.');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  if (args.length < 3) {
    const reply = await message.channel.send('Usage: `:m r<round> <match number> <code>` (e.g., `:m r1 1 ABC123`)');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  const roundStr = args[0];
  const matchNumber = parseInt(args[1]);
  const code = args[2];

  if (!roundStr || !roundStr.startsWith('r')) {
    const reply = await message.channel.send('Usage: `:m r<round> <match number> <code>` (e.g., `:m r1 1 ABC123`)');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  const round = parseInt(roundStr.substring(1));
  if (!round || !matchNumber || !code) {
    const reply = await message.channel.send('Usage: `:m r<round> <match number> <code>` (e.g., `:m r1 1 ABC123`)');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  const tournament = await getActiveTournament(message.guild.id);
  if (!tournament) {
    const reply = await message.channel.send('No active tournament found.');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  const match = await getMatchByNumber(tournament.id, round, matchNumber);

  if (!match) {
    const reply = await message.channel.send(`❌ Match ${matchNumber} not found in Round ${round}. Check the match number and try again.`);
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  await updateMatchCode(match.id, code);

  const randomImage = getRandomTourCodeImage();
  const imagePath = path.join(__dirname, 'images', randomImage);
  const attachment = new AttachmentBuilder(imagePath, { name: randomImage });

  const player1 = match.player1_id ? await message.client.users.fetch(match.player1_id) : null;
  const player2 = match.player2_id ? await message.client.users.fetch(match.player2_id) : null;

  const dmEmbed = new EmbedBuilder()
    .setColor('#FF6B6B')
    .setTitle(`🏆 ${tournament.name} Match - ${matchNumber}`)
    .setDescription('**⚠️⏳ You have 2 minutes to join the match! ⚠️⏳**')
    .addFields(
      { 
        name: '🎮 Teams', 
        value: `👥 **Team 1:** <@${match.player1_id}>\n👥 **Team 2:** ${match.player2_id ? `<@${match.player2_id}>` : 'BYE'}`,
        inline: false 
      },
      { 
        name: '🔒 Match Code', 
        value: `\`\`\`\n${code}\n\`\`\``,
        inline: false 
      },
      { 
        name: '📜 Match Instructions', 
        value: `🔹 🎮 Enter the code in-game as soon as possible.\n🔹 ⏱️ You have exactly **2 minutes** to join the match.\n🔹 ❌ Late join = **Instant Disqualification**.\n🔹 🔁 No rematches for disconnects or technical issues.\n🔹 🆘 For any problem, contact the tournament **support team**.`,
        inline: false 
      },
      { 
        name: '📢 Hoster', 
        value: `👑 ${message.author}`,
        inline: true 
      },
      { 
        name: '🥳 Sponsor', 
        value: '⭐ [Join our Discord!](https://discord.gg/HKHFcPnGJt)',
        inline: true 
      }
    )
    .setImage(`attachment://${randomImage}`)
    .setTimestamp();

  try {
    if (player1) {
      await player1.send({ embeds: [dmEmbed], files: [attachment] });
    }
    if (player2) {
      await player2.send({ embeds: [dmEmbed], files: [attachment] });
    }
    try {
      const reply = await message.channel.send(`✅ Match code sent for Round ${round}, Match ${matchNumber}!`);
      setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    } catch (replyErr) {
      const msg = await message.channel.send(`✅ Match code sent for Round ${round}, Match ${matchNumber}!`);
      msg.delete().catch(() => {});
    }
  } catch (error) {
    console.error('Error sending DM:', error);
    try {
      const reply = await message.channel.send('⚠️ Failed to send DM. Players may have DMs disabled.');
      setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    } catch (replyErr) {
      const msg = await message.channel.send('⚠️ Failed to send DM. Players may have DMs disabled.');
      msg.delete().catch(() => {});
    }
  }
}

export async function handleQualifyCommand(message, args, guildSettings) {
  if (!hasAdminRole(message.member, guildSettings)) {
    const reply = await message.channel.send('You do not have permission to use this command.');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  const roundStr = args[0];
  const winner = message.mentions.users.first();

  if (!roundStr || !roundStr.startsWith('r') || !winner) {
    const reply = await message.channel.send('Usage: `:q r<round> @winner`');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  const round = parseInt(roundStr.substring(1));
  const tournament = await getActiveTournament(message.guild.id);
  if (!tournament) {
    const reply = await message.channel.send('No active tournament found.');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  const matches = await getMatches(tournament.id, round);
  const match = matches.find(m => 
    (m.player1_id === winner.id || m.player2_id === winner.id) && !m.winner_id
  );

  if (!match) {
    const reply = await message.channel.send('Could not find a pending match for this player in this round.');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  await setMatchWinner(match.id, winner.id);

  const dmEmbed = new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle('🎉 Congratulations!')
    .setDescription(`You qualified for the next round in ${tournament.name}!`)
    .setTimestamp();

  try {
    await winner.send({ embeds: [dmEmbed] });
  } catch (error) {
    console.error('Error sending DM to winner:', error);
  }

  const totalRounds = Math.ceil(Math.log2(tournament.size));
  
  if (round >= totalRounds) {
    await updateTournamentStatus(tournament.id, 'completed');
    
    const allMatches = [];
    for (let r = 1; r <= totalRounds; r++) {
      const roundMatches = await getMatches(tournament.id, r);
      allMatches.push(...roundMatches);
    }
    
    const finalMatch = allMatches.find(m => m.round === totalRounds);
    const semiFinalMatches = allMatches.filter(m => m.round === totalRounds - 1);
    
    const firstPlace = winner.id;
    const secondPlace = finalMatch.player1_id === winner.id ? finalMatch.player2_id : finalMatch.player1_id;
    
    let thirdPlace = null;
    const showThirdPlace = await getThirdPlaceVisibility(tournament.guild_id);
    if (showThirdPlace && semiFinalMatches.length >= 2) {
      const loser1 = semiFinalMatches[0].player1_id === semiFinalMatches[0].winner_id ? 
        semiFinalMatches[0].player2_id : semiFinalMatches[0].player1_id;
      const loser2 = semiFinalMatches[1].player1_id === semiFinalMatches[1].winner_id ? 
        semiFinalMatches[1].player2_id : semiFinalMatches[1].player1_id;
      thirdPlace = loser1 !== secondPlace ? loser1 : loser2;
    }

    const settings = await getGuildSettings(tournament.guild_id);
    if (settings && settings.admin_channel_id) {
      const adminChannel = await message.client.channels.fetch(settings.admin_channel_id);
      await adminChannel.send('Tournament has ended. Announcing top placements.');
    }

    const announcementEmbed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`🏆 ${tournament.name} - Final Results`)
      .addFields(
        { name: '🥇 1st Place', value: `<@${firstPlace}>`, inline: false },
        { name: '🥈 2nd Place', value: `<@${secondPlace}>`, inline: false }
      )
      .setTimestamp();

    if (thirdPlace && showThirdPlace) {
      announcementEmbed.addFields(
        { name: '🥉 3rd Place', value: `<@${thirdPlace}>`, inline: false }
      );
    }

    const imageName = getRandomNormalImage();
    const imagePath = getImagePath(imageName);
    const attachment = new AttachmentBuilder(imagePath);
    announcementEmbed.setImage(`attachment://${imageName}`);

    const channel = await message.client.channels.fetch(tournament.channel_id);
    const sentMsg = await channel.send({ embeds: [announcementEmbed], files: [attachment] });

    // Assign winner roles if configured
    const winnerRoles = await getWinnerRoles(tournament.guild_id);
    const guild = await message.client.guilds.fetch(tournament.guild_id);
    const firstPlaceMember = await guild.members.fetch(firstPlace).catch(() => null);
    const secondPlaceMember = await guild.members.fetch(secondPlace).catch(() => null);
    const thirdPlaceMember = thirdPlace ? await guild.members.fetch(thirdPlace).catch(() => null) : null;

    if (firstPlaceMember && winnerRoles.first_place_role_id) {
      await firstPlaceMember.roles.add(winnerRoles.first_place_role_id).catch(() => {});
    }
    if (secondPlaceMember && winnerRoles.second_place_role_id) {
      await secondPlaceMember.roles.add(winnerRoles.second_place_role_id).catch(() => {});
    }
    if (thirdPlaceMember && winnerRoles.third_place_role_id) {
      await thirdPlaceMember.roles.add(winnerRoles.third_place_role_id).catch(() => {});
    }

    const reply = await message.channel.send(`🏆 Tournament completed! ${winner.username} is the champion!`);
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
  } else {
    const nextRound = round + 1;
    const reply = await message.channel.send(`${winner.username} has been advanced to Round ${nextRound}!`);
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
  }
}


export async function handleEndTourCommand(message, args, guildSettings) {
  if (!hasAdminRole(message.member, guildSettings)) {
    const reply = await message.channel.send('You do not have permission to use this command.');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  const tournament = await getActiveTournament(message.guild.id);
  if (!tournament) {
    const reply = await message.channel.send('No active tournament found.');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  if (args.length === 0) {
    const reply = await message.channel.send('❌ You must provide a reason to end the tournament. Usage: `:endtour <reason>`');
    setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
    return;
  }

  const reason = args.join(' ');

  // Delete the user's command message
  try {
    await message.delete().catch(() => {});
  } catch (error) {
    console.error('Error deleting command message:', error);
  }

  await updateTournamentStatus(tournament.id, 'completed');

  const endEmbed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle('🛑 Tournament Ended')
    .setDescription('The tournament has been officially closed.')
    .addFields(
      {
        name: '📌 Ended By',
        value: `<@${message.author.id}>`,
        inline: true
      },
      {
        name: '📝 Reason',
        value: reason,
        inline: true
      }
    )
    .setFooter({ text: '💫 Thank you to everyone who participated!' });

  const imageName = getRandomNormalImage();
  const imagePath = getImagePath(imageName);
  const attachment = new AttachmentBuilder(imagePath);
  endEmbed.setImage(`attachment://${imageName}`);

  try {
    const settings = await getGuildSettings(tournament.guild_id);
    if (settings && settings.tour_info_channel_id) {
      const channel = await message.client.channels.fetch(settings.tour_info_channel_id);
      await channel.send({ embeds: [endEmbed], files: [attachment] });
    } else if (tournament.channel_id) {
      // Fallback to tournament channel if tour_info_channel_id is not set
      const channel = await message.client.channels.fetch(tournament.channel_id);
      await channel.send({ embeds: [endEmbed], files: [attachment] });
    }
  } catch (error) {
    console.error('Error posting end tournament message:', error);
  }
}

export async function handleKickButton(interaction, userId, guildSettings) {
  if (!hasAdminRole(interaction.member, guildSettings)) {
    return interaction.reply({ content: 'You do not have permission to kick players.', ephemeral: true });
  }

  const tournament = await getActiveTournament(interaction.guild.id);
  if (!tournament) {
    return interaction.reply({ content: 'No active tournament found.', ephemeral: true });
  }

  await removePlayer(tournament.id, userId);
  await updateTournamentEmbed(interaction.client, tournament);
  await updatePlayerList(interaction.client, tournament);

  interaction.reply({ content: `Player <@${userId}> has been removed from the tournament.`, ephemeral: true });
}
