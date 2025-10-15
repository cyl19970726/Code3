# E2E Test Feature: User Profile API

## Overview

Implement a RESTful API for user profile management

## Requirements

- **GET /users/:id** - Retrieve user profile
- **PUT /users/:id** - Update user profile
- **DELETE /users/:id** - Delete user profile

## Acceptance Criteria

- All endpoints return JSON responses
- Authentication required for all operations
- Input validation for profile updates
- 404 error for non-existent users

## Technical Notes

- Use Express.js framework
- MongoDB for data persistence
- JWT for authentication
- Input validation with Joi
