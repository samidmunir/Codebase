package projects

import "errors"

var (
	ErrProjectNotFound = errors.New("project not found")

	ErrProjectNameRequired       = errors.New("project name is required")
	ErrProjectNameTooLong        = errors.New("project name must not exceed 150 characters")
	ErrProjectDescriptionTooLong = errors.New("project description must not exceed 5000 characters")
	ErrInvalidProjectStatus      = errors.New("invalid project status")
	ErrInvalidProjectPriority    = errors.New("invalid project priority")
	ErrInvalidProjectDates       = errors.New("project target date cannot be before start date")
	ErrInvalidProjectSort        = errors.New("invalid project sort field")
	ErrInvalidSortOrder          = errors.New("invalid sort order")
)
