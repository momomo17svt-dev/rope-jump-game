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

// スコア送信（プレイ時）: last_played_at を常に更新
const upsertSQL = `
INSERT INTO global_rankings (device_id, user_name, score, created_at, last_played_at)
VALUES ($1, $2, $3, NOW(), NOW())
ON CONFLICT (device_id) DO UPDATE SET
  user_name      = EXCLUDED.user_name,
  score          = GREATEST(global_rankings.score, EXCLUDED.score),
  created_at     = CASE
                     WHEN EXCLUDED.score > global_rankings.score THEN NOW()
                     ELSE global_rankings.created_at
                   END,
  last_played_at = NOW()
`

func InsertScore(ctx context.Context, pool *pgxpool.Pool, deviceID, userName string, score int) error {
	_, err := pool.Exec(ctx, upsertSQL, deviceID, userName, score)
	return err
}

// プロフィール更新（設定画面）: user_name のみ更新。last_played_at は変えない
const updateProfileSQL = `
UPDATE global_rankings SET user_name = $2 WHERE device_id = $1
`

func UpdateProfile(ctx context.Context, pool *pgxpool.Pool, deviceID, userName string) error {
	_, err := pool.Exec(ctx, updateProfileSQL, deviceID, userName)
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
WHERE last_played_at >= NOW() - INTERVAL '7 days'
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

// IsUserNameTaken は、指定した user_name が別の device_id に使われているか確認する
func IsUserNameTaken(ctx context.Context, pool *pgxpool.Pool, userName, deviceID string) (bool, error) {
	var count int
	err := pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM global_rankings WHERE user_name = $1 AND device_id != $2`,
		userName, deviceID,
	).Scan(&count)
	return count > 0, err
}

func TopRankings(ctx context.Context, pool *pgxpool.Pool, limit int) ([]Ranking, error) {
	return queryRankings(ctx, pool, topRankingsSQL, limit)
}

func TopWeeklyRankings(ctx context.Context, pool *pgxpool.Pool, limit int) ([]Ranking, error) {
	return queryRankings(ctx, pool, topWeeklyRankingsSQL, limit)
}
