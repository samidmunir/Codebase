package health

import (
	"encoding/json"
	"net/http"
)

type Response struct {
	Status  string `json:"status"`
	Service string `json:"service"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	response := Response{
		Status:  "ok",
		Service: "atlas-api",
	}

	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "failed to encode response", http.StatusInternalServerError)
		return
	}
}
