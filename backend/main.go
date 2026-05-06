package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
	"unicode/utf8"

	"github.com/Tatsunobu-Eto/rope-jump-game/backend/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	maxDeviceIDLen   = 64
	maxUserNameRunes = 12
	maxScore         = 1_000_000
	rankingLimit     = 100
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

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", healthHandler)
	mux.HandleFunc("POST /api/scores", postScoreHandler(pool))
	mux.HandleFunc("GET /api/rankings", getRankingsHandler(pool))
	mux.HandleFunc("GET /api/check-username", checkUsernameHandler(pool))
	mux.HandleFunc("PATCH /api/profile", patchProfileHandler(pool))

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

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}

type postScoreRequest struct {
	DeviceID string `json:"device_id"`
	UserName string `json:"user_name"`
	Score    int    `json:"score"`
}

func postScoreHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, 1<<10)
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

		if err := db.InsertScore(r.Context(), pool, req.DeviceID, req.UserName, req.Score); err != nil {
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
	if req.DeviceID == "" || len(req.DeviceID) > maxDeviceIDLen {
		return "invalid device_id"
	}
	nameLen := utf8.RuneCountInString(req.UserName)
	if nameLen < 1 || nameLen > maxUserNameRunes {
		return "invalid user_name"
	}
	if req.Score < 0 || req.Score > maxScore {
		return "invalid score"
	}
	return ""
}

type patchProfileRequest struct {
	DeviceID string `json:"device_id"`
	UserName string `json:"user_name"`
}

func patchProfileHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, 1<<10)
		dec := json.NewDecoder(r.Body)
		dec.DisallowUnknownFields()

		var req patchProfileRequest
		if err := dec.Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json")
			return
		}
		if req.DeviceID == "" || len(req.DeviceID) > maxDeviceIDLen {
			writeError(w, http.StatusBadRequest, "invalid device_id")
			return
		}
		if nameLen := utf8.RuneCountInString(req.UserName); nameLen < 1 || nameLen > maxUserNameRunes {
			writeError(w, http.StatusBadRequest, "invalid user_name")
			return
		}
		if err := db.UpdateProfile(r.Context(), pool, req.DeviceID, req.UserName); err != nil {
			log.Printf("update profile error: %v", err)
			writeError(w, http.StatusInternalServerError, "server error")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func checkUsernameHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		name := r.URL.Query().Get("name")
		deviceID := r.URL.Query().Get("device_id")
		if utf8.RuneCountInString(name) < 1 || utf8.RuneCountInString(name) > maxUserNameRunes {
			writeError(w, http.StatusBadRequest, "invalid name")
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
