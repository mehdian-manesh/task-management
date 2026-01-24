# AI Agent Instructions for Task Management Project

## Project Architecture

This is a full-stack task management application with distinct frontend and backend components:

### Backend (Django + DRF)
- Django REST Framework based API with JWT authentication
- Core models in `backend/core/models.py`: Projects, Tasks, WorkingDays, Reports
- Nested routing using `drf-nested-routers` for hierarchical API endpoints
- Custom user model in `backend/accounts/models.py`

### Frontend (React)
- React application using Material-UI (MUI) with RTL support
- Redux Toolkit for state management
- JWT authentication handled through `AuthContext` (`frontend/src/context/AuthContext.js`)
- Kanban board implementation using `react-beautiful-dnd`

## Key Architectural Patterns

### Authentication Flow
- JWT tokens used for auth, handled by `djangorestframework-simplejwt` backend and `jwt-decode` frontend
- Login flow managed through `frontend/src/components/Login.js`

### Data Models & Relationships
- Projects can have multiple Tasks
- Tasks can be standalone or project-affiliated
- WorkingDays contain Reports
- Reports are linked to Tasks
- Task states follow Kanban workflow: `postpone, backlog, todo, doing, test, done, archive`

### Authorization Patterns
- Regular users:
  - Can view assigned projects
  - Can create draft tasks
  - Full CRUD on their working days and reports
- Admins:
  - Full CRUD on projects
  - Task approval/management
  - User assignment to projects

## Development Workflow

### Backend Setup
```bash
cd backend
pipenv install
pipenv shell
python manage.py migrate
python manage.py runserver
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## Testing
- Backend: pytest-based testing (`backend/pytest.ini`)
- Frontend: Jest + React Testing Library

## Integration Points
- Backend API proxy configured in `frontend/package.json`: `"proxy": "http://127.0.0.1:8000"`
- API services centralized in `frontend/src/api/services.js`
- Axios instance configuration in `frontend/src/api/axios.js`

## Project-Specific Conventions
1. Task Status Flow:
   - Tasks start in 'draft' mode when created by regular users
   - Require admin approval to become 'approved'
   - Follow Kanban board states for progress tracking

2. Working Day Pattern:
   - Creating a working day = checking in
   - Reports are tied to working days
   - Report results must be one of: ["Not finished yet", "Successfully completed", "Postponed", "Failed to complete", "Canceled"]

3. Project Assignment:
   - Tasks inherit user assignments from parent project by default
   - Can be overridden with task-specific assignments