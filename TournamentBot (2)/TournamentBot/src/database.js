import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id VARCHAR(255) PRIMARY KEY,
        admin_role_id VARCHAR(255),
        tour_channel_id VARCHAR(255),
        admin_channel_id VARCHAR(255),
        tournament_category_id VARCHAR(255),
        tour_info_channel_id VARCHAR(255),
        registered_players_channel_id VARCHAR(255),
        admin_only_channel_id VARCHAR(255),
        show_third_place BOOLEAN DEFAULT FALSE,
        first_place_role_id VARCHAR(255),
        second_place_role_id VARCHAR(255),
        third_place_role_id VARCHAR(255)
      );
    `);

    await client.query(`
      ALTER TABLE guild_settings 
      ADD COLUMN IF NOT EXISTS tournament_category_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS tour_info_channel_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS registered_players_channel_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS admin_only_channel_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS show_third_place BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS first_place_role_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS second_place_role_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS third_place_role_id VARCHAR(255)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        size INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        map VARCHAR(255),
        abilities VARCHAR(255),
        prize TEXT,
        status VARCHAR(50) DEFAULT 'registration',
        message_id VARCHAR(255),
        channel_id VARCHAR(255),
        player_list_message_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tournament_players (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'active',
        UNIQUE(tournament_id, user_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
        round INTEGER NOT NULL,
        match_number INTEGER NOT NULL,
        player1_id VARCHAR(255),
        player2_id VARCHAR(255),
        winner_id VARCHAR(255),
        code VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        next_match_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bracket_generations (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
        round INTEGER NOT NULL,
        generation_count INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tournament_id, round)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bot_guild_tracking (
        guild_id VARCHAR(255) PRIMARY KEY,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getGuildSettings(guildId) {
  const result = await pool.query(
    'SELECT * FROM guild_settings WHERE guild_id = $1',
    [guildId]
  );
  return result.rows[0] || null;
}

export async function setAdminRole(guildId, roleId) {
  await pool.query(
    `INSERT INTO guild_settings (guild_id, admin_role_id) 
     VALUES ($1, $2) 
     ON CONFLICT (guild_id) 
     DO UPDATE SET admin_role_id = $2`,
    [guildId, roleId]
  );
}

export async function setTourChannel(guildId, channelId) {
  await pool.query(
    `INSERT INTO guild_settings (guild_id, tour_channel_id) 
     VALUES ($1, $2) 
     ON CONFLICT (guild_id) 
     DO UPDATE SET tour_channel_id = $2`,
    [guildId, channelId]
  );
}

export async function setAdminChannel(guildId, channelId) {
  await pool.query(
    `INSERT INTO guild_settings (guild_id, admin_channel_id) 
     VALUES ($1, $2) 
     ON CONFLICT (guild_id) 
     DO UPDATE SET admin_channel_id = $2`,
    [guildId, channelId]
  );
}

export async function setTournamentChannels(guildId, categoryId, tourInfoId, registeredPlayersId, adminOnlyId) {
  await pool.query(
    `INSERT INTO guild_settings (guild_id, tournament_category_id, tour_info_channel_id, registered_players_channel_id, admin_only_channel_id) 
     VALUES ($1, $2, $3, $4, $5) 
     ON CONFLICT (guild_id) 
     DO UPDATE SET tournament_category_id = $2, tour_info_channel_id = $3, registered_players_channel_id = $4, admin_only_channel_id = $5`,
    [guildId, categoryId, tourInfoId, registeredPlayersId, adminOnlyId]
  );
}

export async function createTournament(guildId, size, name, map, abilities, prize, messageId, channelId) {
  const result = await pool.query(
    `INSERT INTO tournaments (guild_id, size, name, map, abilities, prize, message_id, channel_id) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
     RETURNING id`,
    [guildId, size, name, map, abilities, prize, messageId, channelId]
  );
  return result.rows[0].id;
}

export async function getActiveTournament(guildId) {
  const result = await pool.query(
    `SELECT * FROM tournaments 
     WHERE guild_id = $1 AND status != 'completed' 
     ORDER BY created_at DESC 
     LIMIT 1`,
    [guildId]
  );
  return result.rows[0] || null;
}

export async function getTournamentById(tournamentId) {
  const result = await pool.query(
    'SELECT * FROM tournaments WHERE id = $1',
    [tournamentId]
  );
  return result.rows[0] || null;
}

export async function registerPlayer(tournamentId, userId, username) {
  try {
    await pool.query(
      'INSERT INTO tournament_players (tournament_id, user_id, username) VALUES ($1, $2, $3)',
      [tournamentId, userId, username]
    );
    return true;
  } catch (error) {
    if (error.code === '23505') return false;
    throw error;
  }
}

export async function unregisterPlayer(tournamentId, userId) {
  const result = await pool.query(
    'DELETE FROM tournament_players WHERE tournament_id = $1 AND user_id = $2',
    [tournamentId, userId]
  );
  return result.rowCount > 0;
}

export async function getPlayers(tournamentId) {
  const result = await pool.query(
    'SELECT * FROM tournament_players WHERE tournament_id = $1 AND status = $2 ORDER BY registered_at',
    [tournamentId, 'active']
  );
  return result.rows;
}

export async function getPlayerCount(tournamentId) {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM tournament_players WHERE tournament_id = $1 AND status = $2',
    [tournamentId, 'active']
  );
  return parseInt(result.rows[0].count);
}

export async function updateTournamentStatus(tournamentId, status) {
  await pool.query(
    'UPDATE tournaments SET status = $1 WHERE id = $2',
    [status, tournamentId]
  );
}

export async function updatePlayerListMessage(tournamentId, messageId) {
  await pool.query(
    'UPDATE tournaments SET player_list_message_id = $1 WHERE id = $2',
    [messageId, tournamentId]
  );
}

export async function createMatch(tournamentId, round, matchNumber, player1Id, player2Id, nextMatchId = null) {
  const result = await pool.query(
    `INSERT INTO matches (tournament_id, round, match_number, player1_id, player2_id, next_match_id) 
     VALUES ($1, $2, $3, $4, $5, $6) 
     RETURNING id`,
    [tournamentId, round, matchNumber, player1Id, player2Id, nextMatchId]
  );
  return result.rows[0].id;
}

export async function getMatches(tournamentId, round) {
  const result = await pool.query(
    'SELECT * FROM matches WHERE tournament_id = $1 AND round = $2 ORDER BY match_number',
    [tournamentId, round]
  );
  return result.rows;
}

export async function getMatchByNumber(tournamentId, round, matchNumber) {
  const result = await pool.query(
    'SELECT * FROM matches WHERE tournament_id = $1 AND round = $2 AND match_number = $3',
    [tournamentId, round, matchNumber]
  );
  return result.rows[0] || null;
}

export async function updateMatchCode(matchId, code) {
  await pool.query(
    'UPDATE matches SET code = $1 WHERE id = $2',
    [code, matchId]
  );
}

export async function setMatchWinner(matchId, winnerId) {
  await pool.query(
    'UPDATE matches SET winner_id = $1, status = $2 WHERE id = $3',
    [winnerId, 'completed', matchId]
  );
}

export async function updateMatchPlayer(matchId, playerNumber, playerId) {
  const field = playerNumber === 1 ? 'player1_id' : 'player2_id';
  await pool.query(
    `UPDATE matches SET ${field} = $1 WHERE id = $2`,
    [playerId, matchId]
  );
}

export async function removePlayer(tournamentId, userId) {
  await pool.query(
    'UPDATE tournament_players SET status = $1 WHERE tournament_id = $2 AND user_id = $3',
    ['removed', tournamentId, userId]
  );
}

export async function getBracketGenerationCount(tournamentId, round) {
  const result = await pool.query(
    'SELECT generation_count FROM bracket_generations WHERE tournament_id = $1 AND round = $2',
    [tournamentId, round]
  );
  return result.rows[0]?.generation_count || 0;
}

export async function incrementBracketGeneration(tournamentId, round) {
  const result = await pool.query(
    `INSERT INTO bracket_generations (tournament_id, round, generation_count) 
     VALUES ($1, $2, 1) 
     ON CONFLICT (tournament_id, round) 
     DO UPDATE SET generation_count = bracket_generations.generation_count + 1
     RETURNING generation_count`,
    [tournamentId, round]
  );
  return result.rows[0].generation_count;
}

export async function deleteMatchesByRound(tournamentId, round) {
  await pool.query(
    'DELETE FROM matches WHERE tournament_id = $1 AND round = $2',
    [tournamentId, round]
  );
}

export async function getTrackedGuilds() {
  const result = await pool.query('SELECT guild_id FROM bot_guild_tracking');
  return result.rows.map(row => row.guild_id);
}

export async function addTrackedGuild(guildId) {
  await pool.query(
    `INSERT INTO bot_guild_tracking (guild_id) 
     VALUES ($1) 
     ON CONFLICT (guild_id) DO NOTHING`,
    [guildId]
  );
}

export async function getNewGuilds(currentGuildIds) {
  const trackedGuilds = await getTrackedGuilds();
  return currentGuildIds.filter(id => !trackedGuilds.includes(id));
}

export async function setThirdPlaceVisibility(guildId, show) {
  await pool.query(
    `INSERT INTO guild_settings (guild_id, show_third_place) 
     VALUES ($1, $2) 
     ON CONFLICT (guild_id) 
     DO UPDATE SET show_third_place = $2`,
    [guildId, show]
  );
}

export async function getThirdPlaceVisibility(guildId) {
  const result = await pool.query(
    'SELECT show_third_place FROM guild_settings WHERE guild_id = $1',
    [guildId]
  );
  return result.rows[0]?.show_third_place || false;
}

export async function setWinnerRoles(guildId, firstPlaceRoleId, secondPlaceRoleId, thirdPlaceRoleId) {
  await pool.query(
    `INSERT INTO guild_settings (guild_id, first_place_role_id, second_place_role_id, third_place_role_id) 
     VALUES ($1, $2, $3, $4) 
     ON CONFLICT (guild_id) 
     DO UPDATE SET first_place_role_id = $2, second_place_role_id = $3, third_place_role_id = $4`,
    [guildId, firstPlaceRoleId, secondPlaceRoleId, thirdPlaceRoleId]
  );
}

export async function getWinnerRoles(guildId) {
  const result = await pool.query(
    'SELECT first_place_role_id, second_place_role_id, third_place_role_id FROM guild_settings WHERE guild_id = $1',
    [guildId]
  );
  return result.rows[0] || { first_place_role_id: null, second_place_role_id: null, third_place_role_id: null };
}

export default pool;
