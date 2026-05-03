import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('rope_jump.db');
  }
  return db;
}

export async function initDB(): Promise<void> {
  const database = await getDB();
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS local_user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      user_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      score INTEGER NOT NULL,
      played_at TEXT NOT NULL
    );
  `);
}

export async function getLocalUser(): Promise<{ id: number; device_id: string; user_name: string } | null> {
  const database = await getDB();
  const result = await database.getFirstAsync<{ id: number; device_id: string; user_name: string }>(
    'SELECT * FROM local_user LIMIT 1'
  );
  return result ?? null;
}

export async function saveLocalUser(deviceId: string, userName: string): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    'INSERT INTO local_user (device_id, user_name) VALUES (?, ?)',
    deviceId,
    userName
  );
}

export async function saveScore(score: number): Promise<void> {
  const database = await getDB();
  const playedAt = new Date().toISOString();
  await database.runAsync(
    'INSERT INTO local_scores (score, played_at) VALUES (?, ?)',
    score,
    playedAt
  );
}

export async function getBestScore(): Promise<number | null> {
  const database = await getDB();
  const result = await database.getFirstAsync<{ best: number | null }>(
    'SELECT MAX(score) as best FROM local_scores'
  );
  return result?.best ?? null;
}
