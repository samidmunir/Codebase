package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/samidmunir/top-tier-customs/services/auth/internal/config"
	"github.com/samidmunir/top-tier-customs/services/auth/internal/db"
	"github.com/samidmunir/top-tier-customs/services/auth/internal/models"
	"github.com/samidmunir/top-tier-customs/services/auth/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

func Health(c *gin.Context) {
	c.JSON(200, gin.H{
		"message": "/api/v0/auth is live on http://localhost:8081/api/v0/auth",
		"ok": true,
		"source": "<api.v0.auth>: Health()",
	});
}

type SignupRequest struct {
	Email string `json:"email"`;
	Password string `json:"password"`;
	FirstName string `json:"firstName"`;
	LastName string `json:"lastName"`;
	City string `json:"city"`;
	Country string `json:"country"`;
	Phone string `json:"phone"`;
}

type LoginRequest struct {
	Email string `json:"email"`;
	Password string `json:"password"`;
}

func Signup(c *gin.Context) {
	var req SignupRequest;

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H {
			"ok": false,
			"source": "<api.v0.auth>: Signup()",
			"message": "Failed to signup.",
			"error": "Invalid request body.",
		});
		return;
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email));

	if req.Email == "" || req.Password == "" || req.FirstName == "" || req.LastName == "" || req.City == "" || req.Country == "" || req.Phone == "" {
		c.JSON(http.StatusBadRequest, gin.H {
			"ok": false,
			"source": "<api.v0.auth>: Signup()",
			"message": "Failed to signup.",
			"error": "Missing required fields.",
		});
		return;
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5 * time.Second);
	defer cancel();

	var existingUser models.User;
	err := db.UsersCollection.FindOne(ctx, bson.M {"email": req.Email}).Decode(&existingUser);
	if err == nil {
		c.JSON(http.StatusBadRequest, gin.H {
			"ok": false,
			"source": "<api.v0.auth>: Signup()",
			"message": "Failed to signup.",
			"error": "Email already in use.",
		});
		return;
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 10);
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H {
			"ok": false,
			"source": "<api.v0.auth>: Signup()",
			"message": "Failed to signup.",
			"error": "Internal server error.",
		});
		return;
	}

	now := time.Now();

	user := models.User {
		Email: req.Email,
		PasswordHash: string(hashedPassword),
		Role: "customer",
		Profile: models.UserProfile{
			FirstName: req.FirstName,
			LastName: req.LastName,
			Phone: req.Phone,
			City: req.City,
			Country: req.Country,
		},
		SecOps: models.SecurityOps{
			TokenVersion: 0,
			FailedLogins: 0,
			FailedResets: 0,
		},
		CreatedAt: now,
		UpdatedAt: now,
	}

	result, err := db.UsersCollection.InsertOne(ctx, user);
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H {
			"ok": false,
			"source": "<api.v0.auth>: Signup()",
			"message": "Failed to signup.",
			"error": "Internal server error.",
		});
		return;
	}

	user.Id = result.InsertedID.(primitive.ObjectID);

	c.JSON(http.StatusCreated, gin.H {
			"ok": true,
			"source": "<api.v0.auth>: Signup()",
			"message": "Signup successful.",
			"user": user,
		});
}

func Login(c *gin.Context) {
	var req LoginRequest;

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H {
			"ok": false,
			"source": "<api.v0.auth>: Login()",
			"message": "Failed to login.",
			"error": "Invalid request body.",
		});
		return;
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email));
	if req.Email == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H {
			"ok": false,
			"source": "<api.v0.auth>: Login()",
			"message": "Failed to login.",
			"error": "Missing required fields.",
		});
		return;
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5 * time.Second);
	defer cancel();

	var user models.User;
	err := db.UsersCollection.FindOne(ctx, bson.M{"email": req.Email}).Decode(&user);
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H {
			"ok": false,
			"source": "<api.v0.auth>: Login()",
			"message": "Failed to login.",
			"error": "Invalid credentials.",
		});
		return;
	}

	if user.SecOps.FailedLogins > 3 {
		c.JSON(http.StatusForbidden, gin.H {
			"ok": false,
			"source": "<api.v0.auth>: Login()",
			"message": "Failed to login.",
			"error": "Account is locked, contact support [support@toptiercustoms.com].",
		});
		return;
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		_, _ = db.UsersCollection.UpdateOne(
			ctx,
			bson.M{"_id": user.Id},
			bson.M{
				"$inc": bson.M{"secOps.failedLogins": 1},
				"$set": bson.M{"updatedAt": time.Now()},
			},
		)

		c.JSON(http.StatusUnauthorized, gin.H {
			"ok": false,
			"source": "<api.v0.auth>: Login()",
			"message": "Failed to login.",
			"error": "Invalid credentials.",
		});
		return;
	}

	env := config.LoadEnv();

	accessToken, err := utils.GenerateAccessToken(user.Id.Hex(), user.Email, user.Role, env.JWTAccessSecret);
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H {
			"ok": false,
			"source": "<api.v0.auth>: Login()",
			"message": "Failed to login.",
			"error": "Failed to generate access token.",
		});
		return;
	}

	refreshToken, err := utils.GenerateRefreshToken(user.Id.Hex(), user.Email, user.Role, env.JWTRefreshSecret);
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H {
			"ok": false,
			"source": "<api.v0.auth>: Login()",
			"message": "Failed to login.",
			"error": "Failed to generate refresh token.",
		});
		return;
	}

	now := time.Now();

	_, _ = db.UsersCollection.UpdateOne(
		ctx,
		bson.M{"_id": user.Id},
		bson.M{
			"$set": bson.M{
				"secOps.lastLoginAt": now,
				"secOps.failedLogins": 0,
				"updatedAt": now,
			},
		},
	);

	c.SetCookie(
		"refresh_token",
		refreshToken,
		7 * 24 * 60 * 60,
		"/",
		"",
		false,
		true,
	);

	c.JSON(http.StatusOK, gin.H {
			"ok": true,
			"source": "<api.v0.auth>: Login()",
			"message": "Login successful.",
			"user": user,
			"access_token": accessToken,
		});
}

func Logout(c *gin.Context) {
	c.SetCookie("refresh_token", "", -1, "/", "", false, true);

	c.JSON(http.StatusOK, gin.H {
			"ok": true,
			"source": "<api.v0.auth>: Logout()",
			"message": "Logout successful.",
		});
}

func Me(c *gin.Context) {
	c.JSON(501, gin.H {
		"ok": false,
		"message": "Me handler not implemented yet.",
	});
}

func Refresh(c *gin.Context) {
	c.JSON(501, gin.H {
		"ok": false,
		"message": "Refresh handler not implemented yet.",
	});
}