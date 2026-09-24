package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
)

func newTestAuthHandler() *Handler {
	tokenManager := NewTokenManager(
		"atlas-test-secret",
		15*time.Minute,
	)

	service := &Service{
		tokens: tokenManager,
	}

	return &Handler{
		service: service,
	}
}

func TestAuthenticateRejectsMissingAuthorizationHeader(t *testing.T) {
	handler := newTestAuthHandler()

	next := http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("protected handler should not be reached")
		},
	)

	protected := handler.Authenticate(next)

	req := httptest.NewRequest(
		http.MethodGet,
		"/api/v1/auth/me",
		nil,
	)

	rec := httptest.NewRecorder()

	protected.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf(
			"expected status %d, got %d",
			http.StatusUnauthorized,
			rec.Code,
		)
	}
}

func TestAuthenticateRejectsMalformedAuthorizationHeader(t *testing.T) {
	handler := newTestAuthHandler()

	next := http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("protected handler should not be reached")
		},
	)

	protected := handler.Authenticate(next)

	req := httptest.NewRequest(
		http.MethodGet,
		"/api/v1/auth/me",
		nil,
	)

	req.Header.Set(
		"Authorization",
		"Bearer",
	)

	rec := httptest.NewRecorder()

	protected.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf(
			"expected status %d, got %d",
			http.StatusUnauthorized,
			rec.Code,
		)
	}
}

func TestAuthenticateRejectsWrongAuthorizationScheme(t *testing.T) {
	handler := newTestAuthHandler()

	next := http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("protected handler should not be reached")
		},
	)

	protected := handler.Authenticate(next)

	req := httptest.NewRequest(
		http.MethodGet,
		"/api/v1/auth/me",
		nil,
	)

	req.Header.Set(
		"Authorization",
		"Basic some-credentials",
	)

	rec := httptest.NewRecorder()

	protected.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf(
			"expected status %d, got %d",
			http.StatusUnauthorized,
			rec.Code,
		)
	}
}

func TestAuthenticateRejectsInvalidAccessToken(t *testing.T) {
	handler := newTestAuthHandler()

	next := http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("protected handler should not be reached")
		},
	)

	protected := handler.Authenticate(next)

	req := httptest.NewRequest(
		http.MethodGet,
		"/api/v1/auth/me",
		nil,
	)

	req.Header.Set(
		"Authorization",
		"Bearer definitely-not-a-valid-jwt",
	)

	rec := httptest.NewRecorder()

	protected.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf(
			"expected status %d, got %d",
			http.StatusUnauthorized,
			rec.Code,
		)
	}
}

func TestAuthenticateRejectsTokenSignedWithWrongSecret(t *testing.T) {
	handler := newTestAuthHandler()

	otherTokenManager := NewTokenManager(
		"some-other-secret",
		15*time.Minute,
	)

	token, err := otherTokenManager.GenerateAccessToken(
		uuid.New(),
		"test@example.com",
	)
	if err != nil {
		t.Fatalf(
			"GenerateAccessToken() returned error: %v",
			err,
		)
	}

	next := http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("protected handler should not be reached")
		},
	)

	protected := handler.Authenticate(next)

	req := httptest.NewRequest(
		http.MethodGet,
		"/api/v1/auth/me",
		nil,
	)

	req.Header.Set(
		"Authorization",
		"Bearer "+token,
	)

	rec := httptest.NewRecorder()

	protected.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf(
			"expected status %d, got %d",
			http.StatusUnauthorized,
			rec.Code,
		)
	}
}

func TestAuthenticateRejectsExpiredAccessToken(t *testing.T) {
	handler := newTestAuthHandler()

	expiredTokenManager := NewTokenManager(
		"atlas-test-secret",
		-time.Minute,
	)

	token, err := expiredTokenManager.GenerateAccessToken(
		uuid.New(),
		"test@example.com",
	)
	if err != nil {
		t.Fatalf(
			"GenerateAccessToken() returned error: %v",
			err,
		)
	}

	next := http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("protected handler should not be reached")
		},
	)

	protected := handler.Authenticate(next)

	req := httptest.NewRequest(
		http.MethodGet,
		"/api/v1/auth/me",
		nil,
	)

	req.Header.Set(
		"Authorization",
		"Bearer "+token,
	)

	rec := httptest.NewRecorder()

	protected.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf(
			"expected status %d, got %d",
			http.StatusUnauthorized,
			rec.Code,
		)
	}
}

func TestAuthenticateAcceptsValidAccessToken(t *testing.T) {
	handler := newTestAuthHandler()

	userID := uuid.New()

	token, err := handler.service.tokens.GenerateAccessToken(
		userID,
		"test@example.com",
	)
	if err != nil {
		t.Fatalf(
			"GenerateAccessToken() returned error: %v",
			err,
		)
	}

	handlerReached := false

	next := http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			handlerReached = true
			w.WriteHeader(http.StatusOK)
		},
	)

	protected := handler.Authenticate(next)

	req := httptest.NewRequest(
		http.MethodGet,
		"/api/v1/auth/me",
		nil,
	)

	req.Header.Set(
		"Authorization",
		"Bearer "+token,
	)

	rec := httptest.NewRecorder()

	protected.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf(
			"expected status %d, got %d",
			http.StatusOK,
			rec.Code,
		)
	}

	if !handlerReached {
		t.Fatal("expected protected handler to be reached")
	}
}

func TestAuthenticateAddsUserIDToContext(t *testing.T) {
	handler := newTestAuthHandler()

	expectedUserID := uuid.New()

	token, err := handler.service.tokens.GenerateAccessToken(
		expectedUserID,
		"test@example.com",
	)
	if err != nil {
		t.Fatalf(
			"GenerateAccessToken() returned error: %v",
			err,
		)
	}

	next := http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			actualUserID, ok := UserIDFromContext(
				r.Context(),
			)

			if !ok {
				t.Fatal(
					"expected user ID in request context",
				)
			}

			if actualUserID != expectedUserID {
				t.Errorf(
					"expected user ID %s, got %s",
					expectedUserID,
					actualUserID,
				)
			}

			w.WriteHeader(http.StatusOK)
		},
	)

	protected := handler.Authenticate(next)

	req := httptest.NewRequest(
		http.MethodGet,
		"/api/v1/auth/me",
		nil,
	)

	req.Header.Set(
		"Authorization",
		"Bearer "+token,
	)

	rec := httptest.NewRecorder()

	protected.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf(
			"expected status %d, got %d",
			http.StatusOK,
			rec.Code,
		)
	}
}

func TestAuthenticateAcceptsCaseInsensitiveBearerScheme(t *testing.T) {
	handler := newTestAuthHandler()

	token, err := handler.service.tokens.GenerateAccessToken(
		uuid.New(),
		"test@example.com",
	)
	if err != nil {
		t.Fatalf(
			"GenerateAccessToken() returned error: %v",
			err,
		)
	}

	next := http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		},
	)

	protected := handler.Authenticate(next)

	req := httptest.NewRequest(
		http.MethodGet,
		"/api/v1/auth/me",
		nil,
	)

	req.Header.Set(
		"Authorization",
		"bearer "+token,
	)

	rec := httptest.NewRecorder()

	protected.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf(
			"expected status %d, got %d",
			http.StatusOK,
			rec.Code,
		)
	}
}
