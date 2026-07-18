package user

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type Preferences struct {
	Theme           string `bson:"theme" json:"theme"`
	Timezone        string `bson:"timezone" json:"timezone"`
	Locale          string `bson:"locale" json:"locale"`
	DefaultCurrency string `bson:"defaultCurrency" json:"defaultCurrency"`
}

type JobSearchPreferences struct {
	WeeklyApplicationGoal int      `bson:"weeklyApplicationGoal" json:"weeklyApplicationGoal"`
	TargetRoles           []string `bson:"targetRoles" json:"targetRoles"`
	PreferredLocations    []string `bson:"preferredLocations" json:"preferredLocations"`
	RemotePreference      string   `bson:"remotePreference" json:"remotePreference"`
}

type User struct {
	ID bson.ObjectID `bson:"_id,omitempty" json:"id"`

	FirstName    string `bson:"firstName" json:"firstName"`
	LastName     string `bson:"lastName" json:"lastName"`
	DisplayName  string `bson:"displayName" json:"displayName"`
	Email        string `bson:"email" json:"email"`
	PasswordHash string `bson:"passwordHash" json:"-"`

	AvatarURL string `bson:"avatarUrl,omitempty" json:"avatarUrl,omitempty"`

	Preferences      Preferences          `bson:"preferences" json:"preferences"`
	JobSearchProfile JobSearchPreferences `bson:"jobSearchProfile" json:"jobSearchProfile"`

	TokenVersion  int        `bson:"tokenVersion" json:"-"`
	EmailVerified bool       `bson:"emailVerified" json:"emailVerified"`
	LastLoginAt   *time.Time `bson:"lastLoginAt,omitempty" json:"lastLoginAt,omitempty"`

	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}
