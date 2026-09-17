package auth

import "testing"

func TestHashPassword(t *testing.T) {
	password := "AtlasTest123!"

	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword() returned error: %v", err)
	}

	if hash == "" {
		t.Fatal("HashPassword() returned an empty hash")
	}

	if hash == password {
		t.Fatal("password hash must not equal plaintext password")
	}

	if err := CheckPassword(password, hash); err != nil {
		t.Fatalf("CheckPassword() rejected correct password: %v", err)
	}
}

func TestCheckPasswordRejectsIncorrectPassword(t *testing.T) {
	hash, err := HashPassword("AtlasTest123!")
	if err != nil {
		t.Fatalf("HashPassword() returned error: %v", err)
	}

	err = CheckPassword("WrongPassword123!", hash)

	if err == nil {
		t.Fatal("CheckPassword() accepted an incorrect password")
	}
}

func TestHashPasswordProducesUniqueHashes(t *testing.T) {
	password := "AtlasTest123!"

	hashOne, err := HashPassword(password)
	if err != nil {
		t.Fatalf("first HashPassword() returned error: %v", err)
	}

	hashTwo, err := HashPassword(password)
	if err != nil {
		t.Fatalf("second HashPassword() returned error: %v", err)
	}

	if hashOne == hashTwo {
		t.Fatal("expected bcrypt hashes to differ")
	}

	if err := CheckPassword(password, hashOne); err != nil {
		t.Fatalf("first hash rejected password: %v", err)
	}

	if err := CheckPassword(password, hashTwo); err != nil {
		t.Fatalf("second hash rejected password: %v", err)
	}
}
