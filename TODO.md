🔹 MVP-Level Stories (Core Functionality)
Story 1: As a user, I want to log in with my Jira credentials so that I can securely access my Jira workspace.
Status: Completed
Acceptance Criteria:

User can input Jira site URL, email, and API token.

Backend validates credentials using Basic Auth.

On success, user is redirected to the dashboard.

On failure, an error is displayed.

Token is securely stored only for session duration.

Story 2: As a user, I want to view a dashboard of Jira tickets so that I can see the project backlog at a glance.
Status: Completed
Acceptance Criteria:

- Tickets are fetched from Jira via backend API.
- Dashboard dynamically displays all available columns for the 'Story' issue type.
- The table is responsive on desktop.
- At least 10 tickets are shown on initial load.
- ~~Mock data is used for custom fields if Jira fields don’t exist.~~ (Obsolete: now fully dynamic)

Story 3: As a user, I want to customize the dashboard columns and add editable fields for ticket updates.
Status: Completed
Acceptance Criteria:

- "Created", "Labels", and "Reporter" columns are hidden from the default view.
- "Due Date" column from Jira is fetched and displayed.
- Editable input fields are added for: "UAT Handover Date", "UAT Planned Completion", "UAT Status", "Planned Release Date", and "Release Status".
- Jira data columns and user-editable columns are visually distinguished with different background colors.
- Table headers match the color of their respective column types.
- An instructional message is displayed to guide the user.
- Date fields have built-in validation:
  - UAT Start Date must be ≥ UAT Handover Date.
  - UAT Completion Date must be ≥ UAT Start Date.
  - Release Date must be ≥ UAT Completion Date.
  - An error message is shown and invalid fields are highlighted if rules are violated.
- Status fields are dynamic:
  - UAT/Release Status defaults to "Not Started" for future dates.
  - UAT/Release Status automatically changes to "Delayed" with a red background if its start date has passed and the status is still "Not Started".

Story 4: As a user, I want to search for a ticket by its Item# so that I can quickly locate and inspect a specific issue.
Status: Not Started
Acceptance Criteria:

A search bar is visible at the top of the dashboard.

Typing a valid Issue Key and pressing Enter highlights the ticket in the list or opens it in a detail modal.

If the issue does not exist, a clear “Not Found” message is shown.

Story 5: As a user, I want to update one or more fields in a ticket so that I can reflect the latest status or completion dates.
Status: In Progress
Acceptance Criteria:

- Editable input fields for UAT and Release data are displayed on the dashboard for each ticket.
- Clicking on a ticket opens an edit form/modal.
All fields except Item# are editable.

User can update one or multiple fields at once.

On submission:

Request is sent to backend.

Backend patches the fields using Jira API.

Dashboard updates reflect immediately.

Success or error feedback is shown via toast.

Story 6: As a user, I want to create a new ticket in Jira so that I can add new backlog items.
Status: Not Started
Acceptance Criteria:

A “Create Ticket” button is present on the dashboard.

Clicking it opens a form with all fields (except Item# which is auto-assigned).

Project and issue type are fixed (configured in backend).

Parent Feature is auto-assigned based on logic or a placeholder.

On submission, backend calls Jira API to create the issue.

Ticket appears in the dashboard after creation.

🔸 Secondary Stories (Polish & Productivity)
Story 7: As a user, I want to see color-coded status indicators so that I can visually identify progress at a glance.
Status: Not Started
Acceptance Criteria:

Status cells are styled with colors:

e.g., Green = Done, Yellow = In Progress, Red = Blocked.

Colors are consistent across all statuses and documented.

Story 8: As a user, I want the dashboard table columns to be sortable so that I can prioritize what I see.
Status: Not Started
Acceptance Criteria:

User can click on a column header to sort ascending/descending.

Sorting works at least for:

Dev Completion Date, QA Completion Date, Status.

Sorting state is maintained until refresh.

Story 9: As a user, I want the dashboard to be paginated so that it loads efficiently and is easy to navigate.
Status: Not Started
Acceptance Criteria:

Pagination shows 10–20 tickets per page.

"Previous" and "Next" buttons are functional.

Total number of pages is shown.

Current page is highlighted.

Story 10: As a user, I want to toast messages on actions so that I receive immediate feedback for create/update operations.
Status: Not Started
Acceptance Criteria:

Toast appears on successful ticket creation/update.

Toast appears on failure with reason (e.g., invalid token).

Toast disappears after 3–5 seconds.

Story 11: As a user, I want the app UI to match modern design standards so that it feels polished and intuitive.
Status: Not Started
Acceptance Criteria:

App uses TailwindCSS (or Material UI) for consistent styling.

Layout is clean, mobile-friendly on small screen widths.

Modals, buttons, fonts, and spacing follow a modern design system.

🔻 Future Enhancements (Post-MVP)
Story 12: As a user, I want to log out securely so that my credentials are cleared from the app.
Status: Not Started
Acceptance Criteria:

"Logout" button is visible when logged in.

Clicking logout clears the token and redirects to login screen.

Session info is erased from memory.

Story 13: As a user, I want to filter tickets by status or parent feature so that I can drill down quickly.
Status: Not Started
Acceptance Criteria:

Filter dropdowns are present for “Status” and “Parent Feature.”

Selecting filters updates the table without page reload.

Filter state is preserved on pagination.

