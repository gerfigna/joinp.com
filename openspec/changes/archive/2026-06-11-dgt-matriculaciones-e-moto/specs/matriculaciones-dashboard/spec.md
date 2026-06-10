## ADDED Requirements

### Requirement: Navigation link to electric dashboard
The `dgt-matriculaciones-moto/index.html` tab navigation SHALL include a link to `dgt-matriculaciones-e-moto/index.html` rendered alongside the existing tab labels. The link SHALL open in a new browser tab (`target="_blank" rel="noopener"`). It SHALL be visually consistent with the existing tab label style and positioned adjacent to the "Información" label.

#### Scenario: Link renders in tab nav
- **WHEN** the combustion dashboard page loads
- **THEN** a link to the electric dashboard is visible in the tab navigation area, next to "Información"

#### Scenario: Link opens in new tab
- **WHEN** the user clicks the electric dashboard link
- **THEN** `dgt-matriculaciones-e-moto/index.html` opens in a new browser tab without affecting the current page state
