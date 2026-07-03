package main

import (
	"fmt"
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/samidmunir/top-tier-customs/services/auth/internal/config"
	"github.com/samidmunir/top-tier-customs/services/auth/internal/db"
	"github.com/samidmunir/top-tier-customs/services/auth/internal/routes"
)

func main() {
	env := config.LoadEnv();

	db.ConnectMongo(env.MongoURI);

	router := gin.Default();

	router.Use(cors.New(cors.Config {
		AllowOrigins: []string {env.ClientOrigin},
		AllowMethods: []string {"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders: []string {"Origin", "Content-Type", "Authorization", "x-gateway-secret"},
		AllowCredentials: true,
	}))

	routes.RegisterAuthRoutes(router);

	// log.Printf("✅ <api/v0/auth/> is live on http://localhost:%s/api/v0/auth", env.Port)
	fmt.Println("\n✅ <api/v0/auth/> is live on http://localhost:" + env.Port + "/api/v0/auth/");

	if err := router.Run("localhost:" + env.Port); err != nil {
		log.Fatal(err);
	}
}