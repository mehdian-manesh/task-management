# task-management

## endpoints:
login/
logout/
working-days/ (CRUD)
working-days/<id>/ (POST: check-in, check-out, leave)
working-days/<id>/reports/ (CRUD)
projects/ (CRUD)
tasks/ (CRUD)
feedbacks/ (CRUD)
Of course, it should be kept in mind that creating a working day is the same as checking in.
Each working day has a check-in and check-out date and time and belongs to a user. Also, each working day has a number of reports. Each report has a text (maximum 1000 characters), a result that can have one of the following values:
- Not finished yet
- Successfully completed
- Postponed
- Failed to complete
- Canceled
Also, each report belongs to a task and each task can belong to a project.
Regular users only have viewing access to projects and their management is done by the admin. Also, regular users only see projects that the admin has specified.
Regarding tasks, regular users can create a task in draft mode (we said that tasks can belong to a project or not. Of course, they cannot define a task for themselves from a project that they do not have access to) and use this task in their report. When this task is approved by the admin, it becomes an approved task and is no longer a draft.
Other properties of tasks and projects include name, description, color, list of people assigned to the task or project (this list can be empty; by default, the list of users assigned to a task is the same as the list of users assigned to the entire project), start date, deadline, and estimated man-hours required.
Tasks can also have an integer field that specifies which phase of the project they are for.
Since we will later design a kanban for the program on the front end, tasks and projects can have one of the following states:
postpone, backlog, todo, doing, test, done, archive
