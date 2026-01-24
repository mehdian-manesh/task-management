# Task Management System

A full-stack task management system built with Django and React, designed to track working hours and manage task reports with full RTL and Persian language support.

## Features

- 🕒 Working hours tracking with check-in/check-out
- 📋 Task and project management with Kanban board
- 📊 Report generation and tracking
- 👥 User role management (Admin/Regular users)
- 🔄 Real-time updates with WebSocket
- 🌙 RTL interface with Persian language
- 📅 Persian calendar integration
- 🔒 JWT authentication
- 🎨 Material-UI with customizable themes

## API Endpoints

```
login/                                  # Login with username/password
logout/                                # Logout user
working-days/                          # List and create working days
working-days/<id>/                     # Manage specific working day
working-days/<id>/check-out/           # Check out from working day
working-days/<id>/leave/               # Mark working day as leave
working-days/<id>/reports/             # Manage reports for working day
projects/                             # List and manage projects
tasks/                                # List and manage tasks
feedbacks/                            # List and manage feedbacks
```
## Tech Stack

### Backend
- Django 5.0
- Django REST Framework
- PostgreSQL
- JWT Authentication
- Nested Routing

### Frontend
- React 19
- Material-UI
- Redux Toolkit
- RTL Support
- Persian Calendar

### Infrastructure
- Docker
- Caddy (Reverse Proxy)
- SSL/TLS Support
- PostgreSQL

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Git

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/task-management.git
   cd task-management
   ```

2. Create a .env file in the root directory:
   ```env
   DJANGO_SECRET_KEY=your_secret_key
   DB_PASSWORD=your_db_password
   DOMAIN=localhost
   ```

3. Start the development environment:
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

4. Access the services:
   - Frontend: https://localhost
   - Backend API: https://localhost/api
   - Admin Interface: https://localhost/api/admin
Also, each report belongs to a task and each task can belong to a project.
Regular users only have viewing access to projects and their management is done by the admin. Also, regular users only see projects that the admin has specified.
Regarding tasks, regular users can create a task in draft mode (we said that tasks can belong to a project or not. Of course, they cannot define a task for themselves from a project that they do not have access to) and use this task in their report. When this task is approved by the admin, it becomes an approved task and is no longer a draft.
Other properties of tasks and projects include name, description, color, list of people assigned to the task or project (this list can be empty; by default, the list of users assigned to a task is the same as the list of users assigned to the entire project), start date, deadline, and estimated man-hours required.
Tasks can also have an integer field that specifies which phase of the project they are for.
Since we will later design a kanban for the program on the front end, tasks and projects can have one of the following states:
`postpone, backlog, todo, doing, test, done, archive`
