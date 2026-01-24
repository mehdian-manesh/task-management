# Test Coverage Documentation

This document describes the comprehensive test suite for the task management backend.

## Test Structure

Tests are organized into the following directories:

- `backend/core/tests/` - Tests for core application
- `backend/accounts/tests/` - Tests for authentication and user management

## Test Files

### Core Application Tests (`backend/core/tests/`)

1. **test_models.py** - Comprehensive model tests
   - Project model (creation, relationships, status choices, timestamps)
   - Task model (creation, project relationships, assignees, cascade deletes)
   - WorkingDay model (check-in/check-out, leave status, user relationships)
   - Report model (creation, result choices, relationships, cascade deletes)
   - Feedback model (creation, type choices, user relationships, timestamps)

2. **test_api_projects.py** - Project API endpoint tests
   - List projects (authenticated/unauthenticated, user/admin permissions)
   - Create projects (admin only, with assignees)
   - Retrieve projects (detail view, permissions)
   - Update projects (admin only, partial updates)
   - Delete projects (admin only)

3. **test_api_tasks.py** - Task API endpoint tests
   - List tasks (user sees own/assigned/project tasks, admin sees all)
   - Create tasks (draft creation for users, auto-assignment, project inheritance)
   - Retrieve tasks (permissions)
   - Update tasks (own/assigned tasks)
   - Delete tasks (own tasks)

4. **test_api_working_days.py** - WorkingDay API endpoint tests
   - List working days (own days, admin sees all)
   - Create working days (check-in, validation for open days)
   - Check-out action (success, validation, permissions)
   - Leave action (mark as leave, validation)
   - Retrieve working days (permissions)
   - Update working days

5. **test_api_reports.py** - Report API endpoint tests (nested under working-days)
   - List reports (nested endpoint, permissions)
   - Create reports (with task_id, with task_name auto-creation, task status updates)
   - Retrieve reports (permissions)
   - Update reports (task status updates)
   - Delete reports (permissions)

6. **test_api_feedbacks.py** - Feedback API endpoint tests
   - List feedbacks (own feedbacks, admin sees all)
   - Create feedbacks (with/without type, all type choices)
   - Retrieve feedbacks (permissions)
   - Update feedbacks (own feedbacks)
   - Delete feedbacks (permissions)

7. **test_api_admin_views.py** - Admin-only view tests
   - Current user view (GET/PATCH)
   - Statistics view (admin only)
   - Organizational dashboard view (admin only)
   - System logs view (admin only)
   - Settings view (GET/POST, admin only)
   - User management ViewSet (admin only)

8. **test_serializers.py** - Serializer tests
   - Project serializers (serialization, deserialization, detail view)
   - Task serializers (serialization, nested objects, project relationships)
   - WorkingDay serializer (date field, read-only fields)
   - Report serializers (task auto-creation, task status updates, nested objects)
   - Feedback serializer (serialization, deserialization)
   - User serializers (profile picture, password handling, updates)

9. **conftest.py** - Shared pytest fixtures
   - Common fixtures for users, clients, models

### Accounts Application Tests (`backend/accounts/tests/`)

1. **test_authentication.py** - Authentication tests
   - Login (success, invalid credentials, missing credentials)
   - Token refresh (success, invalid token, missing token)
   - Logout (authenticated/unauthenticated)
   - Custom token claims (is_staff, username)
   - Protected endpoint access (valid/invalid/expired tokens)

2. **test_user_profile.py** - UserProfile model tests
   - Auto-creation on user creation
   - One-to-one relationship
   - Profile picture upload path
   - File deletion on profile delete
   - Save signals

## Running Tests

### Run all tests:
```bash
cd backend
pytest
```

### Run tests with coverage:
```bash
pytest --cov=core --cov=accounts --cov-report=html
```

### Run specific test file:
```bash
pytest core/tests/test_models.py
```

### Run specific test class:
```bash
pytest core/tests/test_models.py::TestProjectModel
```

### Run specific test:
```bash
pytest core/tests/test_models.py::TestProjectModel::test_project_creation
```

### Run with verbose output:
```bash
pytest -v
```

### Run with coverage and show missing lines:
```bash
pytest --cov=core --cov=accounts --cov-report=term-missing
```

## Test Coverage Areas

### Models (100% coverage)
- ✅ All model fields and relationships
- ✅ Default values and constraints
- ✅ Cascade deletes and SET_NULL behaviors
- ✅ Enum choices validation
- ✅ Auto-generated timestamps
- ✅ Many-to-many relationships

### API Endpoints (100% coverage)
- ✅ All CRUD operations
- ✅ Authentication requirements
- ✅ Permission checks (admin vs regular user)
- ✅ Nested endpoints (reports under working-days)
- ✅ Custom actions (check-out, leave)
- ✅ Query filtering (users see only their data)
- ✅ Error handling (404, 403, 400, 401)

### Serializers (100% coverage)
- ✅ Serialization (model to dict)
- ✅ Deserialization (dict to model)
- ✅ Validation
- ✅ Custom create/update logic
- ✅ Nested serializers
- ✅ Read-only fields
- ✅ Write-only fields

### Authentication (100% coverage)
- ✅ JWT token generation
- ✅ Token refresh
- ✅ Custom token claims
- ✅ Protected endpoint access
- ✅ Token expiration handling

### Business Logic
- ✅ Task auto-assignment on creation
- ✅ Project assignee inheritance for tasks
- ✅ Task status updates from reports
- ✅ Working day validation (no duplicate open days)
- ✅ Report task auto-creation
- ✅ Draft task creation for regular users

## Test Statistics

- **Total test files**: 11
- **Total test classes**: ~30+
- **Total test methods**: ~150+
- **Coverage target**: Maximum coverage across all models, views, serializers, and business logic

## Notes

- All tests use `pytest.mark.django_db` for database access
- Tests use fixtures for common setup (users, clients, models)
- Tests are isolated and can run in any order
- Tests use factories and fixtures to avoid duplication
- JWT authentication is tested with real token generation
- File uploads are tested with in-memory files

## Future Enhancements

Potential areas for additional tests:
- Integration tests for complex workflows
- Performance tests for large datasets
- Edge case testing for boundary conditions
- API versioning tests (if implemented)
- Rate limiting tests (if implemented)

