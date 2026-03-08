## Context

`ishikawa/index.html` is a single-file vanilla JS app with no build step. It currently exposes the full RAG interface (file upload + chat) to anyone with the URL. The backend at `http://185.230.219.16:5678/webhook` already implements JWT auth — the frontend just needs to participate.

Current `API_BASE` points to a local n8n instance (`https://n8n.data-ms-ai.orb.local/webhook`) and must be updated to the public server.

## Goals / Non-Goals

**Goals:**
- Gate the main app behind a login screen
- Authenticate against `/webhook/auth` and store the JWT in `sessionStorage`
- Pass the JWT as `Authorization: Bearer <token>` on every upload and chat request
- Provide a logout button to clear the session

**Non-Goals:**
- Refresh token / silent re-auth
- Remember-me / `localStorage` persistence
- User registration or password reset
- Any backend changes

## Decisions

**Session storage: `sessionStorage` over `localStorage`**
Token is cleared automatically when the tab closes, matching the desired session lifetime. `localStorage` would persist indefinitely without explicit logout — a security risk on shared devices.

**UI structure: two views in one HTML file**
Login screen and main app coexist in the same file; CSS `display: none / flex` toggles between them. No routing, no new files. Keeps the project self-contained.

**Token propagation: header on every request**
- `fetch` (chat): add `Authorization` to the `headers` object
- `XHR` (upload): call `xhr.setRequestHeader('Authorization', ...)` before `xhr.send()`
- On HTTP 401 from any request: clear token, redirect to login

**API_BASE fix: hardcoded update**
Replace the commented-out `http://185.230.219.16:5678/webhook` with the active base URL. The local orb URL is removed.

## Risks / Trade-offs

**JWT expiry mid-session** → If the token expires while the user is active, the next request returns 401. The app will clear the token and show the login screen. User loses unsent input. Acceptable given no refresh flow is in scope.

**HTTP (not HTTPS) backend** → Requests to `http://185.230.219.16:5678` are unencrypted. GitHub Pages is served over HTTPS, so mixed-content rules apply — modern browsers block active mixed content (fetch/XHR) from HTTPS pages to HTTP origins. This may prevent the app from working in production. Mitigation: either serve the backend over HTTPS, or host ishikawa itself on HTTP. Out of scope for this change but must be validated during testing.

**Single HTML file grows** → Adding login UI, CSS, and JS to an already-large file. Acceptable for this project scale; no abstraction needed.
