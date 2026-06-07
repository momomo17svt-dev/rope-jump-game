package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/Tatsunobu-Eto/rope-jump-game/backend/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	maxDeviceIDLen   = 64
	maxUserNameRunes = 12
	// 現在のゲームは最速でも1スコア約220ms。10,000点でも約37分かかるため、
	// API直叩きによる非現実的なランキング汚染を抑える現実的な上限にする。
	maxScore     = 10_000
	maxReasonLen = 200
	rankingLimit = 100
	// アバターは 64x64 PNG/JPEG の base64。通常数KBだが余裕を持って上限を設定する。
	maxAvatarBase64Len = 64 * 1024
	// アバター base64 が乗るのでリクエストボディ上限を引き上げる。
	maxRequestBytes = 128 * 1024
)

var (
	readIPLimiter      = newRateLimiter(240, time.Minute)
	writeIPLimiter     = newRateLimiter(120, time.Minute)
	scoreRateLimiter   = newRateLimiter(20, time.Minute)
	reportRateLimiter  = newRateLimiter(10, time.Minute)
	profileRateLimiter = newRateLimiter(20, time.Minute)
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL env var is required")
	}

	bootCtx, cancelBoot := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancelBoot()

	pool, err := db.NewPool(bootCtx, dbURL)
	if err != nil {
		log.Fatalf("db connect failed: %v", err)
	}
	defer pool.Close()

	if err := db.Migrate(bootCtx, pool); err != nil {
		log.Fatalf("migration failed: %v", err)
	}

	// 古い score_history を定期削除して DB 肥大化を防ぐ（起動時＋24時間ごと）。
	go runScoreHistoryCleanup(pool)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", healthHandler)
	mux.HandleFunc("POST /api/scores", postScoreHandler(pool))
	mux.HandleFunc("GET /api/rankings", getRankingsHandler(pool))
	mux.HandleFunc("GET /api/check-username", checkUsernameHandler(pool))
	mux.HandleFunc("PATCH /api/profile", patchProfileHandler(pool))
	mux.HandleFunc("DELETE /api/profile", deleteProfileHandler(pool))
	mux.HandleFunc("POST /api/report", postReportHandler(pool))

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           withLogging(mux),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Printf("listening on :%s", port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server error: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	log.Println("shutting down...")

	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown error: %v", err)
	}
}

// runScoreHistoryCleanup は score_history の保持期間超過分を起動時と24時間ごとに削除する。
func runScoreHistoryCleanup(pool *pgxpool.Pool) {
	const retentionDays = 30
	cleanup := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		n, err := db.DeleteOldScoreHistory(ctx, pool, retentionDays)
		if err != nil {
			log.Printf("score_history cleanup error: %v", err)
			return
		}
		if n > 0 {
			log.Printf("score_history cleanup: deleted %d rows older than %d days", n, retentionDays)
		}
	}
	cleanup()
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()
	for range ticker.C {
		cleanup()
	}
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}

type postScoreRequest struct {
	DeviceID string  `json:"device_id"`
	UserName string  `json:"user_name"`
	Score    int     `json:"score"`
	Avatar   *string `json:"avatar"`
}

func postScoreHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowRequest(w, writeIPLimiter, "ip:"+clientIP(r)) {
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, maxRequestBytes)
		dec := json.NewDecoder(r.Body)
		dec.DisallowUnknownFields()

		var req postScoreRequest
		if err := dec.Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json")
			return
		}
		if msg := validateScoreRequest(req); msg != "" {
			writeError(w, http.StatusBadRequest, msg)
			return
		}
		if !allowRequest(w, scoreRateLimiter, "score:"+req.DeviceID) {
			return
		}
		if taken, err := db.IsUserNameTaken(r.Context(), pool, req.UserName, req.DeviceID); err != nil {
			log.Printf("score username check error: %v", err)
			writeError(w, http.StatusInternalServerError, "server error")
			return
		} else if taken {
			writeError(w, http.StatusConflict, "user_name taken")
			return
		}

		if err := db.InsertScore(r.Context(), pool, req.DeviceID, req.UserName, req.Score, req.Avatar); err != nil {
			log.Printf("upsert error: %v", err)
			writeError(w, http.StatusInternalServerError, "server error")
			return
		}
		if err := db.InsertScoreHistory(r.Context(), pool, req.DeviceID, req.Score); err != nil {
			log.Printf("score_history insert error: %v", err)
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func validateScoreRequest(req postScoreRequest) string {
	if !isValidDeviceID(req.DeviceID) {
		return "invalid device_id"
	}
	if !isValidUserName(req.UserName) {
		return "invalid user_name"
	}
	if req.Score < 0 || req.Score > maxScore {
		return "invalid score"
	}
	if !isValidAvatar(req.Avatar) {
		return "invalid avatar"
	}
	return ""
}

type patchProfileRequest struct {
	DeviceID string  `json:"device_id"`
	UserName string  `json:"user_name"`
	Avatar   *string `json:"avatar"`
}

func patchProfileHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowRequest(w, writeIPLimiter, "ip:"+clientIP(r)) {
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, maxRequestBytes)
		dec := json.NewDecoder(r.Body)
		dec.DisallowUnknownFields()

		var req patchProfileRequest
		if err := dec.Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json")
			return
		}
		if !isValidDeviceID(req.DeviceID) {
			writeError(w, http.StatusBadRequest, "invalid device_id")
			return
		}
		if !isValidUserName(req.UserName) {
			writeError(w, http.StatusBadRequest, "invalid user_name")
			return
		}
		if !isValidAvatar(req.Avatar) {
			writeError(w, http.StatusBadRequest, "invalid avatar")
			return
		}
		if !allowRequest(w, profileRateLimiter, "profile:"+req.DeviceID) {
			return
		}
		if taken, err := db.IsUserNameTaken(r.Context(), pool, req.UserName, req.DeviceID); err != nil {
			log.Printf("profile username check error: %v", err)
			writeError(w, http.StatusInternalServerError, "server error")
			return
		} else if taken {
			writeError(w, http.StatusConflict, "user_name taken")
			return
		}
		if err := db.UpdateProfile(r.Context(), pool, req.DeviceID, req.UserName, req.Avatar); err != nil {
			log.Printf("update profile error: %v", err)
			writeError(w, http.StatusInternalServerError, "server error")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func deleteProfileHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowRequest(w, writeIPLimiter, "ip:"+clientIP(r)) {
			return
		}
		deviceID := r.URL.Query().Get("device_id")
		if !isValidDeviceID(deviceID) {
			writeError(w, http.StatusBadRequest, "invalid device_id")
			return
		}
		if !allowRequest(w, profileRateLimiter, "profile:"+deviceID) {
			return
		}
		if err := db.DeleteProfile(r.Context(), pool, deviceID); err != nil {
			log.Printf("delete profile error: %v", err)
			writeError(w, http.StatusInternalServerError, "server error")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

type reportRequest struct {
	ReporterDeviceID string `json:"reporter_device_id"`
	ReportedUserName string `json:"reported_user_name"`
	Reason           string `json:"reason"`
}

func postReportHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowRequest(w, writeIPLimiter, "ip:"+clientIP(r)) {
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, maxRequestBytes)
		dec := json.NewDecoder(r.Body)
		dec.DisallowUnknownFields()

		var req reportRequest
		if err := dec.Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json")
			return
		}
		if n := utf8.RuneCountInString(req.ReportedUserName); n < 1 || n > maxUserNameRunes {
			writeError(w, http.StatusBadRequest, "invalid reported_user_name")
			return
		}
		if req.ReporterDeviceID != "" && !isValidDeviceID(req.ReporterDeviceID) {
			writeError(w, http.StatusBadRequest, "invalid reporter_device_id")
			return
		}
		if utf8.RuneCountInString(req.Reason) > maxReasonLen {
			writeError(w, http.StatusBadRequest, "invalid reason")
			return
		}
		reportKey := "report-ip:" + clientIP(r)
		if req.ReporterDeviceID != "" {
			reportKey = "report:" + req.ReporterDeviceID
		}
		if !allowRequest(w, reportRateLimiter, reportKey) {
			return
		}
		if err := db.InsertReport(r.Context(), pool, req.ReporterDeviceID, req.ReportedUserName, req.Reason); err != nil {
			log.Printf("insert report error: %v", err)
			writeError(w, http.StatusInternalServerError, "server error")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func checkUsernameHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowRequest(w, readIPLimiter, "ip:"+clientIP(r)) {
			return
		}
		name := r.URL.Query().Get("name")
		deviceID := r.URL.Query().Get("device_id")
		if !isValidUserName(name) {
			writeError(w, http.StatusBadRequest, "invalid name")
			return
		}
		if deviceID != "" && !isValidDeviceID(deviceID) {
			writeError(w, http.StatusBadRequest, "invalid device_id")
			return
		}
		taken, err := db.IsUserNameTaken(r.Context(), pool, name, deviceID)
		if err != nil {
			log.Printf("check-username error: %v", err)
			writeError(w, http.StatusInternalServerError, "server error")
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]bool{"available": !taken})
	}
}

func getRankingsHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowRequest(w, readIPLimiter, "ip:"+clientIP(r)) {
			return
		}
		var (
			rankings []db.Ranking
			err      error
		)
		if r.URL.Query().Get("period") == "weekly" {
			rankings, err = db.TopWeeklyRankings(r.Context(), pool, rankingLimit)
		} else {
			rankings, err = db.TopRankings(r.Context(), pool, rankingLimit)
		}
		if err != nil {
			log.Printf("query error: %v", err)
			writeError(w, http.StatusInternalServerError, "server error")
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(rankings)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

type rateBucket struct {
	start time.Time
	count int
}

type rateLimiter struct {
	mu      sync.Mutex
	limit   int
	window  time.Duration
	buckets map[string]rateBucket
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	return &rateLimiter{
		limit:   limit,
		window:  window,
		buckets: make(map[string]rateBucket),
	}
}

func (l *rateLimiter) Allow(key string) bool {
	now := time.Now()
	l.mu.Lock()
	defer l.mu.Unlock()

	bucket := l.buckets[key]
	if bucket.start.IsZero() || now.Sub(bucket.start) >= l.window {
		l.buckets[key] = rateBucket{start: now, count: 1}
		l.cleanupLocked(now)
		return true
	}
	if bucket.count >= l.limit {
		return false
	}
	bucket.count++
	l.buckets[key] = bucket
	return true
}

func (l *rateLimiter) cleanupLocked(now time.Time) {
	for key, bucket := range l.buckets {
		if now.Sub(bucket.start) >= l.window*2 {
			delete(l.buckets, key)
		}
	}
}

func allowRequest(w http.ResponseWriter, limiter *rateLimiter, key string) bool {
	if limiter.Allow(key) {
		return true
	}
	writeError(w, http.StatusTooManyRequests, "rate limit exceeded")
	return false
}

func clientIP(r *http.Request) string {
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		if ip := strings.TrimSpace(strings.Split(forwarded, ",")[0]); ip != "" {
			return ip
		}
	}
	if realIP := strings.TrimSpace(r.Header.Get("X-Real-IP")); realIP != "" {
		return realIP
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil && host != "" {
		return host
	}
	return r.RemoteAddr
}

func isValidDeviceID(s string) bool {
	if len(s) != 36 || len(s) > maxDeviceIDLen {
		return false
	}
	for i, r := range s {
		switch i {
		case 8, 13, 18, 23:
			if r != '-' {
				return false
			}
		default:
			if !isHex(r) {
				return false
			}
		}
	}
	return true
}

func isHex(r rune) bool {
	return (r >= '0' && r <= '9') || (r >= 'a' && r <= 'f') || (r >= 'A' && r <= 'F')
}

func isValidUserName(name string) bool {
	n := utf8.RuneCountInString(name)
	return n >= 1 && n <= maxUserNameRunes && isNameAllowed(name)
}

func isNameAllowed(name string) bool {
	normalized := normalizeName(name)
	if normalized == "" {
		return false
	}
	for _, banned := range bannedNameSubstrings {
		if strings.Contains(normalized, banned) {
			return false
		}
	}
	return true
}

func normalizeName(name string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(name) {
		if unicode.IsSpace(r) || unicode.IsPunct(r) || unicode.IsSymbol(r) {
			continue
		}
		b.WriteRune(r)
	}
	return b.String()
}

var bannedNameSubstrings = []string{
	"fuck", "shit", "bitch", "cunt", "asshole", "nigger", "faggot", "rape", "porn", "sex",
	"しね", "死ね", "ころす", "殺す", "きえろ", "ばか", "あほ", "うんこ", "ちんこ", "まんこ",
	"せっくす", "ふぁっく", "きちがい", "ぶっころ",
}

func isValidAvatar(avatar *string) bool {
	if avatar == nil {
		return true
	}
	if *avatar == "" || len(*avatar) > maxAvatarBase64Len {
		return false
	}
	decoded, err := base64.StdEncoding.DecodeString(*avatar)
	if err != nil {
		decoded, err = base64.RawStdEncoding.DecodeString(*avatar)
	}
	if err != nil || len(decoded) < 8 {
		return false
	}
	return isPNG(decoded) || isJPEG(decoded)
}

func isPNG(b []byte) bool {
	return len(b) >= 8 &&
		b[0] == 0x89 &&
		b[1] == 'P' &&
		b[2] == 'N' &&
		b[3] == 'G' &&
		b[4] == '\r' &&
		b[5] == '\n' &&
		b[6] == 0x1a &&
		b[7] == '\n'
}

func isJPEG(b []byte) bool {
	return len(b) >= 3 && b[0] == 0xff && b[1] == 0xd8 && b[2] == 0xff
}

func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		log.Printf("%s %s %d %s", r.Method, r.URL.Path, rec.status, time.Since(start))
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}
