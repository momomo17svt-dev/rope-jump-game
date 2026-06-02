package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// InsertReport は UGC（公開アバター/名前）に対する通報を記録する。
// 通報相手の device_id は user_name から解決して保存しておく（名前は一意のため特定可能）。
// 解決できない場合（既に改名/削除済みなど）は device_id を NULL のまま記録する。
func InsertReport(ctx context.Context, pool *pgxpool.Pool, reporterDeviceID, reportedUserName, reason string) error {
	var reportedDeviceID *string
	// 失敗（該当なし）は無視し、NULL のまま通報を残す
	_ = pool.QueryRow(ctx,
		`SELECT device_id FROM global_rankings WHERE user_name = $1 LIMIT 1`,
		reportedUserName,
	).Scan(&reportedDeviceID)

	_, err := pool.Exec(ctx,
		`INSERT INTO reports (reporter_device_id, reported_device_id, reported_user_name, reason)
		 VALUES ($1, $2, $3, $4)`,
		nullIfEmpty(reporterDeviceID), reportedDeviceID, reportedUserName, nullIfEmpty(reason),
	)
	return err
}

func nullIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
