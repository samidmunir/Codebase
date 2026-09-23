package tasks

import "errors"

var ErrTaskNotFound = errors.New(
	"task not found",
)

var (
	ErrInvalidTitle       = errors.New("invalid task title")
	ErrInvalidDescription = errors.New("invalid task description")
	ErrInvalidStatus      = errors.New("invalid task status")
	ErrInvalidPriority    = errors.New("invalid task priority")
	ErrInvalidProject     = errors.New("invalid project")
)

var (
	ErrInvalidDueFilter = errors.New("invalid due filter")
	ErrInvalidSort      = errors.New("invalid sort")
	ErrInvalidOrder     = errors.New("invalid order")
)
