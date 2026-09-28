# Circle

A small friend directory — Node.js + Express + MySQL.

## Features
- Dashboard with quick stats and recently added friends
- Add, view, edit, and delete friends
- Editable personal profile (with photo upload)
- Data is stored in a MySQL database (`database/circle_db.sql`)

## Requirements
- Node.js 18+
- MySQL or MariaDB running locally (e.g. XAMPP)

## How to run
1. Start MySQL (XAMPP → Start MySQL).
2. Check `.env` — set `DB_PASSWORD` if your MySQL root user has one.
3. Install and start:
   ```
   npm install
   npm start
   ```
4. Open http://localhost:3000

The first time the server starts it creates the `circle_db` database, the tables,
and some sample data automatically. You can also import `database/circle_db.sql`
manually in phpMyAdmin (Import tab).

## Structure
```
Circle-main/
├── server.js              Express server + REST API
├── database/circle_db.sql SQL database (schema + sample data)
├── .env                   DB / port settings
└── circle/                Frontend (HTML, CSS, JS)
```

## API
| Method | Endpoint           | Description        |
| ------ | ------------------ | ------------------ |
| GET    | /api/friends       | List all friends   |
| GET    | /api/friends/:id   | Get one friend     |
| POST   | /api/friends       | Add a friend       |
| PUT    | /api/friends/:id   | Update a friend    |
| DELETE | /api/friends/:id   | Delete a friend    |
| GET    | /api/profile       | Get profile        |
| PUT    | /api/profile       | Update profile     |

Developed by Desiree Anne Godinez.
