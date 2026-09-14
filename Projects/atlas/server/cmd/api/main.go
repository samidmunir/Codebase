package main

import (
	"log"

	"github.com/samidmunir/Codebase/projects/atlas/server/platform/server"
)

func main() {
	srv := server.New(":8080")

	if err := srv.Start(); err != nil {
		log.Fatal(err)
	}
}