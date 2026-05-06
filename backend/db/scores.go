package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Ranking struct {
	Rank     int    `json:"rank"`
	UserName string `json:"user_name"`
	Score    int    `json:"score"`
}

const upsertSQL = `
INSERT INTO global_rankings (device_id, user_name, score, updated_at)
VALUES ($1, $2, $3, NOW())
ON CONFLICT (device_id) DO UPDATE
SET user_name  = EXCLUDED.user_name,
    score      = EXCLUDED.score,
    updated_at = NOW()
WHERE global_rankings.score < EXCLUDED.score
`

func UpsertScore(ctx context.Context, pool *pgxpool.Pool, deviceID, userName string, score int) error {
	_, err := pool.Exec(ctx, upsertSQL, deviceID, userName, score)
	return err
}

const topRankingsSQL = `
SELECT user_name, score
FROM global_rankings
ORDER BY score DESC, updated_at ASC
LIMIT $1
`

func TopRankings(ctx context.Context, pool *pgxpool.Pool, limit int) ([]Ranking, error) {
	rows, err := pool.Query(ctx, topRankingsSQL, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]Ranking, 0, limit)
	rank := 1
	for rows.Next() {
		var r Ranking
		if err := rows.Scan(&r.UserName, &r.Score); err != nil {
			return nil, err
		}
		r.Rank = rank
		rank++
		out = append(out, r)
	}
	return out, rows.Err()
}
