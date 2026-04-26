package core

import "testing"

func TestNormalizeFailureCategory(t *testing.T) {
	tests := []struct {
		name    string
		code    string
		message string
		want    string
	}{
		{name: "quota", code: "daily_quota", message: "Daily limit reached", want: "quota_reached"},
		{name: "send window", code: "", message: "outside send window", want: "send_window"},
		{name: "no device", code: "device_selection_failed", message: "no gateways configured", want: "no_device"},
		{name: "push", code: "push_failed", message: "firebase send failed", want: "push_failed"},
		{name: "sms provider", code: "RADIO_OFF", message: "SMS network unavailable", want: "sms_provider"},
		{name: "unknown", code: "", message: "unexpected failure", want: "unknown"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := normalizeFailureCategory(tt.code, tt.message); got != tt.want {
				t.Fatalf("normalizeFailureCategory() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestBuildFullError(t *testing.T) {
	tests := []struct {
		name    string
		code    string
		message string
		want    string
	}{
		{name: "code and message", code: "ERR", message: "details", want: "ERR: details"},
		{name: "code only", code: "ERR", message: "", want: "ERR"},
		{name: "message only", code: "", message: "details", want: "details"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := buildFullError(tt.code, tt.message); got != tt.want {
				t.Fatalf("buildFullError() = %q, want %q", got, tt.want)
			}
		})
	}
}
