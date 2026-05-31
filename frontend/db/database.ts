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

  // マイグレーション: アバターカラムを追加（既存インストール対応）
  try {
    await database.execAsync('ALTER TABLE local_user ADD COLUMN avatar_stand_uri TEXT');
  } catch {
    // カラムが既に存在する場合は無視
  }
  try {
    await database.execAsync('ALTER TABLE local_user ADD COLUMN avatar_jump_uri TEXT');
  } catch {
    // カラムが既に存在する場合は無視
  }
  try {
    await database.execAsync('ALTER TABLE local_user ADD COLUMN ad_removed INTEGER DEFAULT 0');
  } catch {
    // カラムが既に存在する場合は無視
  }
  try {
    // ランキング表示用の立ち絵サムネ（64x64 JPEG の base64）。カスタム未設定なら null。
    await database.execAsync('ALTER TABLE local_user ADD COLUMN avatar_thumb TEXT');
  } catch {
    // カラムが既に存在する場合は無視
  }
}

export type LocalUser = {
  id: number;
  device_id: string;
  user_name: string;
  avatar_stand_uri: string | null;
  avatar_jump_uri: string | null;
  avatar_thumb: string | null;
};

export async function getLocalUser(): Promise<LocalUser | null> {
  const database = await getDB();
  const result = await database.getFirstAsync<LocalUser>(
    'SELECT id, device_id, user_name, avatar_stand_uri, avatar_jump_uri, avatar_thumb FROM local_user LIMIT 1'
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

export async function updateUserName(userName: string): Promise<void> {
  const database = await getDB();
  await database.runAsync('UPDATE local_user SET user_name = ?', userName);
}

export async function updateAvatarUris(
  standUri: string | null,
  jumpUri: string | null,
  standThumb: string | null
): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    'UPDATE local_user SET avatar_stand_uri = ?, avatar_jump_uri = ?, avatar_thumb = ?',
    standUri,
    jumpUri,
    standThumb
  );
}

export type ScoreRecord = {
  id: number;
  score: number;
  played_at: string;
};

export async function getScoreHistory(): Promise<ScoreRecord[]> {
  const database = await getDB();
  const rows = await database.getAllAsync<ScoreRecord>(
    'SELECT id, score, played_at FROM local_scores ORDER BY played_at DESC'
  );
  return rows;
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

export async function getAdRemoved(): Promise<boolean> {
  const database = await getDB();
  const result = await database.getFirstAsync<{ ad_removed: number }>(
    'SELECT ad_removed FROM local_user LIMIT 1'
  );
  return (result?.ad_removed ?? 0) === 1;
}

export async function setAdRemoved(value: boolean): Promise<void> {
  const database = await getDB();
  await database.runAsync('UPDATE local_user SET ad_removed = ?', value ? 1 : 0);
}

export async function clearLocalData(): Promise<void> {
  const database = await getDB();
  await database.execAsync(`
    DELETE FROM local_scores;
    DELETE FROM local_user;
  `);
}
