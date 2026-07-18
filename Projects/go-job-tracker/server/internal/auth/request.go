package auth

type RegisterRequest struct {
	FirstName string `json:"firstName" binding:"required,min=2,max=60"`
	LastName  string `json:"lastName" binding:"required,min=2,max=60"`
	Email     string `json:"email" binding:"required,email,max=254"`
	Password  string `json:"password" binding:"required,max=128"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email,max=254"`
	Password string `json:"password" binding:"required,max=128"`
}
