# CODE_STYLE_REQUIREMENTS.md

## 1. Purpose

Mandatory code and UI standards for this project. These rules apply to all new code, refactors, bug fixes, and AI-generated code across the Angular 20 frontend, FastAPI backend, and PostgreSQL database.

The objective: consistent, maintainable, reusable, type-safe, DRY, centralized.

These requirements are mandatory unless a task explicitly states otherwise.

---

## 2. Project Reference Points

### 2.1 Reference Components (Actual Files — Inspect These First)

| Purpose | Component / File |
|---------|-----------------|
| Page shell structure | `app-page-layout` → `frontend/src/app/shared/components/page-layout/page-layout.component.ts` |
| Loading spinner | `app-loading-state` → `frontend/src/app/shared/components/loading-state/loading-state.component.ts` |
| Skeleton rows | `app-skeleton-loader` → `frontend/src/app/shared/components/skeleton-loader/skeleton-loader.component.ts` |
| Empty / no-results state | `app-empty-state` → `frontend/src/app/shared/components/empty-state/empty-state.component.ts` |
| Destructive confirmation | `app-confirm-dialog` → `frontend/src/app/shared/components/confirm-dialog/confirm-dialog.component.ts` |
| User form layout | `utilisateur-form` → `frontend/src/app/pages/utilisateurs/utilisateur-form/` |
| Canal VD/VH toggle | `app-canal-toggle` → `frontend/src/app/shared/components/canal-toggle/` |
| Date range picker | `app-date-range-picker` → `frontend/src/app/shared/components/date-range-picker/` |
| Active filter chips | `app-active-filter-chips` → `frontend/src/app/shared/components/active-filter-chips/` |

### 2.2 Required Core Services (Use — Don't Duplicate)

| Service | File | Purpose |
|---------|------|---------|
| `NotificationService` | `frontend/src/app/core/services/notification.service.ts` | All toast messages |
| `RoleService` | `frontend/src/app/core/services/role.service.ts` | All role checks |
| `FormSubmitHelper` | `frontend/src/app/core/services/form-submit.helper.ts` | Form save/load patterns |
| `ConfirmDialogHelper` | `frontend/src/app/core/services/confirm-dialog.helper.ts` | Confirm dialog state |
| `DistributorContextService` | `frontend/src/app/core/services/distributor-context.service.ts` | Current distributor |
| `ColumnStateService` | `frontend/src/app/core/services/column-state.service.ts` | Column visibility |
| `PaginationHelper` | `frontend/src/app/core/services/pagination.helper.ts` | Batch loading / scroll |
| `CanalHelper` | `frontend/src/app/core/services/canal.helper.ts` | VD/VH value selection |
| `FamilleColorService` | `frontend/src/app/core/services/famille-color.service.ts` | Family badge colors |
| `FilterStateHelper` | `frontend/src/app/core/services/filter-state.helper.ts` | Filter state management |
| `SearchFilterHelper` | `frontend/src/app/core/services/search-filter.helper.ts` | Search filtering |
| `SortHelper` | `frontend/src/app/core/services/sort.helper.ts` | Sorting logic |
| `ExportHelper` | `frontend/src/app/core/services/export.helper.ts` | CSV/Excel export |
| `DateHelper` | `frontend/src/app/core/services/date.helper.ts` | Date formatting |
| `FormatService` | `frontend/src/app/core/services/format.service.ts` | Number/currency formatting |

### 2.3 Required Constants (Use — Don't Duplicate)

| Constant | File | Contains |
|----------|------|---------|
| `APP_CONFIG` | `frontend/src/app/core/constants/app.constants.ts` | Toast timings, page sizes, debounce ms, API messages |
| `BATCH_SIZE`, `SEARCH_DEBOUNCE_MS`, `SCROLL_THRESHOLD` | same file | Pagination constants |
| `CATEGORY_LABELS`, `CATEGORY_BADGES` | same file | Client category display |
| `ROLE_LABELS`, `ROLE_BADGES`, `ROLE_HIERARCHY` | `frontend/src/app/core/constants/roles.ts` | Role display constants |

---

## 3. Mandatory Refactor Process

Before changing a component, inspect:
1. The target TypeScript file, HTML template, and SCSS file
2. Related services and models
3. The reference components listed in §2.1
4. Existing services in §2.2 — is any needed logic already there?
5. Constants in §2.3 — is any needed value already there?
6. Global SCSS files in §17 — does any existing class already express what is needed?

Do not immediately rewrite. Prefer adapting existing project patterns over creating new abstractions.

---

## 4. Angular 20 Control Flow

Use Angular 20 built-in template control flow only:

```html
@if (loading()) { }
@for (item of items(); track item.id) { }
```

Never introduce `*ngIf` or `*ngFor` in any refactored or new component.

Every `@for` must use a stable `track` expression. Prefer `track item.id`. Use `track $index` only when no stable identifier exists.

---

## 5. State Management

Use Angular signals for all local UI state:

```ts
readonly loading = signal(false);
readonly error = signal<string | null>(null);
readonly items = signal<Item[]>([]);
```

Use `computed()` for derived values — never store separately what can be derived:

```ts
readonly isEmpty = computed(() => !this.loading() && this.items().length === 0);
readonly showError = computed(() => !this.loading() && !!this.error());
```

---

## 6. Component Responsibilities

Components handle: UI state, user interaction, form interaction, calling services, mapping results to UI state, navigation, and presentation logic.

Components must NOT contain: API logic, data access logic, token parsing, auth persistence, business calculations used in multiple places, reusable transformations, repeated validation, repeated formatting.

---

## 7. Service Boundaries

Move to a service when code: calls an API, is reused across multiple components, manages auth/session state, manages shared application state, performs reusable business logic, performs repeated transformations, coordinates several HTTP requests.

Always check §2.2 before creating a new service.

---

## 8. Dependency Injection

Use `inject()` consistently (project convention). Mark injected dependencies `readonly`:

```ts
private readonly notify = inject(NotificationService);
private readonly roleService = inject(RoleService);
private readonly router = inject(Router);
```

Do not mix constructor injection and `inject()`.

---

## 9. TypeScript Standards

- Use strict typing. Avoid `any` — prefer `unknown` with safe narrowing.
- Use interfaces/types for: API requests, API responses, component view models, form payloads, auth payloads, error structures.
- Do not duplicate interfaces that already exist in `frontend/src/app/core/models/`.

---

## 10. Role Checks

**Never** write raw role string comparisons in components. Always use `RoleService`:

```ts
// WRONG
if (user.role === 'platform_admin') { ... }

// CORRECT
if (this.roleService.isPlatformAdmin()) { ... }
```

Available methods: `isPlatformAdmin()`, `isDistributorAdmin()`, `isSuperviseur()`, `isPrevendeur()`, `isAdmin()`, `isAdminOrSuperviseur()`, `canManageRole(targetRole)`.

Role display: use `ROLE_LABELS[role]` and `ROLE_BADGES[role]` from `frontend/src/app/core/constants/roles.ts`. Never hardcode role labels or badge classes.

Actual role values: `platform_admin`, `distributor_admin`, `superviseur`, `prevendeur`.

---

## 11. Toast Notifications

**Never** call `MessageService` directly in components. Use `NotificationService`:

```ts
this.notify.success('Utilisateur créé avec succès');
this.notify.error('Une erreur est survenue');
this.notify.warn('Attention...');
this.notify.showHttpError(error); // extracts error.error.detail automatically
```

Toast durations come from `APP_CONFIG.TOAST.SHORT` / `APP_CONFIG.TOAST.LONG` — never hardcode milliseconds.

---

## 12. Form Submission

Use `FormSubmitHelper` for all form save/load operations:

```ts
private readonly formHelper = inject(FormSubmitHelper);

// Save
this.formHelper.submit(this.form, v => this.saving.set(v), this.service.create(data), {
  successMessage: 'Utilisateur créé',
  navigateTo: '/utilisateurs',
});

// Load
this.formHelper.load(this.service.getItem(id), v => this.loading.set(v), {
  onSuccess: (data) => this.form.patchValue(data),
});
```

---

## 13. Confirmation Dialogs

Use `ConfirmDialogHelper` + `app-confirm-dialog`:

```ts
private readonly confirmHelper = inject(ConfirmDialogHelper);
confirmState = this.confirmHelper.createEmptyState();

openDelete(item: Item) {
  this.confirmState = this.confirmHelper.createDeleteConfirm(
    item, item.nom, () => this.delete(item)
  );
}
```

```html
<app-confirm-dialog
  [visible]="confirmState.visible"
  [title]="confirmState.title"
  [message]="confirmState.message"
  (onConfirmed)="confirmHelper.confirm(confirmState)"
  (onCancelled)="confirmHelper.closeConfirm(confirmState)"
/>
```

---

## 14. Canal VD/VH Selection

Use `CanalHelper.selectByCanal()` — never repeat ternaries:

```ts
private readonly canalHelper = inject(CanalHelper);

// WRONG
const value = this.canal === 'VD' ? row.vd_tonnes : row.vh_tonnes;

// CORRECT
const value = this.canalHelper.selectByCanal(this.canal, row.vd_tonnes, row.vh_tonnes);
```

---

## 15. UI State Pattern

State presentation must be consistent across all pages:

```html
@if (loading()) {
  <app-loading-state message="Chargement…" />
} @else if (error()) {
  <!-- error state using global classes -->
} @else if (items().length === 0) {
  <app-empty-state icon="pi-inbox" message="Aucun résultat" />
} @else {
  <!-- page content -->
}
```

Three states are distinct and must use different UI:
- **Empty**: no data exists at all
- **No results**: data exists but current search/filter matched nothing
- **Error**: request failed

### Components to Use

**Loading**: `<app-loading-state message="..." [compact]="true" />`

**Skeleton rows** (while data loads):
```html
<app-skeleton-loader [rows]="6" [columns]="5" />
```

**Empty state**:
```html
<app-empty-state icon="pi-inbox" message="Aucun élément" subMessage="Ajoutez un élément pour commencer" />
```

---

## 16. Page Layout

Use `app-page-layout` for all list/management pages:

```html
<app-page-layout
  icon="pi-users"
  title="Utilisateurs"
  subtitle="Gérer les comptes"
  [actions]="actionsTemplate"
  [toolbar]="toolbarTemplate">

  <!-- page content here -->

</app-page-layout>

<ng-template #actionsTemplate>
  <button class="btn-add" (click)="openCreate()">
    <i class="pi pi-plus"></i> Ajouter
  </button>
</ng-template>

<ng-template #toolbarTemplate>
  <!-- filters, search -->
</ng-template>
```

The global `.page-header` and `.page-header__*` classes are defined in `_layout.scss`. The `app-page-layout` component uses these classes internally.

---

## 17. Global SCSS Architecture

### Actual SCSS Files (Use the Correct One)

| File | Contains |
|------|---------|
| `_layout.scss` | Admin shell, sidebar, page header, page-icon, form grids (form-grid-2/3/4), KPI grid, dashboard patterns, uform-* classes, mob-* mobile patterns |
| `_cards.scss` | `.card`, `.card--compact`, `.stat-card`, `.stat-card__*`, `.card-label`, `.card-section-header` |
| `_badges.scss` | `.badge`, `.badge--success`, `.badge--warning`, `.badge--danger`, `.badge--info` |
| `_buttons.scss` | `.btn-add`, `.btn-secondary`, `.filter-chip`, `.filter-chip--active`, `.p-button` overrides |
| `_inputs.scss` | `.field`, `.field-label`, `.field-error`, PrimeNG input overrides (p-inputtext, p-select, etc.) |
| `_animations.scss` | All keyframes (shimmer, skeleton, row-in, card-in, slide-up, slide-down, fade-in, fade-out, bounce, pulse, spin) + utility classes (.animate-shimmer, .animate-skeleton, .animate-pulse, .animate-spin) |
| `_filters.scss` | Filter toolbar patterns, segmented controls |
| `_toolbar.scss` | Toolbar layout patterns |
| `_select.scss` | p-select / dropdown overlay styles |
| `_table.scss` | Table layout, `.table-action-btn`, column patterns |
| `_typography.scss` | Text scale, font weight variables |
| `_spacing.scss` | Space scale variables |
| `_colors.scss` | Color CSS variables |
| `_mixins.scss` | Shared SCSS mixins (surface-card, flex-between, flex-center, square, mobile-only, text-truncate) |
| `_effects.scss` | Shadow, blur, glass effects |
| `_objectifs-shared.scss` | Objectifs table shared styles |

**No `_skeleton.scss` or `_states.scss` exist in this project.** Skeleton animation uses `_animations.scss` keyframes (`shimmer`, `skeleton`) or the `app-skeleton-loader` component. Empty/error states use `app-empty-state` component.

### Component SCSS

Component SCSS must be avoided. Do NOT add styles to `*.component.scss` unless there is a strong technical reason. All reusable styling belongs in the global SCSS files above.

---

## 18. Styling Reuse Priority

Before adding CSS:
1. Search all global SCSS files in §17 for an existing class
2. Reuse exact match
3. Reuse the closest pattern
4. Compose existing classes
5. Only then create a new reusable global class in the correct file

Never create a component-specific class for something that should be global.

---

## 19. BEM Naming

Follow the project's established BEM naming:

```scss
.page-header {}
.page-header__left {}
.page-header__title {}
.page-header__actions {}

.stat-card {}
.stat-card__icon {}
.stat-card__body {}
.stat-card__value {}
.stat-card__icon--primary {}
```

Names represent UI responsibility, not appearance. Avoid: `.box`, `.wrapper2`, `.custom-style`, `.red-text`.

---

## 20. Buttons

Use global classes from `_buttons.scss`. Never define component-specific button styles.

```html
<!-- Primary action (add/create) -->
<button class="btn-add" type="button">
  <i class="pi pi-plus"></i> Ajouter
</button>

<!-- Secondary action (cancel, export, etc.) -->
<button class="btn-secondary" type="button">
  <i class="pi pi-download"></i> Exporter
</button>

<!-- Filter pill (active toggle) -->
<button class="filter-chip" [class.filter-chip--active]="isActive">
  VD
</button>
```

For form buttons, use `.uform-btn--save` and `.uform-btn--cancel` within `.uform-footer` (defined in `_layout.scss`).

---

## 21. Badges

Use the badge system from `_badges.scss`:

```html
<span class="badge badge--success">Actif</span>
<span class="badge badge--warning">En attente</span>
<span class="badge badge--danger">Inactif</span>
<span class="badge badge--info">Info</span>
```

For role badges: use `ROLE_BADGES[user.role]` constant, which returns the correct class string.
For category badges: use `CATEGORY_BADGES[category]` constant.

---

## 22. Cards

Use card patterns from `_cards.scss`:

```html
<!-- Basic card -->
<div class="card">...</div>
<div class="card card--compact">...</div>

<!-- KPI stat card -->
<div class="stat-card">
  <div class="stat-card__icon stat-card__icon--primary">
    <i class="pi pi-users"></i>
  </div>
  <div class="stat-card__body">
    <div class="stat-card__value">{{ count }}</div>
    <div class="stat-card__label">Utilisateurs</div>
  </div>
</div>
```

For user/entity forms, use the `uform-*` pattern from `_layout.scss`:

```html
<div class="uform-wrap">
  <div class="uform-hero">...</div>
  <div class="uform-section">
    <h3 class="uform-section__title"><i class="pi pi-user"></i> Informations</h3>
    <div class="uform-fields">
      <!-- field elements -->
    </div>
  </div>
</div>
```

---

## 23. Forms

### Field Pattern

Use the `.field` class from `_inputs.scss` for every form field:

```html
<div class="field">
  <label class="field-label" for="email">Email</label>
  <input pInputText id="email" formControlName="email" type="email" />
  @if (form.get('email')?.errors?.['required'] && form.get('email')?.touched) {
    <span class="field-error">L'email est requis</span>
  }
</div>
```

For multi-column forms use grid classes from `_layout.scss`:

```html
<div class="uform-fields">  <!-- auto 2-col grid, 1-col on mobile -->
  <div class="field">...</div>
  <div class="field">...</div>
</div>
```

Or explicit grids: `.form-grid-2`, `.form-grid-3`, `.form-grid-4` (collapse to 1 column on mobile).

### Form Buttons

```html
<div class="uform-footer">
  <button class="uform-btn uform-btn--cancel" type="button" (click)="cancel()">
    Annuler
  </button>
  <button class="uform-btn uform-btn--save" type="submit" [disabled]="saving()">
    @if (saving()) { <i class="pi pi-spin pi-spinner"></i> }
    Enregistrer
  </button>
</div>
```

### Reactive Forms

Use strongly-typed reactive forms. Mark loading/saving with signals. Use `FormSubmitHelper` (§12) — never write the subscribe boilerplate manually.

---

## 24. Animations

All keyframes are defined in `_animations.scss`. Reference them by name:

```scss
// Skeleton shimmer
animation: shimmer 1.8s ease-in-out infinite;

// Row entry
animation: row-in 0.2s ease;

// Card entry
animation: card-in 0.2s ease;
```

Or use utility classes:

```html
<div class="animate-shimmer">...</div>
<div class="animate-skeleton">...</div>
<div class="animate-pulse">...</div>
<div class="animate-spin">...</div>
```

Never define duplicate keyframes locally. Never create a component-scoped shimmer/skeleton animation — the global ones already exist.

---

## 25. Methods

Methods must have one clear responsibility, descriptive names, no unnecessary nesting, no duplicated blocks.

Remove: duplicate methods, unused methods, empty methods, commented-out legacy code, obsolete TODOs.

If two methods share substantially the same logic, extract a shared private method or move to a service.

---

## 26. Imports

Every modified TypeScript file must be verified for:
- Unused imports → remove
- Duplicate imports → deduplicate
- Imports that can be replaced by existing shared abstractions

---

## 27. HTML Standards

Templates must be: semantic, minimal, readable, consistent with reference components (§2.1). Do not put business logic in templates. Prefer computed signals in TypeScript for complex display conditions.

---

## 28. Accessibility

All form inputs require proper labels (`for` + `id`). Icon-only buttons require `aria-label`. Do not communicate state using color alone.

---

## 29. TypeScript Strictness

- Keep strict mode enabled. Do not weaken compiler settings.
- Avoid `as any` and unnecessary type assertions.
- Prefer type guards, discriminated unions, explicit response types, typed reactive forms.
- Avoid non-null assertions (`value!`) unless the invariant is guaranteed and obvious.

---

## 30. RxJS Standards

Prefer signals for local component state. RxJS for: HTTP streams, router events, WebSockets, event composition, cancellation, multi-source async workflows.

Use `takeUntilDestroyed()` to avoid leaks. Avoid nested subscriptions — compose streams. For rapidly-changing input (search, filters), use `switchMap()` to cancel stale requests.

---

## 31. Constants

Extract repeated values. Before creating a new constant, check `app.constants.ts` and `roles.ts` first.

Magic numbers with domain meaning (toast durations, page sizes, debounce delays) must reference `APP_CONFIG`, `BATCH_SIZE`, `SEARCH_DEBOUNCE_MS`, `SCROLL_THRESHOLD`.

---

## 32. Dead Code

Remove before delivery:
- Unused imports, variables, constants, methods, injected services
- Unused signals, computed signals, HTML variables
- Commented-out legacy code
- Unreachable branches
- Obsolete TODOs

Version control preserves history. Never keep dead code "just in case."

---

## 33. Duplicate Code

Before completing any task, check for: duplicate logic, constants, methods, validation, API calls, HTML patterns, styling, error handling, state variables.

The questions to ask:
- Does this helper already exist in §2.2?
- Does this constant already exist in §2.3?
- Is this API call already in a service?
- Does a global class in §17 already express this styling?
- Does a shared component in §2.1 already solve this UI need?

---

## 34. Premature New Components

Do not create a shared component because two blocks look similar. Extract a component only when: structure and behavior repeat, the abstraction has a clear responsibility, and reuse meaningfully improves maintainability.

---

## 35. FastAPI — Layer Separation

```
routers/        ← HTTP concerns only, call services
schemas/        ← Pydantic request/response models
models/         ← SQLAlchemy ORM models
services/       ← Business logic
repositories/   ← Data access queries
dependencies/   ← FastAPI Depends() factories
core/           ← Config, security, shared utilities
```

Routers must not contain business workflows. Services coordinate business rules. Repositories centralize queries.

---

## 36. FastAPI — Multi-Tenant Security (Project-Specific)

Every endpoint (except PLATFORM_ADMIN) must filter by the current user's `distributor_id`:

```python
# Use the dependency — never extract distributor_id manually in routes
from api.deps import get_current_distributor, require_admin

@router.get("/ventes")
async def list_ventes(
    distributor = Depends(get_current_distributor),
    current_user = Depends(get_current_user),
):
    # platform_admin sees all; others see only distributor's data
```

Role constants: `platform_admin`, `distributor_admin`, `superviseur`, `prevendeur`. Never hardcode role strings inline in router logic.

---

## 37. FastAPI — Schemas

Use Pydantic models for all request/response. Do not return raw ORM objects. Separate create/update/read schemas when their fields differ.

---

## 38. Authentication Security

- Never store plaintext passwords
- Never log passwords, raw tokens, refresh tokens, or sensitive secrets
- JWT token must include `distributor_id` for quick authorization checks
- Password reset tokens must expire and be single-use
- Frontend route guards / hidden buttons are UX only — backend must verify every protected operation

---

## 39. SQL Safety

Never build SQL using string concatenation with user input. Use ORM expressions or parameterized queries only.

---

## 40. Database Migrations

Use Alembic for all schema changes. Never modify production schema without a migration. Every migration must be reviewed for: forward compatibility, existing data, nullability changes, index creation cost, foreign keys, rollback implications.

Staged approach for risky changes: add nullable column → deploy → backfill → enforce constraint → remove old field.

---

## 41. Audit Fields

Persistent business entities use `created_at` and `updated_at` with UTC timezone-aware timestamps. For traceability: `created_by`, `updated_by`. Use `distributor_id` FK on all tenant-scoped entities.

---

## 42. Money and Decimal Values

Use `NUMERIC`/`DECIMAL` in PostgreSQL and Python `Decimal` for all monetary/quantity values. Never use floats for money.

---

## 43. Pagination

Backend enforces maximum page size (default: 50, max: 100 from `APP_CONFIG.PAGE_SIZE`). Frontend uses `PaginationHelper` for batch loading with scroll detection. Use `BATCH_SIZE` constant (100) for batch sizes. Use `SEARCH_DEBOUNCE_MS` (400ms) for search debounce.

---

## 44. Performance

Avoid: N+1 database queries, repeated HTTP calls, duplicate API requests, calling computational methods repeatedly from templates, unnecessary change-triggering state updates.

Prefer `computed()` signals and preprocessed view models over template expressions.

---

## 45. Error Handling

Backend exceptions → log server-side with context → return safe generic message to frontend.

Frontend: use `NotificationService.showHttpError(error)` which automatically extracts `error.error.detail`. Never expose stack traces, SQL details, or internal paths in API responses.

---

## 46. HTTP Status Codes

200 (read/update), 201 (created), 204 (no body), 400 (invalid request), 401 (unauthenticated), 403 (unauthorized), 404 (not found), 409 (conflict), 422 (validation failure), 500 (server failure). Never return 200 for known failures.

---

## 47. Authorization

Authentication ≠ authorization. Every protected operation must be verified server-side. Object-level authorization: verify a user can access the specific resource, not just that they are logged in. Use `require_admin()`, `require_platform_admin()`, `require_distributor_admin()` FastAPI dependencies.

---

## 48. Secrets

Never hardcode: database passwords, JWT secrets, API keys, SMTP credentials, production URLs. Use environment-based configuration. Frontend `.env` must never contain backend secrets.

---

## 49. Naming Standards

Descriptive intent-based names:

```ts
loadUsers()       ✓      doStuff()        ✗
submitForm()      ✓      handleData()     ✗
isSubmitting      ✓      flag             ✗
hasError          ✓      temp2            ✗
canManageRole()   ✓      check()          ✗
```

---

## 50. Console Statements

Remove all `console.log` and `console.debug` before delivery. Never log passwords, tokens, or sensitive user data.

---

## 51. Git Commit Quality

Commits should be focused. Avoid mixing formatting changes, refactors, features, migrations, and bug fixes in one commit. Commit messages describe intent, not file names.

---

## 52. Pre-Delivery Audit (Mandatory)

Before delivering any change, verify all of the following:

**TypeScript**
- [ ] No unused imports
- [ ] No unused variables, constants, or methods
- [ ] No duplicate methods, constants, or logic
- [ ] No unnecessary `any`
- [ ] Signals used for local state; `computed()` for derived state
- [ ] No API logic that belongs in a service
- [ ] No role checks outside `RoleService`
- [ ] No toast calls outside `NotificationService`
- [ ] No repeated auth/session logic
- [ ] No dead code

**HTML**
- [ ] Angular 20 control flow (`@if`, `@for`) used throughout
- [ ] Every `@for` has proper `track`
- [ ] Loading state: `app-loading-state` or `app-skeleton-loader`
- [ ] Empty state: `app-empty-state`
- [ ] Forms use `.field` + `.field-label` + `.field-error` pattern
- [ ] Buttons use `.btn-add`, `.btn-secondary`, `.uform-btn--*`
- [ ] Cards use `.card`, `.stat-card`, `.uform-section`
- [ ] No business logic in template expressions
- [ ] Accessibility labels present

**Styling**
- [ ] No new component SCSS unless strictly necessary
- [ ] Existing global classes reused first (checked §17)
- [ ] Any new classes added to the correct global partial
- [ ] New class names follow BEM
- [ ] No duplicate keyframes — use `_animations.scss`
- [ ] No inline styles unless strictly justified

**Architecture**
- [ ] Components remain presentation-focused
- [ ] API calls live in services
- [ ] Business logic not duplicated
- [ ] Auth/session logic centralized
- [ ] Checked §2.2 before creating any new service
- [ ] Checked §2.3 before creating any new constant

**Backend**
- [ ] Router thin; business logic in service layer
- [ ] All endpoints filter by `distributor_id` (unless PLATFORM_ADMIN)
- [ ] Pydantic schemas for all request/response
- [ ] Migrations for all schema changes
- [ ] No hardcoded secrets
- [ ] No sensitive values logged

---

## 53. Required Deliverable Format

Return only files that actually changed. Group by:

1. **TypeScript** (`component.ts`, services if changed)
2. **HTML** (`component.html`)
3. **Global SCSS** (name the exact file: `_layout.scss`, `_cards.scss`, etc.)
4. **Supporting** (models, constants, validators — only if actually changed)

Do not generate unnecessary files.

---

## 54. Planning Rule

When asked "Don't do anything yet. Tell me how you are planning to do it." — provide only:
- Files/components to inspect
- Existing services/constants/components to reuse (reference §2)
- State changes planned
- Template changes planned
- Styling reuse decisions
- Dead/duplicate code to remove

No code. No implementation. Only plan.

---

## 55. AI / Developer Execution Rule

AI-generated code is not exempt from review. Before delivering:
- Verify all service names, method names, class names exist in the actual project
- Verify all CSS classes actually exist in global SCSS files
- Verify all constants reference actual constants files
- Do not invent APIs, services, classes, routes, or style names without verifying them in the codebase
- Do not claim an abstraction exists without inspecting the relevant file

---

## 56. Core Principles

Before adding code: **"Does this already exist in §2.2 or §2.3?"**

Before adding CSS: **"Does a class in §17 already express this?"**

Before adding component logic: **"Does this belong in the component, or in a service in §2.2?"**

Before creating a new component: **"Does §2.1 already solve this?"**

The project evolves through reuse and centralization, not through accumulation of one-off code.
