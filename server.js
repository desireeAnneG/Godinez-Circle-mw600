/* ============================================================
   Circle — Express + MySQL server
   Serves the frontend in /circle and the JSON API under /api
   ============================================================ */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const DB_NAME = process.env.DB_NAME || 'circle_db';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  charset: 'utf8mb4'
};

const RELATIONSHIPS = ['Best Friend', 'Friend', 'Family', 'Classmate', 'Acquaintance'];
const FAVORITE_COLORS = ['Purple', 'Pink', 'Blue', 'Green', 'Orange', 'Red', 'Yellow'];

let pool; // created in start()

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' })); // profile photo is sent as a small data URL

/* ============================================================
   HELPERS
   ============================================================ */

function cleanString(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

// Returns 'YYYY-MM-DD' or null
function cleanDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(value + 'T00:00:00Z');
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value ? null : value;
}

// Accepts ["a","b"] or "a, b" and returns a clean, de-duplicated list
function cleanHobbies(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(',');
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const hobby = cleanString(item, 50);
    if (hobby && !seen.has(hobby.toLowerCase())) {
      seen.add(hobby.toLowerCase());
      out.push(hobby);
    }
    if (out.length === 20) break;
  }
  return out;
}

function cleanId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/* ============================================================
   DATABASE SETUP
   Creates the database and runs database/circle_db.sql the first
   time the server starts, so nothing has to be imported by hand.
   (You can still import the .sql file in phpMyAdmin if you prefer.)
   ============================================================ */

async function setupDatabase() {
  if (!/^\w+$/.test(DB_NAME)) throw new Error(`Invalid DB_NAME "${DB_NAME}".`);

  const conn = await mysql.createConnection({ ...DB_CONFIG, multipleStatements: true });
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.query(`USE \`${DB_NAME}\``);

    const [found] = await conn.query("SHOW TABLES LIKE 'friends'");
    if (found.length === 0) {
      console.log('📦 Empty database found — creating tables and sample data...');
      const sqlFile = path.join(__dirname, 'database', 'circle_db.sql');
      const sql = fs
        .readFileSync(sqlFile, 'utf8')
        // the file's own CREATE DATABASE / USE lines are skipped; DB_NAME is used instead
        .replace(/^\s*(CREATE DATABASE|USE)\b[^;]*;/gim, '');
      await conn.query(sql);
    }
  } finally {
    await conn.end();
  }
}

/* ============================================================
   FRIEND QUERIES
   ============================================================ */

function shapeFriend(row, hobbies) {
  return {
    id: row.id,
    name: row.name,
    nickname: row.nickname || '',
    birthday: row.birthday || '',
    relationship: row.relationship,
    notes: row.notes || '',
    joined: row.joined || '',
    hobbies: hobbies || []
  };
}

async function fetchFriends(id) {
  const where = id ? 'WHERE id = ?' : '';
  const params = id ? [id] : [];

  const [rows] = await pool.query(
    `SELECT id, name, nickname, birthday, relationship, notes, joined
     FROM friends ${where}
     ORDER BY joined DESC, id DESC`,
    params
  );

  const [hobbyRows] = await pool.query(
    `SELECT friend_id, hobby FROM friend_hobbies
     ${id ? 'WHERE friend_id = ?' : ''}
     ORDER BY id`,
    params
  );

  const byFriend = new Map();
  for (const h of hobbyRows) {
    if (!byFriend.has(h.friend_id)) byFriend.set(h.friend_id, []);
    byFriend.get(h.friend_id).push(h.hobby);
  }

  return rows.map(r => shapeFriend(r, byFriend.get(r.id)));
}

async function saveHobbies(connection, friendId, hobbies) {
  await connection.query('DELETE FROM friend_hobbies WHERE friend_id = ?', [friendId]);
  if (hobbies.length) {
    await connection.query(
      'INSERT INTO friend_hobbies (friend_id, hobby) VALUES ?',
      [hobbies.map(h => [friendId, h])]
    );
  }
}

// Validates a friend body. Returns { error } or { data }.
function readFriendBody(body) {
  const name = cleanString(body.name, 80);
  if (!name) return { error: 'Name is required.' };

  return {
    data: {
      name,
      nickname: cleanString(body.nickname, 80) || null,
      birthday: cleanDate(body.birthday),
      relationship: RELATIONSHIPS.includes(body.relationship) ? body.relationship : 'Friend',
      notes: cleanString(body.notes, 1000) || null,
      hobbies: cleanHobbies(body.hobbies)
    }
  };
}

/* ============================================================
   FRIENDS API
   ============================================================ */

/* GET ALL FRIENDS */
app.get('/api/friends', async (req, res) => {
  try {
    res.json(await fetchFriends());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load friends.' });
  }
});

/* GET ONE FRIEND */
app.get('/api/friends/:id', async (req, res) => {
  try {
    const id = cleanId(req.params.id);
    const [friend] = id ? await fetchFriends(id) : [];

    if (!friend) return res.status(404).json({ error: 'Friend not found.' });
    res.json(friend);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load friend.' });
  }
});

/* ADD FRIEND */
app.post('/api/friends', async (req, res) => {
  const parsed = readFriendBody(req.body || {});
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const f = parsed.data;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO friends (name, nickname, birthday, relationship, notes, joined)
       VALUES (?, ?, ?, ?, ?, CURDATE())`,
      [f.name, f.nickname, f.birthday, f.relationship, f.notes]
    );
    await saveHobbies(connection, result.insertId, f.hobbies);

    await connection.commit();

    const [created] = await fetchFriends(result.insertId);
    res.status(201).json(created);
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to add friend.' });
  } finally {
    connection.release();
  }
});

/* UPDATE FRIEND */
app.put('/api/friends/:id', async (req, res) => {
  const id = cleanId(req.params.id);
  if (!id) return res.status(404).json({ error: 'Friend not found.' });

  const parsed = readFriendBody(req.body || {});
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const f = parsed.data;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [exists] = await connection.query('SELECT id FROM friends WHERE id = ?', [id]);
    if (!exists.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Friend not found.' });
    }

    await connection.query(
      `UPDATE friends
       SET name = ?, nickname = ?, birthday = ?, relationship = ?, notes = ?
       WHERE id = ?`,
      [f.name, f.nickname, f.birthday, f.relationship, f.notes, id]
    );
    await saveHobbies(connection, id, f.hobbies);

    await connection.commit();

    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to update friend.' });
  } finally {
    connection.release();
  }
});

/* DELETE FRIEND */
app.delete('/api/friends/:id', async (req, res) => {
  try {
    const id = cleanId(req.params.id);
    if (!id) return res.status(404).json({ error: 'Friend not found.' });

    const [result] = await pool.query('DELETE FROM friends WHERE id = ?', [id]);

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Friend not found.' });
    }

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete friend.' });
  }
});

/* ============================================================
   PROFILE API
   ============================================================ */

/* GET PROFILE */
app.get('/api/profile', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM profile WHERE id = 1');

    if (!rows.length) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    const p = rows[0];
    const [hobbyRows] = await pool.query(
      'SELECT hobby FROM profile_hobbies WHERE profile_id = 1 ORDER BY id'
    );

    res.json({
      name: p.name,
      tagline: p.tagline || '',
      location: p.location || '',
      joined: p.joined || '',
      bio: p.bio || '',
      favColor: p.fav_color,
      favFood: p.fav_food || '',
      favQuote: p.fav_quote || '',
      photo: p.photo || '',
      hobbies: hobbyRows.map(h => h.hobby),
      social: {
        instagram: p.instagram || '',
        twitter: p.twitter || '',
        email: p.email || ''
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load profile.' });
  }
});

/* UPDATE PROFILE */
app.put('/api/profile', async (req, res) => {
  const body = req.body || {};
  const name = cleanString(body.name, 80);

  if (!name) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  const favColor = FAVORITE_COLORS.includes(body.favColor) ? body.favColor : 'Purple';
  const social = body.social || {};
  const photo = typeof body.photo === 'string' && body.photo.startsWith('data:image/') ? body.photo : '';

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO profile
         (id, name, tagline, location, joined, bio, fav_color, fav_food, fav_quote, photo, instagram, twitter, email)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         tagline = VALUES(tagline),
         location = VALUES(location),
         joined = VALUES(joined),
         bio = VALUES(bio),
         fav_color = VALUES(fav_color),
         fav_food = VALUES(fav_food),
         fav_quote = VALUES(fav_quote),
         photo = VALUES(photo),
         instagram = VALUES(instagram),
         twitter = VALUES(twitter),
         email = VALUES(email)`,
      [
        name,
        cleanString(body.tagline, 80),
        cleanString(body.location, 80),
        cleanDate(body.joined),
        cleanString(body.bio, 1000),
        favColor,
        cleanString(body.favFood, 80),
        cleanString(body.favQuote, 255),
        photo,
        cleanString(social.instagram, 80),
        cleanString(social.twitter, 80),
        cleanString(social.email, 120)
      ]
    );

    await connection.query('DELETE FROM profile_hobbies WHERE profile_id = 1');
    const hobbies = cleanHobbies(body.hobbies);
    if (hobbies.length) {
      await connection.query(
        'INSERT INTO profile_hobbies (profile_id, hobby) VALUES ?',
        [hobbies.map(h => [1, h])]
      );
    }

    await connection.commit();

    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile.' });
  } finally {
    connection.release();
  }
});

/* ============================================================
   FRONTEND + FALLBACKS
   ============================================================ */

app.use(express.static(path.join(__dirname, 'circle')));

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'That image is too large.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

/* ============================================================
   START SERVER
   ============================================================ */

async function start() {
  try {
    await setupDatabase();
    pool = mysql.createPool({
      ...DB_CONFIG,
      database: DB_NAME,
      dateStrings: true, // DATE columns come back as 'YYYY-MM-DD' strings
      waitForConnections: true,
      connectionLimit: 10
    });
    await pool.query('SELECT 1');
  } catch (error) {
    console.error('❌ Could not connect to MySQL:', error.message);
    console.error('   Make sure MySQL is running (e.g. XAMPP) and the DB_* values in .env are correct.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`✅ Circle Server running on http://localhost:${PORT}`);
  });
}

start();
