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

// device_id をキーに UPSERT:
//   - user_name は常に更新
//   - score はより高い値のみ更新
//   - created_at はスコアが更新されたときのみ更新（週間ランキングの基準）
const upsertSQL = `
INSERT INTO global_rankings (device_id, user_name, score, created_at)
VALUES ($1, $2, $3, NOW())
ON CONFLICT (device_id) DO UPDATE SET
  user_name  = EXCLUDED.user_name,
  score      = GREATEST(global_rankings.score, EXCLUDED.score),
  created_at = CASE
                 WHEN EXCLUDED.score > global_rankings.score THEN NOW()
                 ELSE global_rankings.created_at
               END
`

func InsertScore(ctx context.Context, pool *pgxpool.Pool, deviceID, userName string, score int) error {
	_, err := pool.Exec(ctx, upsertSQL, deviceID, userName, score)
	return err
}

const topRankingsSQL = `
SELECT user_name, score
FROM global_rankings
ORDER BY score DESC, created_at ASC
LIMIT $1
`

const topWeeklyRankingsSQL = `
SELECT user_name, score
FROM global_rankings
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY score DESC, created_at ASC
LIMIT $1
`

func queryRankings(ctx context.Context, pool *pgxpool.Pool, sql string, limit int) ([]Ranking, error) {
	rows, err := pool.Query(ctx, sql, limit)
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

func TopRankings(ctx context.Context, pool *pgxpool.Pool, limit int) ([]Ranking, error) {
	return queryRankings(ctx, pool, topRankingsSQL, limit)
}

func TopWeeklyRankings(ctx context.Context, pool *pgxpool.Pool, limit int) ([]Ranking, error) {
	return queryRankings(ctx, pool, topWeeklyRankingsSQL, limit)
}
