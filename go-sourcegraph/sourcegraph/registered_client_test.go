package sourcegraph

import (
	"reflect"
	"testing"
)

func TestRegisteredClientCredentials_TextMarshalerUnmarshaler(t *testing.T) {
	tests := []struct {
		creds RegisteredClientCredentials
	}{
		{creds: RegisteredClientCredentials{ID: "a", Secret: "b"}},
		{creds: RegisteredClientCredentials{ID: "", Secret: "b"}},
		{creds: RegisteredClientCredentials{ID: "a", Secret: ""}},
		{creds: RegisteredClientCredentials{ID: "a", Secret: "c\nd"}},
		{creds: RegisteredClientCredentials{ID: "a\nb", Secret: "c"}},
		{creds: RegisteredClientCredentials{ID: "a\nb", Secret: "c\nd"}},
		{creds: RegisteredClientCredentials{ID: "a\x00b", Secret: "c"}},
		{creds: RegisteredClientCredentials{ID: "a", Secret: "c\x00d"}},
		{creds: RegisteredClientCredentials{ID: "a\x00b", Secret: "c\x00d"}},
	}
	for _, test := range tests {
		txt, err := test.creds.MarshalText()
		if err != nil {
			t.Errorf("%v: MarshalText error: %s", test.creds, err)
			continue
		}

		var creds RegisteredClientCredentials
		if err := creds.UnmarshalText(txt); err != nil {
			t.Errorf("%v: UnmarshalText error: %s", txt, err)
			continue
		}
		if !reflect.DeepEqual(creds, test.creds) {
			t.Errorf("got %+v, want %+v", creds, test.creds)
		}
	}
}

func TestRegisteredClient_ClientNameOrDefault(t *testing.T) {
	tests := []struct {
		client *RegisteredClient
		want   string
	}{
		{
			client: &RegisteredClient{ClientName: "a"},
			want:   "a",
		},
		{
			client: &RegisteredClient{ID: "a"},
			want:   "Client a",
		},
		{
			client: &RegisteredClient{ID: "abcdefghijk"},
			want:   "Client abcde",
		},
	}
	for _, test := range tests {
		got := test.client.ClientNameOrDefault()
		if got != test.want {
			t.Errorf("%v: got %q, want %q", test.client, got, test.want)
		}
	}
}
