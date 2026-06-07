package main

import (
	"encoding/base64"
	"testing"
	"time"
)

const validDeviceID = "123e4567-e89b-12d3-a456-426614174000"

func TestValidateScoreRequestAcceptsValidPayload(t *testing.T) {
	avatar := base64.StdEncoding.EncodeToString([]byte{
		0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n',
		0x00, 0x00, 0x00, 0x0d,
	})
	req := postScoreRequest{
		DeviceID: validDeviceID,
		UserName: "プレイヤー",
		Score:    maxScore,
		Avatar:   &avatar,
	}
	if msg := validateScoreRequest(req); msg != "" {
		t.Fatalf("validateScoreRequest() = %q, want empty", msg)
	}
}

func TestValidateScoreRequestRejectsAbusivePayloads(t *testing.T) {
	tests := []struct {
		name string
		req  postScoreRequest
		want string
	}{
		{
			name: "non uuid device id",
			req:  postScoreRequest{DeviceID: "attacker", UserName: "Alice", Score: 10},
			want: "invalid device_id",
		},
		{
			name: "blocked username",
			req:  postScoreRequest{DeviceID: validDeviceID, UserName: "f.u.c.k", Score: 10},
			want: "invalid user_name",
		},
		{
			name: "unrealistic score",
			req:  postScoreRequest{DeviceID: validDeviceID, UserName: "Alice", Score: maxScore + 1},
			want: "invalid score",
		},
		{
			name: "non image avatar",
			req: postScoreRequest{
				DeviceID: validDeviceID,
				UserName: "Alice",
				Score:    10,
				Avatar:   stringPtr(base64.StdEncoding.EncodeToString([]byte("not an image"))),
			},
			want: "invalid avatar",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := validateScoreRequest(tt.req); got != tt.want {
				t.Fatalf("validateScoreRequest() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestRateLimiterBlocksAfterLimit(t *testing.T) {
	limiter := newRateLimiter(2, time.Minute)
	if !limiter.Allow("key") || !limiter.Allow("key") {
		t.Fatal("first two requests should be allowed")
	}
	if limiter.Allow("key") {
		t.Fatal("third request should be rate limited")
	}
}

func stringPtr(s string) *string {
	return &s
}
