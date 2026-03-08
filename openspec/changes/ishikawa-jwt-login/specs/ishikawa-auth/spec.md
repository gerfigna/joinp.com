## ADDED Requirements

### Requirement: Login screen shown before main app

The system SHALL display a login screen on load if no valid JWT is present in `sessionStorage`. The main app (upload + chat) SHALL NOT be visible until the user is authenticated.

#### Scenario: No token on load

- **WHEN** the page loads and `sessionStorage` does not contain a JWT
- **THEN** the login screen is displayed
- **AND** the main app is hidden

#### Scenario: Token present on load

- **WHEN** the page loads and `sessionStorage` contains a JWT
- **THEN** the main app is displayed directly
- **AND** the login screen is hidden

### Requirement: Login via email and password

The system SHALL authenticate users by posting credentials to `POST http://185.230.219.16:5678/webhook/auth` with body `{ "path": "signin", "email": "<email>", "password": "<password>" }`.

#### Scenario: Successful login

- **WHEN** the user submits valid credentials
- **THEN** the backend returns HTTP 200 with `{ "token": "<jwt>" }`
- **AND** the token is stored in `sessionStorage`
- **AND** the login screen is hidden and the main app is shown

#### Scenario: Invalid credentials

- **WHEN** the user submits incorrect credentials
- **THEN** the backend returns HTTP 401
- **AND** an error message is displayed on the login screen
- **AND** the user remains on the login screen

#### Scenario: Network error during login

- **WHEN** the login request fails due to a network error
- **THEN** an error message is displayed on the login screen
- **AND** the user remains on the login screen

### Requirement: JWT attached to all authenticated requests

Every upload and chat request SHALL include the `Authorization: Bearer <token>` header using the JWT stored in `sessionStorage`.

#### Scenario: Upload request includes JWT

- **WHEN** the user uploads a file
- **THEN** the XHR request to `/webhook/updload-file-rag` includes `Authorization: Bearer <token>`

#### Scenario: Chat request includes JWT

- **WHEN** the user sends a chat message
- **THEN** the fetch request to `/webhook/ai-agent-with-rag` includes `Authorization: Bearer <token>`

### Requirement: 401 response clears session and redirects to login

If any authenticated request returns HTTP 401, the system SHALL clear the JWT from `sessionStorage` and display the login screen.

#### Scenario: Expired token during upload

- **WHEN** an upload request returns HTTP 401
- **THEN** the token is removed from `sessionStorage`
- **AND** the login screen is shown

#### Scenario: Expired token during chat

- **WHEN** a chat request returns HTTP 401
- **THEN** the token is removed from `sessionStorage`
- **AND** the login screen is shown

### Requirement: Logout clears session

The main app SHALL include a logout button. Clicking it SHALL remove the JWT from `sessionStorage` and display the login screen.

#### Scenario: User clicks logout

- **WHEN** the user clicks the logout button
- **THEN** the JWT is removed from `sessionStorage`
- **AND** the login screen is displayed
- **AND** the main app is hidden

### Requirement: Correct API base URL

All requests SHALL use `http://185.230.219.16:5678/webhook` as the base URL.

#### Scenario: API_BASE is set correctly

- **WHEN** any request is made (auth, upload, or chat)
- **THEN** the request targets `http://185.230.219.16:5678/webhook/<endpoint>`
