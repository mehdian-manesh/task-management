TEST



## statistics in the normal user dashboard
In the "Report" section, the goal is to provide daily, weekly, monthly, and annual consolidated work reports. Note that the day, week, month, and year should be considered based on the persian Jalali date.
In addition to the individual report, the organizational dashboard should have a team report section where the admin can select a domain and have a consolidated report of all actions taken in the team in the daily, weekly, monthly, and annual time period.
In addition to web-based reports, the program should be able to export these reports as a pdf file.
Each report should include the following:
List of tasks completed during the reporting period (day, week, etc.)
List of projects (and people involved in each project if the report is for the admin)
List of meetings the user has attended and a summary of the meetings
A condensed schedule of the user's working hours (and all domain users if the report is for the admin).
all feedbacks added in the report period.
any admin user can add some notes for the report contains all notes added in the report period.
the program automatically saves weekly, monthly and yearly reports and these reports can be downloaded by admin users. the saved report content is static and will never change even if its related data changed in the application (for example, a task or project may be deleted or done but in the saved report its status remains same as time of creating the report.).

## docker production
- for running application in production you must run the docker with `docker compose -f docker-compose.yml up`. try to run it and fix its errors.
- optimize dockerfiles and codes for production mode (don't break dev mode).

## debug Kanban

## frontend test
- i want to add as much as possible tests for the frontend.
- fix test failures
- get a test coverage report


## Jalali calendar
add a new section in dashboard and organizational dashboard named "Calendar". in this section you must show a Persian Jalali calendar to the user. the calendar has daily, weekly, monthly and annual views. in each views you must show a brief of all events and important dates (like projects and tasks deadlines) to the user. keep in mind to just show the information that the user authorize to see them.


- [] login with google account (keyconnect)
- [] sync calendar with google calendar
- [] KPI
- [] session management
- [] debug light theme in the front
- [] 2FA
- [] chat (third party if possible)
- [] workflow (kamonda)
- [] ticketing (third party or chat itself)
- [] prompt for re-writing in Laravel 12 + Inertia (React)
- [] prompt for re-rwiting in .Net Core 10 + Blazor


# TEST
Update the current tests based on the recent changes and define new tests if necessary. Then run all the tests. Fix the failovers and rerun the tests until there are no failovers left. Try to resolve as many warnings as possible.
Try to run the tests in parallel on all CPU cores. This may cause some tests to fail incorrectly. Be careful that the tests that fail will also fail in single-threaded mode. Finally, run all the tests once in single-threaded mode to make sure that all the tests pass.
Finally, get the overall test coverage. If it is below 90, try to increase it as much as possible by defining more tests (again, if you define new tests, make sure that all the tests pass).