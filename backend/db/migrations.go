package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

const createTableSQL = `
CREATE TABLE IF NOT EXISTS global_rankings (
    id             BIGSERIAL PRIMARY KEY,
    device_id      TEXT NOT NULL,
    user_name      TEXT NOT NULL,
    score          INTEGER NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_global_rankings_score_desc
    ON global_rankings (score DESC, created_at ASC);

CREATE TABLE IF NOT EXISTS score_history (
    id        BIGSERIAL PRIMARY KEY,
    device_id TEXT NOT NULL,
    score     INTEGER NOT NULL,
    played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_score_history_played_at
    ON score_history (played_at DESC);
CREATE INDEX IF NOT EXISTS idx_score_history_device_id
    ON score_history (device_id, played_at DESC);
`

// 重複 device_id を除去（スコアが高い行を残す）
const deduplicateSQL = `
DELETE FROM global_rankings
WHERE id NOT IN (
    SELECT DISTINCT ON (device_id) id
    FROM global_rankings
    ORDER BY device_id, score DESC, created_at ASC
);
`

// UNIQUE 制約が未存在なら追加（42P07 = duplicate_table はインデックス重複時のエラーコード）
const addUniqueSQL = `
DO $$ BEGIN
    ALTER TABLE global_rankings
        ADD CONSTRAINT global_rankings_device_id_key UNIQUE (device_id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR SQLSTATE '42P07' THEN NULL;
END $$;
`

// last_played_at カラムが未存在なら追加（既存テーブルへのマイグレーション）
const addLastPlayedAtSQL = `
ALTER TABLE global_rankings ADD COLUMN IF NOT EXISTS last_played_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
`

// avatar カラム（ランキング表示用の立ち絵サムネ。64x64 JPEG の base64 文字列）。NULL はデフォルト絵を意味する
const addAvatarSQL = `
ALTER TABLE global_rankings ADD COLUMN IF NOT EXISTS avatar TEXT;
`

// UGC（公開アバター/名前）の通報を記録するテーブル。開発者が確認し、
// 該当 device_id のデータを DELETE /api/profile で削除できるようにするための窓口。
const createReportsSQL = `
CREATE TABLE IF NOT EXISTS reports (
    id                 BIGSERIAL PRIMARY KEY,
    reporter_device_id TEXT,
    reported_device_id TEXT,
    reported_user_name TEXT NOT NULL,
    reason             TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports (created_at DESC);
`

func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	for _, sql := range []string{createTableSQL, deduplicateSQL, addUniqueSQL, addLastPlayedAtSQL, addAvatarSQL, createReportsSQL} {
		if _, err := pool.Exec(ctx, sql); err != nil {
			return err
		}
	}
	return nil
}
