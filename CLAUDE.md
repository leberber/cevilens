# Project Instructions

## Mandatory Code Style

@CODE_STYLE_REQUIREMENTS.md

## Architecture Summary

- **Stack**: Angular 20 frontend + FastAPI backend + PostgreSQL
- **Roles**: PLATFORM_ADMIN, DISTRIBUTOR_ADMIN, SUPERVISEUR, PREVENDEUR
- **Data isolation**: All endpoints filter by `distributor_id` (except PLATFORM_ADMIN)
- **State management**: Angular signals for local state, `computed()` for derived state
- **Styling**: Global SCSS only — no component SCSS unless strictly unavoidable
- **DI**: Use `inject()` API consistently, mark dependencies `readonly`

## Before Every Change

1. Read the target component (TS + HTML + SCSS)
2. Check existing services, constants, and utilities for reuse
3. Check global SCSS partials before adding any CSS
4. Run the pre-delivery audit (rule 50) before delivering code

## Key File Locations

- Global styles: `frontend/src/styles/`
- Role logic: `frontend/src/app/core/services/role.service.ts`
- Role constants: `frontend/src/app/core/constants/roles.ts`
- App constants: `frontend/src/app/core/constants/app.constants.ts`
- Notification: `frontend/src/app/core/services/notification.service.ts`
