## Why

The Ishikawa RAG interface currently has no authentication — anyone with the URL can upload documents and chat with the AI. The backend already supports JWT-based auth; the frontend just needs to implement the login flow to gate access.

## What Changes

- Add a login screen (email + password) shown before the main app
- Authenticate against `POST /webhook/auth` with `{ path: "signin", email, password }`
- Store the returned JWT in `sessionStorage` (cleared on tab close)
- Attach `Authorization: Bearer <token>` header to all upload and chat requests
- Add a logout button that clears the token and returns to the login screen
- Fix `API_BASE` from the local n8n URL to `https://n8n.joinp.com/webhook`

## Capabilities

### New Capabilities

- `ishikawa-auth`: JWT login flow — login screen, token storage, authenticated requests, logout

### Modified Capabilities

_(none — no existing specs are affected)_

## Impact

- `ishikawa/index.html`: only file modified
- No new dependencies; vanilla HTML/CSS/JS, no build step
- Upload (`XHR`) and chat (`fetch`) requests will require a valid JWT; unauthenticated requests will fail with HTTP 401