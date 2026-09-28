-- ============================================================
-- Circle — MySQL / MariaDB database
-- Import this file in phpMyAdmin (Import tab) or run:
--   mysql -u root -p < database/circle_db.sql
-- server.js will also run this file automatically the first time
-- it starts, if the database has not been created yet.
-- ============================================================

CREATE DATABASE IF NOT EXISTS circle_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE circle_db;

-- ---------- friends ----------
CREATE TABLE IF NOT EXISTS friends (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(80)  NOT NULL,
  nickname     VARCHAR(80)  NULL,
  birthday     DATE         NULL,
  relationship VARCHAR(30)  NOT NULL DEFAULT 'Friend',
  notes        VARCHAR(1000) NULL,
  joined       DATE         NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- friend_hobbies (one row per hobby) ----------
CREATE TABLE IF NOT EXISTS friend_hobbies (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  friend_id INT UNSIGNED NOT NULL,
  hobby     VARCHAR(50)  NOT NULL,
  PRIMARY KEY (id),
  KEY idx_friend_hobbies_friend (friend_id),
  CONSTRAINT fk_friend_hobbies_friend
    FOREIGN KEY (friend_id) REFERENCES friends (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- profile (single row, id = 1) ----------
CREATE TABLE IF NOT EXISTS profile (
  id         TINYINT UNSIGNED NOT NULL,
  name       VARCHAR(80)   NOT NULL,
  tagline    VARCHAR(80)   NULL,
  location   VARCHAR(80)   NULL,
  joined     DATE          NULL,
  bio        VARCHAR(1000) NULL,
  fav_color  VARCHAR(20)   NOT NULL DEFAULT 'Purple',
  fav_food   VARCHAR(80)   NULL,
  fav_quote  VARCHAR(255)  NULL,
  photo      MEDIUMTEXT    NULL,
  instagram  VARCHAR(80)   NULL,
  twitter    VARCHAR(80)   NULL,
  email      VARCHAR(120)  NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- profile_hobbies ----------
CREATE TABLE IF NOT EXISTS profile_hobbies (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  profile_id TINYINT UNSIGNED NOT NULL,
  hobby      VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_profile_hobbies_profile (profile_id),
  CONSTRAINT fk_profile_hobbies_profile
    FOREIGN KEY (profile_id) REFERENCES profile (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Sample data
-- ============================================================

INSERT INTO profile
  (id, name, tagline, location, joined, bio, fav_color, fav_food, fav_quote, photo, instagram, twitter, email)
VALUES
  (1, 'Desiree Anne Godinez', 'BSIT Student', 'Cebu, Philippines', '2026-01-01',
   'Hi! I’m Desiree, a BSIT student who loves full-stack dev, Figma, and building small tools that feel nice to use.',
   'Purple', 'Cupcakes', 'Collect memories, not things.', '', '', '', '');

INSERT INTO profile_hobbies (profile_id, hobby) VALUES
  (1, 'Drawing'), (1, 'Gaming'), (1, 'Reading'), (1, 'Photography');

INSERT INTO friends (id, name, nickname, birthday, relationship, notes, joined) VALUES
  (1, 'Maribel Uy',    'Mars', '2004-02-14', 'Best Friend', 'Always down for a boardgame night. Plays guitar badly but with confidence.', '2026-02-14'),
  (2, 'Carlo Reyes',   'Cee',  '2003-11-08', 'Classmate',   'Runs the block’s badminton group chat. Backend leaning, frontend curious.', '2026-03-02'),
  (3, 'Nadine Flores', 'Nad',  '2004-06-21', 'Best Friend', 'Will redesign your slide deck without being asked.', '2026-01-27'),
  (4, 'Joshua Tan',    'Josh', '2003-09-30', 'Friend',      'IT rep for the block. Knows every professor’s consultation schedule by heart.', '2026-04-09');

INSERT INTO friend_hobbies (friend_id, hobby) VALUES
  (1, 'Coffee'), (1, 'Boardgames'), (1, 'Thesis squad'),
  (2, 'Badminton'), (2, 'React'), (2, 'Night owl'),
  (3, 'UI Design'), (3, 'K-drama'), (3, 'Figma'),
  (4, 'Basketball'), (4, 'Org work');
