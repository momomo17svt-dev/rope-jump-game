package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Ranking struct {
	Rank     int     `json:"rank"`
	UserName string  `json:"user_name"`
	Score    int     `json:"score"`
	Avatar   *string `json:"avatar,omitempty"`
}

// スコア送信（プレイ時）: last_played_at を常に更新。avatar はクライアントが常に現状態
// （カスタム=base64 / デフォルト=NULL）を送るため、そのまま上書きする。
const upsertSQL = `
INSERT INTO global_rankings (device_id, user_name, score, avatar, created_at, last_played_at)
VALUES ($1, $2, $3, $4, NOW(), NOW())
ON CONFLICT (device_id) DO UPDATE SET
  user_name      = EXCLUDED.user_name,
  score          = GREATEST(global_rankings.score, EXCLUDED.score),
  avatar         = EXCLUDED.avatar,
  created_at     = CASE
                     WHEN EXCLUDED.score > global_rankings.score THEN NOW()
                     ELSE global_rankings.created_at
                   END,
  last_played_at = NOW()
`

func InsertScore(ctx context.Context, pool *pgxpool.Pool, deviceID, userName string, score int, avatar *string) error {
	_, err := pool.Exec(ctx, upsertSQL, deviceID, userName, score, avatar)
	return err
}

func InsertScoreHistory(ctx context.Context, pool *pgxpool.Pool, deviceID string, score int) error {
	_, err := pool.Exec(ctx,
		`INSERT INTO score_history (device_id, score) VALUES ($1, $2)`,
		deviceID, score,
	)
	return err
}

// DeleteOldScoreHistory は保持期間を過ぎた score_history を削除する。
// 週間ランキングは直近7日しか参照しないため、古い履歴は不要。DB肥大化を防ぐ。
func DeleteOldScoreHistory(ctx context.Context, pool *pgxpool.Pool, olderThanDays int) (int64, error) {
	tag, err := pool.Exec(ctx,
		`DELETE FROM score_history WHERE played_at < NOW() - make_interval(days => $1)`,
		olderThanDays,
	)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

// データリセット: device_id に紐づくランキングデータをすべて削除
func DeleteProfile(ctx context.Context, pool *pgxpool.Pool, deviceID string) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `DELETE FROM score_history WHERE device_id = $1`, deviceID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM global_rankings WHERE device_id = $1`, deviceID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// プロフィール更新（設定画面）: user_name と avatar を更新。last_played_at は変えない。
// avatar はクライアントが現状態（base64 / NULL）を送るためそのまま上書きする。
const updateProfileSQL = `
UPDATE global_rankings SET user_name = $2, avatar = $3 WHERE device_id = $1
`

func UpdateProfile(ctx context.Context, pool *pgxpool.Pool, deviceID, userName string, avatar *string) error {
	_, err := pool.Exec(ctx, updateProfileSQL, deviceID, userName, avatar)
	return err
}

const topRankingsSQL = `
SELECT user_name, score, avatar
FROM global_rankings
ORDER BY score DESC, created_at ASC
LIMIT $1
`

// 今週プレイした人の「今週内ベスト」を表示。ユーザー名・アバターは global_rankings から最新を取得
const topWeeklyRankingsSQL = `
WITH weekly_best AS (
    SELECT device_id, MAX(score) AS score
    FROM score_history
    WHERE played_at >= NOW() - INTERVAL '7 days'
    GROUP BY device_id
)
SELECT gr.user_name, wb.score, gr.avatar
FROM weekly_best wb
JOIN global_rankings gr ON gr.device_id = wb.device_id
ORDER BY wb.score DESC, gr.created_at ASC
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
		if err := rows.Scan(&r.UserName, &r.Score, &r.Avatar); err != nil {
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
