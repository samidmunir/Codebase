package response

type APIResponse struct {
	Success bool `json:"Success"`
	Message string `json:"message"`
	Data interface {} `json:"data,omitempty"`
}