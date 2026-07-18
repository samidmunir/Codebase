package auth

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/samidmunir/go-job-tracker/server/internal/config"
	"github.com/samidmunir/go-job-tracker/server/internal/shared/response"
	"github.com/samidmunir/go-job-tracker/server/internal/user"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type Handler struct {
	service *Service
	config  *config.Config
}

func NewHandler(
	service *Service,
	cfg *config.Config,
) *Handler {
	return &Handler{
		service: service,
		config:  cfg,
	}
}

func (h *Handler) Register(ctx *gin.Context) {
	var request RegisterRequest

	if err := ctx.ShouldBindJSON(&request); err != nil {
		response.Error(
			ctx,
			http.StatusBadRequest,
			"INVALID_REGISTRATION_REQUEST",
			"Please provide valid registration information.",
			err.Error(),
		)
		return
	}

	result, refreshToken, err := h.service.Register(
		ctx.Request.Context(),
		request,
		h.clientMetadata(ctx),
	)
	if err != nil {
		h.handleAuthError(ctx, err)
		return
	}

	h.setRefreshCookie(ctx, refreshToken)

	response.JSON(
		ctx,
		http.StatusCreated,
		"Account created successfully.",
		result,
	)
}

func (h *Handler) Login(ctx *gin.Context) {
	var request LoginRequest

	if err := ctx.ShouldBindJSON(&request); err != nil {
		response.Error(
			ctx,
			http.StatusBadRequest,
			"INVALID_LOGIN_REQUEST",
			"Please provide a valid email and password.",
			nil,
		)
		return
	}

	result, refreshToken, err := h.service.Login(
		ctx.Request.Context(),
		request,
		h.clientMetadata(ctx),
	)
	if err != nil {
		h.handleAuthError(ctx, err)
		return
	}

	h.setRefreshCookie(ctx, refreshToken)

	response.JSON(
		ctx,
		http.StatusOK,
		"Login successful.",
		result,
	)
}

func (h *Handler) Refresh(ctx *gin.Context) {
	refreshToken, err := ctx.Cookie(
		h.config.Cookie.RefreshName,
	)
	if err != nil {
		response.Error(
			ctx,
			http.StatusUnauthorized,
			"REFRESH_TOKEN_REQUIRED",
			"A valid refresh session is required.",
			nil,
		)
		return
	}

	result, rotatedRefreshToken, err := h.service.Refresh(
		ctx.Request.Context(),
		refreshToken,
		h.clientMetadata(ctx),
	)
	if err != nil {
		h.clearRefreshCookie(ctx)
		h.handleAuthError(ctx, err)
		return
	}

	h.setRefreshCookie(ctx, rotatedRefreshToken)

	response.JSON(
		ctx,
		http.StatusOK,
		"Session refreshed successfully.",
		result,
	)
}

func (h *Handler) Logout(ctx *gin.Context) {
	refreshToken, _ := ctx.Cookie(
		h.config.Cookie.RefreshName,
	)

	if err := h.service.Logout(
		ctx.Request.Context(),
		refreshToken,
	); err != nil {
		response.InternalServerError(ctx)
		return
	}

	h.clearRefreshCookie(ctx)

	response.JSON(
		ctx,
		http.StatusOK,
		"Logout successful.",
		nil,
	)
}

func (h *Handler) Me(ctx *gin.Context) {
	value, exists := ctx.Get(CurrentUserIDKey)
	if !exists {
		response.Error(
			ctx,
			http.StatusUnauthorized,
			"AUTHENTICATION_REQUIRED",
			"Authentication is required.",
			nil,
		)
		return
	}

	userID, ok := value.(bson.ObjectID)
	if !ok {
		response.InternalServerError(ctx)
		return
	}

	currentUser, err := h.service.GetCurrentUser(
		ctx.Request.Context(),
		userID,
	)
	if err != nil {
		if errors.Is(err, user.ErrNotFound) {
			response.Error(
				ctx,
				http.StatusUnauthorized,
				"USER_NOT_FOUND",
				"The authenticated user no longer exists.",
				nil,
			)
			return
		}

		response.InternalServerError(ctx)
		return
	}

	response.JSON(
		ctx,
		http.StatusOK,
		"Authenticated user retrieved successfully.",
		currentUser,
	)
}

func (h *Handler) setRefreshCookie(
	ctx *gin.Context,
	token string,
) {
	maxAge := int(h.config.Auth.RefreshTTL.Seconds())

	ctx.SetSameSite(h.sameSiteMode())

	ctx.SetCookie(
		h.config.Cookie.RefreshName,
		token,
		maxAge,
		h.config.App.APIPrefix+"/auth",
		h.config.Cookie.Domain,
		h.config.Cookie.Secure,
		true,
	)
}

func (h *Handler) clearRefreshCookie(ctx *gin.Context) {
	ctx.SetSameSite(h.sameSiteMode())

	ctx.SetCookie(
		h.config.Cookie.RefreshName,
		"",
		-1,
		h.config.App.APIPrefix+"/auth",
		h.config.Cookie.Domain,
		h.config.Cookie.Secure,
		true,
	)
}

func (h *Handler) sameSiteMode() http.SameSite {
	switch h.config.Cookie.SameSite {
	case "strict":
		return http.SameSiteStrictMode
	case "none":
		return http.SameSiteNoneMode
	default:
		return http.SameSiteLaxMode
	}
}

func (h *Handler) clientMetadata(
	ctx *gin.Context,
) ClientMetadata {
	return ClientMetadata{
		UserAgent: ctx.Request.UserAgent(),
		IPAddress: ctx.ClientIP(),
	}
}

func (h *Handler) handleAuthError(
	ctx *gin.Context,
	err error,
) {
	switch {
	case errors.Is(err, user.ErrEmailInUse):
		response.Error(
			ctx,
			http.StatusConflict,
			"EMAIL_ALREADY_IN_USE",
			"An account already exists for that email address.",
			nil,
		)

	case errors.Is(err, ErrInvalidCredentials):
		response.Error(
			ctx,
			http.StatusUnauthorized,
			"INVALID_CREDENTIALS",
			"Invalid email or password.",
			nil,
		)

	case errors.Is(err, ErrInvalidSession),
		errors.Is(err, ErrInvalidToken):
		response.Error(
			ctx,
			http.StatusUnauthorized,
			"INVALID_SESSION",
			"The session is invalid or expired.",
			nil,
		)

	default:
		if err != nil &&
			containsPasswordValidationMessage(err.Error()) {
			response.Error(
				ctx,
				http.StatusBadRequest,
				"WEAK_PASSWORD",
				err.Error(),
				nil,
			)
			return
		}

		response.InternalServerError(ctx)
	}
}

func containsPasswordValidationMessage(message string) bool {
	return len(message) >= 8 &&
		(message[:8] == "password")
}

var _ = time.Second
