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

// UNIQUE 制約が未存在なら追加
const addUniqueSQL = `
DO $$ BEGIN
    ALTER TABLE global_rankings
        ADD CONSTRAINT global_rankings_device_id_key UNIQUE (device_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`

// last_played_at カラムが未存在なら追加（既存テーブルへのマイグレーション）
const addLastPlayedAtSQL = `
ALTER TABLE global_rankings ADD COLUMN IF NOT EXISTS last_played_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
`

func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	for _, sql := range []string{createTableSQL, deduplicateSQL, addUniqueSQL, addLastPlayedAtSQL} {
		if _, err := pool.Exec(ctx, sql); err != nil {
			return err
		}
	}
	return nil
}
