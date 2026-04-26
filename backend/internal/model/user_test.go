package model

import "testing"

func TestIsPlatformAdminEmail(t *testing.T) {
	tests := []struct {
		name  string
		email string
		want  bool
	}{
		{name: "zenderock domain", email: "admin@zenderock.me", want: true},
		{name: "case insensitive", email: "ADMIN@ZENDEROCK.ME", want: true},
		{name: "trim spaces", email: " admin@zenderock.me ", want: true},
		{name: "different domain", email: "admin@example.com", want: false},
		{name: "lookalike suffix", email: "admin@fakezenderock.me", want: false},
		{name: "subdomain", email: "admin@ops.zenderock.me", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsPlatformAdminEmail(tt.email); got != tt.want {
				t.Fatalf("IsPlatformAdminEmail(%q) = %v, want %v", tt.email, got, tt.want)
			}
		})
	}
}
