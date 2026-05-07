package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	port := "8080"

	mux := http.NewServeMux()

	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([] byte("Go Auth API is running"))
	})

	fmt.Println("Server running on port", port)

	err := http.ListenAndServe(":" + port, mux)
	if err != nil {
		log.Fatal(err)
	}
}