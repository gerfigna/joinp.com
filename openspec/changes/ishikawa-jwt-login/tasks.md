## 1. Fix API base URL

- [x] 1.1 In `ishikawa/index.html`, replace `API_BASE` with `https://n8n.joinp.com/webhook` and remove the commented-out alternative URLs

## 2. Add login screen HTML and CSS

- [x] 2.1 In `ishikawa/index.html`, add a login screen `<div id="loginScreen">` with email input, password input, submit button, and an error message element
- [x] 2.2 Add CSS for the login screen: centered card layout, styled inputs and button, error text in danger color — consistent with the existing dark theme variables

## 3. Implement auth logic

- [x] 3.1 In `ishikawa/index.html`, add a `checkAuth()` function: on page load, if `sessionStorage` has a token show the main app, otherwise show the login screen
- [x] 3.2 Add a `login(email, password)` function: POST to `/webhook/auth` with `{ path: "signin", email, password }`, store `token` from response in `sessionStorage`, switch to main app; on 401 show error message
- [x] 3.3 Wire the login form submit button (and Enter key) to call `login()`
- [x] 3.4 Add a `logout()` function: remove token from `sessionStorage`, show login screen, hide main app
- [x] 3.5 Add a logout button to the header in `ishikawa/index.html` and wire it to `logout()`
- [x] 3.6 Call `checkAuth()` on page load

## 4. Attach JWT to authenticated requests

- [x] 4.1 In the XHR upload handler in `ishikawa/index.html`, add `xhr.setRequestHeader('Authorization', 'Bearer ' + sessionStorage.getItem('token'))` before `xhr.send()`
- [x] 4.2 In the `fetch` chat handler in `ishikawa/index.html`, add `Authorization: 'Bearer ' + sessionStorage.getItem('token')` to the request headers
- [x] 4.3 In the XHR `load` handler, if `xhr.status === 401` call `logout()` instead of showing an error
- [x] 4.4 In the `fetch` chat handler, if `res.status === 401` call `logout()` instead of throwing a generic error