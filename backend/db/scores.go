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

const insertSQL = `
INSERT INTO global_rankings (device_id, user_name, score, created_at)
VALUES ($1, $2, $3, NOW())
`

func InsertScore(ctx context.Context, pool *pgxpool.Pool, deviceID, userName string, score int) error {
	_, err := pool.Exec(ctx, insertSQL, deviceID, userName, score)
	return err
}

const topRankingsSQL = `
SELECT user_name, score
FROM global_rankings
ORDER BY score DESC, created_at ASC
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
