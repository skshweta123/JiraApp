# Jira Dashboard App - Specification Document

## Overview

This prototype web application provides users with an intuitive interface to interact with Jira. It allows authenticated users to **view**, **search**, **update**, and **create** Jira tickets using Jira REST APIs. The app is built with a responsive desktop-first UI and powered by a Node.js backend to handle secure Jira communication.

---

## Key Features

### 1. Dashboard View (Backlog)

- **Purpose**: Display a list of Jira tickets with essential project tracking fields.
- **Fields Displayed**:
  - Item# (Jira Issue Key)
  - Title
  - Parent Feature
  - Status
  - Dev Completion Date
  - QA Completion Date
  - UAT Completion Date
  - Prod Release Date
  - Prod Release Status
- **UI Behavior**:
  - Responsive table/grid layout
  - Sortable columns
  - Pagination or infinite scroll
  - Color-coded status indicators
  - Auto-refresh on updates

---

### 2. Ticket Search

- **Purpose**: Quickly locate and highlight a ticket using its Jira issue key.
- **Features**:
  - Global search bar
  - Typeahead support (optional)
  - On match, scroll to and highlight the ticket in the dashboard
  - Display ticket in detail view/modal if clicked

---

### 3. Update Ticket

- **Purpose**: Enable users to modify one or more fields of a selected Jira ticket.
- **Workflow**:
  1. Click on a ticket row to open the editable form/modal.
  2. All fields (except Item#) are editable.
  3. User updates one or multiple fields.
  4. Submit updates → backend sends PATCH request to Jira.
  5. Updated data reflects instantly in the dashboard.

---

### 4. Create Ticket

- **Purpose**: Allow users to create a new ticket with necessary details.
- **Fields Required**:
  - Title
  - Parent Feature (auto-assigned)
  - Status
  - Dev Completion Date
  - QA Completion Date
  - UAT Completion Date
  - Prod Release Date
  - Prod Release Status
- **Behavior**:
  - Pre-defined project and issue type
  - Validation on required fields
  - Success confirmation after creation
  - New ticket added to the dashboard

---

## Technical Specifications

### Frontend

- **Framework**: React (with Hooks)
- **Styling**: TailwindCSS (or Material UI)
- **Routing**: React Router
- **UI Features**:
  - Modal windows for update/create
  - Toast notifications for success/error
  - Responsive layout targeting desktop-first

---

### Backend

- **Language**: Node.js
- **Framework**: Express.js
- **Responsibilities**:
  - Proxy requests to Jira REST API
  - Handle authentication using API Token + Basic Auth
  - Abstract Jira field mappings
- **Security**:
  - API keys stored securely
  - CORS enabled for frontend

---

### Jira Integration

- **Authentication**: Jira API Token via Basic Auth
- **Instance**: User-authenticated, any Jira workspace
- **Fields**:
  - Standard fields: Issue Key, Title, Status
  - Custom fields (mocked for prototype): Dev/QA/UAT/Prod Dates & Status
- **Parent Feature**:
  - One parent → multiple child issues (standard Jira relationship)

---

## Permissions & Roles

- All users have equal access in prototype
- No role-based restrictions on field updates

---

## Scope & Limitations

- Desktop-first UI (mobile/PWA support can be added later)
- No multi-user session handling beyond API authentication
- No data caching or offline support in this prototype
- Mocked fields for custom Jira field simulation

---

## Future Enhancements (Post-Prototype)

- OAuth2 login with Jira
- Role-based permissions
- Mobile/PWA support
- Dashboard filters & charts
- Advanced search (by date, status, parent, etc.)
- Activity logs for auditing

---

## Next Steps

1. Set up Node.js backend with secure Jira proxy routes
2. Build React UI for dashboard and modals
3. Integrate basic auth Jira requests and map responses
4. Mock custom fields in data layer
5. Deploy and test using a sample Jira workspace

