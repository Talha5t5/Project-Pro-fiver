import 'dotenv/config';
import mysql from 'mysql2/promise';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function main() {
  const url = requireEnv('DATABASE_URL'); // e.g. mysql://user:pass@host:3306/dbname
  const u = new URL(url);
  const host = u.hostname;
  const port = Number(u.port || 3306);
  const user = decodeURIComponent(u.username);
  const password = decodeURIComponent(u.password);
  const database = u.pathname.replace(/^\//, '');

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    multipleStatements: true,
  });

  console.log('Connected to DB:', { host, port, database, user });

  // 1) Ensure InnoDB
  await conn.query('ALTER TABLE `users` ENGINE=InnoDB');

  // 2) Ensure id is AUTO_INCREMENT
  const [idColRows] = await conn.query(
    `SELECT EXTRA FROM information_schema.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id'`
  );
  const isAutoIncrement = Array.isArray(idColRows) && idColRows[0] && String(idColRows[0].EXTRA || '').toLowerCase().includes('auto_increment');
  if (!isAutoIncrement) {
    await conn.query('ALTER TABLE `users` MODIFY `id` INT NOT NULL AUTO_INCREMENT');
  }

  // 3) Ensure PRIMARY KEY on id
  const [pkRows] = await conn.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.TABLE_CONSTRAINTS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND CONSTRAINT_TYPE = 'PRIMARY KEY'`
  );
  if ((pkRows[0]?.cnt || 0) === 0) {
    await conn.query('ALTER TABLE `users` ADD PRIMARY KEY (`id`)');
  }

  // 4) Ensure unique index on username (handle TEXT vs VARCHAR)
  const [idxRows] = await conn.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'users_username_unique'`
  );
  if ((idxRows[0]?.cnt || 0) === 0) {
    const [colTypeRows] = await conn.query(
      `SELECT DATA_TYPE AS dt, CHARACTER_MAXIMUM_LENGTH AS len 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'username'`
    );
    const dt = String(colTypeRows[0]?.dt || '').toLowerCase();
    if (dt === 'text') {
      await conn.query('CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`(255))');
    } else {
      await conn.query('CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`)');
    }
  }

  // 5) Reset AUTO_INCREMENT to max(id)+1 (compute in JS to avoid quoting issues)
  const [nextRows] = await conn.query('SELECT COALESCE(MAX(id),0)+1 AS nextId FROM `users`');
  const nextId = nextRows[0]?.nextId || 1;
  await conn.query(`ALTER TABLE \`users\` AUTO_INCREMENT = ${Number(nextId)}`);

  console.log('✅ users table verified/fixed (engine, AUTO_INCREMENT, PK, unique username).');

  const [rows] = await conn.query('SHOW CREATE TABLE `users`');
  console.log('SHOW CREATE TABLE users:\n', rows[0]['Create Table']);

  await conn.end();
  console.log('Done. Retry registration now.');
}

main().catch((err) => {
  console.error('Fix failed:', err);
  process.exit(1);
});