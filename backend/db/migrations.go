package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

const schemaSQL = `
DROP TABLE IF EXISTS global_rankings;
CREATE TABLE global_rankings (
    id         BIGSERIAL PRIMARY KEY,
    device_id  TEXT NOT NULL,
    user_name  TEXT NOT NULL,
    score      INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_global_rankings_score_desc
    ON global_rankings (score DESC, created_at ASC);
`

func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, schemaSQL)
	return err
}
