# Cevital Frontend - Code Style Guide

A comprehensive guide for consistent, maintainable, and high-quality code across the entire project.

---

## Table of Contents

1. [TypeScript/Angular Conventions](#typescript--angular-conventions)
2. [Component Architecture](#component-architecture)
3. [Service Patterns](#service-patterns)
4. [Testing Conventions](#testing-conventions)
5. [SCSS/CSS Standards](#scsscss-standards)
6. [Naming Conventions](#naming-conventions)
7. [File Organization](#file-organization)
8. [Best Practices](#best-practices)
9. [Documentation Standards](#documentation-standards)

---

## TypeScript / Angular Conventions

### Imports Organization

Order imports as follows:
1. Angular core modules
2. RxJS/third-party libraries
3. Local application modules
4. Relative paths

```typescript
// ✅ CORRECT
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { UserService } from '../../core/services/user.service';
import { NotificationService } from '../../core/services/notification.service';

import { User } from '../models/user.model';
```

### Dependency Injection

Always use `inject()` function (Angular 14+), not constructor parameters:

```typescript
// ✅ CORRECT
export class MyComponent {
  private userService = inject(UserService);
  private router = inject(Router);

  loadUser() {
    this.userService.getUser().subscribe(...);
  }
}

// ❌ AVOID
export class MyComponent {
  constructor(private userService: UserService, private router: Router) {}
}
```

### Change Detection Strategy

Use `ChangeDetectionStrategy.OnPush` for all components:

```typescript
@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [CommonModule, ...],
  templateUrl: './my.component.html',
  styleUrl: './my.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,  // ✅ REQUIRED
})
export class MyComponent { }
```

### Signal-Based State Management

Use Angular signals for reactive state instead of properties:

```typescript
// ✅ CORRECT - Signal-based
export class MyComponent {
  users = signal<User[]>([]);
  loading = signal(false);
  searchQuery = signal('');

  // Memoized derived state
  filteredUsers = computed(() =>
    this.users().filter(u =>
      u.name.includes(this.searchQuery())
    )
  );

  ngOnInit() {
    this.loading.set(true);
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      }
    });
  }
}

// Template usage
// <div>{{ filteredUsers().length }} users</div>
// <input (input)="searchQuery.set($any($event.target).value)" />
```

### Observable Patterns

Use `takeUntilDestroyed()` for automatic unsubscription:

```typescript
// ✅ CORRECT
export class MyComponent implements OnInit {
  private userService = inject(UserService);
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    this.userService.getUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(users => this.users.set(users));
  }
}

// ❌ AVOID - Manual unsubscription
ngOnDestroy() {
  this.subscription?.unsubscribe();
}
```

---

## Component Architecture

### Component Structure

Keep components focused and under ~150 lines:

```typescript
/**
 * MyComponent - Brief description of component purpose
 *
 * Handles: X, Y, Z
 * Emits: @Output events
 * Uses: Services, utilities
 */
@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [CommonModule, FormsModule, ...],
  templateUrl: './my.component.html',
  styleUrl: './my.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyComponent implements OnInit {
  // 1. Injected services
  private userService = inject(UserService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // 2. @Input properties
  @Input() userId: string = '';

  // 3. @Output events
  @Output() userSelected = new EventEmitter<User>();

  // 4. @ViewChild references
  @ViewChild('inputField') inputField!: ElementRef;

  // 5. State signals
  users = signal<User[]>([]);
  loading = signal(false);

  // 6. Computed signals (derived state)
  activeUsers = computed(() =>
    this.users().filter(u => u.active)
  );

  // 7. Lifecycle hooks
  ngOnInit() {
    this.loadUsers();
  }

  // 8. Public methods
  selectUser(user: User) {
    this.userSelected.emit(user);
  }

  // 9. Private methods
  private loadUsers() {
    this.loading.set(true);
    this.userService.getUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.users.set(users);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
```

### Standalone Components

All new components must be standalone:

```typescript
// ✅ CORRECT
@Component({
  selector: 'app-my',
  standalone: true,
  imports: [CommonModule, FormsModule, MySharedComponent],
  template: `...`
})
export class MyComponent { }

// ❌ AVOID
@NgModule({
  declarations: [MyComponent],
  imports: [CommonModule]
})
export class MyModule { }
```

### Component Decomposition Rules

Break down components when they exceed:
- **~150 lines** of TypeScript logic
- **~200 lines** of template HTML
- **~300 lines** of SCSS

Extract into sub-components with focused responsibilities:

```
my-page/
├── my-page.component.ts (orchestration only, <100 lines)
├── my-page.component.html (layout only, <50 lines)
├── my-page.component.scss (page-level styles)
├── components/
│   ├── my-toolbar.component.ts (toolbar, <80 lines)
│   ├── my-toolbar.component.html
│   ├── my-table.component.ts (table, <100 lines)
│   ├── my-table.component.html
│   └── my-dialog.component.ts (dialog, <80 lines)
└── services/
    └── my-page.service.ts (state & API calls)
```

---

## Service Patterns

### Service Naming & Organization

```typescript
// ✅ CORRECT - Clear responsibility
// location: src/app/core/services/user.service.ts
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  getUsers(): Observable<User[]> { }
  getUser(id: string): Observable<User> { }
  createUser(user: User): Observable<User> { }
  updateUser(id: string, user: User): Observable<User> { }
  deleteUser(id: string): Observable<void> { }
}
```

### Helper/Utility Services

For utility functions without side effects:

```typescript
// location: src/app/core/services/date.helper.ts
@Injectable({ providedIn: 'root' })
export class DateHelper {
  getFirstDayOfMonth(period: string): string {
    // Pure function, no dependencies
  }

  getLastDayOfMonth(period: string): string {
    // Pure function, no dependencies
  }
}

// Usage
export class MyComponent {
  private dateHelper = inject(DateHelper);

  firstDay = this.dateHelper.getFirstDayOfMonth('2024-01');
}
```

### State Management Services

Use signals for reactive state:

```typescript
@Injectable({ providedIn: 'root' })
export class UserStateService {
  // Writable signals
  private usersSignal = signal<User[]>([]);
  private selectedUserSignal = signal<User | null>(null);
  private loadingSignal = signal(false);

  // Public readonly signals
  users = this.usersSignal.asReadonly();
  selectedUser = this.selectedUserSignal.asReadonly();
  loading = this.loadingSignal.asReadonly();

  // Computed signals
  activeCount = computed(() =>
    this.usersSignal().filter(u => u.active).length
  );

  // Methods to update state
  loadUsers() {
    this.loadingSignal.set(true);
    // Load and update signal
  }

  selectUser(user: User) {
    this.selectedUserSignal.set(user);
  }
}
```

### API Service Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = 'https://api.example.com';

  /**
   * Get all items
   * @param filters Optional filter object
   * @returns Observable of items array
   */
  getItems(filters?: Record<string, any>): Observable<Item[]> {
    let params = new HttpParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params = params.set(key, value);
      }
    });
    return this.http.get<Item[]>(`${this.baseUrl}/items`, { params });
  }

  /**
   * Create new item
   * @param item Item data to create
   * @returns Observable of created item
   */
  createItem(item: Omit<Item, 'id'>): Observable<Item> {
    return this.http.post<Item>(`${this.baseUrl}/items`, item);
  }
}
```

---

## Testing Conventions

### Test File Organization

```typescript
// location: src/app/core/services/user.service.spec.ts
describe('UserService', () => {
  let service: UserService;
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserService],
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(UserService);
    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  // Tests organized by feature/method
  describe('getUsers', () => {
    it('should fetch all users', (done) => {
      service.getUsers().subscribe({
        next: (users) => {
          expect(users.length).toBe(2);
          done();
        }
      });

      const req = httpTestingController.expectOne('/api/users');
      req.flush([{ id: '1', name: 'John' }, { id: '2', name: 'Jane' }]);
    });
  });
});
```

### Component Test Pattern

```typescript
// location: src/app/pages/users/users.component.spec.ts
describe('UsersComponent', () => {
  let component: UsersComponent;
  let fixture: ComponentFixture<UsersComponent>;
  let userService: jasmine.SpyObj<UserService>;

  beforeEach(async () => {
    const userServiceSpy = jasmine.createSpyObj('UserService', ['getUsers']);

    await TestBed.configureTestingModule({
      imports: [UsersComponent],
      providers: [{ provide: UserService, useValue: userServiceSpy }],
    }).compileComponents();

    userService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
  });

  describe('initialization', () => {
    it('should load users on init', () => {
      userService.getUsers.and.returnValue(of([{ id: '1', name: 'John' }]));

      fixture.detectChanges();

      expect(component.users()).toEqual([{ id: '1', name: 'John' }]);
      expect(userService.getUsers).toHaveBeenCalled();
    });
  });
});
```

### Test Naming Convention

```typescript
// ✅ CORRECT - Clear, describes behavior
it('should display error message when form is invalid', () => { });
it('should disable submit button while loading', () => { });
it('should navigate to dashboard after successful login', () => { });

// ❌ AVOID - Vague or incomplete
it('should work', () => { });
it('tests error', () => { });
it('form validation', () => { });
```

---

## SCSS/CSS Standards

### Design Tokens Usage

All colors, spacing, and sizing must use CSS custom properties:

```scss
// ✅ CORRECT - Using design tokens
.button {
  background-color: var(--primary-color);
  color: var(--text-color);
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);

  &:hover {
    background-color: var(--primary-color-hover);
    box-shadow: var(--shadow-lg);
  }

  &:disabled {
    background-color: var(--surface-disabled);
    color: var(--text-disabled);
  }
}

// ❌ AVOID - Hardcoded values
.button {
  background-color: #3b82f6;
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 8px;
}
```

### CSS Custom Properties Defined

Located in `src/styles/variables.css`:

```css
:root {
  /* Colors */
  --primary-color: #3b82f6;
  --primary-color-hover: #2563eb;
  --primary-color-dark: #1d4ed8;

  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #0ea5e9;

  --text-color: #1f2937;
  --text-secondary: #6b7280;
  --text-disabled: #d1d5db;

  --surface-card: #ffffff;
  --surface-background: #f9fafb;
  --surface-disabled: #e5e7eb;

  --border-color-light: #e5e7eb;
  --border-color: #d1d5db;

  /* Spacing */
  --spacing-xs: 0.25rem;    /* 4px */
  --spacing-sm: 0.5rem;     /* 8px */
  --spacing-md: 1rem;       /* 16px */
  --spacing-lg: 1.5rem;     /* 24px */
  --spacing-xl: 2rem;       /* 32px */
  --spacing-2xl: 3rem;      /* 48px */

  /* Border Radius */
  --radius-sm: 0.25rem;     /* 4px */
  --radius-md: 0.5rem;      /* 8px */
  --radius-lg: 0.75rem;     /* 12px */
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 300ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 500ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### SCSS Module Organization

```scss
// ✅ CORRECT - Organized by category
// src/styles/
// ├── _variables.scss       (design tokens)
// ├── _mixins.scss          (reusable mixins)
// ├── _base.scss            (global reset, typography)
// ├── _animations.scss      (keyframes, transitions)
// ├── _buttons.scss         (button patterns)
// ├── _forms.scss           (form controls)
// ├── _layout.scss          (grid, flexbox layouts)
// ├── _table.scss           (table styles)
// ├── _toolbar.scss         (toolbar patterns)
// ├── _filters.scss         (filter card patterns)
// └── styles.scss           (main import file)

// src/styles/styles.scss
@use './variables';
@use './mixins';
@use './base';
@use './animations';
@use './buttons';
@use './forms';
@use './layout';
@use './table';
@use './toolbar';
@use './filters';
```

### Component SCSS Best Practices

```scss
// ✅ CORRECT - Component scoped styles
.user-card {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--surface-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);

  // Nested elements
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color-light);
    padding-bottom: var(--spacing-md);
  }

  &__title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-color);
  }

  // Modifiers
  &--highlighted {
    border: 2px solid var(--primary-color);
  }

  &--loading {
    opacity: 0.6;
    pointer-events: none;
  }
}
```

### Responsive Design

Use CSS media queries with design tokens:

```scss
// ✅ CORRECT - Mobile-first responsive
.toolbar {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  @media (min-width: 1024px) {
    gap: var(--spacing-lg);
  }
}
```

---

## Naming Conventions

### File Naming

```
// Components
ComponentName.component.ts
ComponentName.component.html
ComponentName.component.scss

// Services
service-name.service.ts
service-name.service.spec.ts

// Helpers/Utilities
helper-name.helper.ts
utility-name.util.ts
helper-name.spec.ts

// Models
model-name.model.ts

// Pipes
pipe-name.pipe.ts

// Directives
directive-name.directive.ts
```

### Class Naming

```typescript
// Components - PascalCase, end with 'Component'
export class UserListComponent { }
export class UserFormComponent { }
export class UserCardComponent { }

// Services - PascalCase, end with 'Service'
export class UserService { }
export class NotificationService { }
export class LoadingStateService { }

// Helpers - PascalCase, end with 'Helper'
export class FormValidationHelper { }
export class DateHelper { }

// Models - PascalCase
export interface User { }
export class UserModel { }

// Pipes - PascalCase, end with 'Pipe'
export class CurrencyFormatPipe { }

// Directives - camelCase, start with app
export class appHighlight { }
```

### Variable Naming

```typescript
// ✅ CORRECT - Clear, descriptive names
private userService = inject(UserService);
users = signal<User[]>([]);
loading = signal(false);
selectedUser = signal<User | null>(null);
hasPermission = computed(() => this.role() === 'admin');

// ❌ AVOID - Vague or unclear names
private us = inject(UserService);
u = signal<User[]>([]);
l = signal(false);
su = signal<User | null>(null);
check = computed(() => this.r() === 'admin');
```

### Method Naming

```typescript
// ✅ CORRECT - Verb-based, clear action
loadUsers() { }
createUser(user: User) { }
updateUser(id: string, user: User) { }
deleteUser(id: string) { }
selectUser(user: User) { }
isUserActive(user: User): boolean { }
getUsersByRole(role: string): User[] { }

// ❌ AVOID
get_users() { }
user_create(data) { }
update_user_data() { }
doDelete() { }
```

### Constant Naming

```typescript
// ✅ CORRECT - UPPER_SNAKE_CASE for constants
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_PAGE_SIZE = 20;
const API_BASE_URL = 'https://api.example.com';
const DATE_FORMAT = 'YYYY-MM-DD';

// Enum - PascalCase
enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}
```

---

## File Organization

### Feature Module Structure

```
src/app/pages/users/
├── users.component.ts
├── users.component.html
├── users.component.scss
├── users.routes.ts (if using route-level code splitting)
├── components/
│   ├── user-list/
│   │   ├── user-list.component.ts
│   │   ├── user-list.component.html
│   │   └── user-list.component.scss
│   ├── user-form/
│   │   ├── user-form.component.ts
│   │   ├── user-form.component.html
│   │   └── user-form.component.scss
│   └── user-card/
│       ├── user-card.component.ts
│       ├── user-card.component.html
│       └── user-card.component.scss
├── services/
│   ├── user-state.service.ts
│   ├── user-filter.service.ts
│   └── user-state.service.spec.ts
└── models/
    └── user.model.ts
```

### Core Module Structure

```
src/app/core/
├── services/
│   ├── user.service.ts
│   ├── notification.service.ts
│   ├── date.helper.ts
│   ├── form-validation.helper.ts
│   └── *.service.spec.ts
├── models/
│   ├── user.model.ts
│   ├── api-response.model.ts
│   └── *.model.ts
├── constants/
│   ├── app.constants.ts
│   ├── colors.constants.ts
│   └── roles.constants.ts
├── utils/
│   ├── math.util.ts
│   ├── string.util.ts
│   └── *.util.spec.ts
├── interceptors/
│   ├── http-error.interceptor.ts
│   └── http-error.interceptor.spec.ts
├── pipes/
│   ├── currency-format.pipe.ts
│   └── *.pipe.spec.ts
└── directives/
    ├── virtual-scroll.directive.ts
    └── *.directive.spec.ts
```

### Shared Module Structure

```
src/app/shared/
├── components/
│   ├── page-layout/
│   │   ├── page-layout.component.ts
│   │   ├── page-layout.component.html
│   │   └── page-layout.component.scss
│   ├── empty-state/
│   │   ├── empty-state.component.ts
│   │   ├── empty-state.component.html
│   │   └── empty-state.component.scss
│   ├── form-error/
│   ├── loading-spinner/
│   ├── status-badge/
│   └── [other-shared-components]/
├── directives/
│   ├── virtual-scroll-container.directive.ts
│   └── *.directive.spec.ts
└── pipes/
    └── *.pipe.ts
```

---

## Best Practices

### 1. Single Responsibility Principle

Each file/class should have one reason to change:

```typescript
// ✅ CORRECT - Single responsibility
// location: src/app/core/services/user.service.ts
@Injectable({ providedIn: 'root' })
export class UserService {
  // Only handles user data fetching
  getUsers(): Observable<User[]> { }
}

// location: src/app/core/services/user-state.service.ts
@Injectable({ providedIn: 'root' })
export class UserStateService {
  // Only handles user state management
  users = signal<User[]>([]);
  setUsers(users: User[]) { }
}

// ❌ AVOID - Multiple responsibilities
@Injectable({ providedIn: 'root' })
export class UserService {
  users = signal<User[]>([]);
  getUsers(): Observable<User[]> { }
  displayNotification() { }
  navigateToDashboard() { }
}
```

### 2. DRY (Don't Repeat Yourself)

Extract reusable logic into services or helpers:

```typescript
// ✅ CORRECT - Centralized date logic
@Injectable({ providedIn: 'root' })
export class DateHelper {
  getFirstDayOfMonth(period: string): string {
    // Reusable logic, used in 5+ places
  }
}

// Usage
export class Component1 { /* uses getFirstDayOfMonth */ }
export class Component2 { /* uses getFirstDayOfMonth */ }
export class Component3 { /* uses getFirstDayOfMonth */ }
```

### 3. Avoid Magic Numbers

Use named constants:

```typescript
// ✅ CORRECT
const MAX_ITEMS_PER_PAGE = 20;
const DEBOUNCE_TIME_MS = 300;
const MAX_FILE_SIZE_MB = 10;

loadItems(page = 1) {
  return this.http.get('/api/items', {
    params: { limit: MAX_ITEMS_PER_PAGE, offset: (page - 1) * MAX_ITEMS_PER_PAGE }
  });
}

// ❌ AVOID
loadItems(page = 1) {
  return this.http.get('/api/items', {
    params: { limit: 20, offset: (page - 1) * 20 }
  });
}
```

### 4. Type Safety

Always provide explicit types, never use `any`:

```typescript
// ✅ CORRECT - Explicit types
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

getUser(id: string): Observable<User> {
  return this.http.get<User>(`/api/users/${id}`);
}

filterUsers(users: User[], predicate: (u: User) => boolean): User[] {
  return users.filter(predicate);
}

// ❌ AVOID - Using 'any'
getUser(id: any): Observable<any> {
  return this.http.get(`/api/users/${id}`);
}

filterUsers(users: any[], predicate: any): any[] {
  return users.filter(predicate);
}
```

### 5. Error Handling

Always handle errors explicitly:

```typescript
// ✅ CORRECT - Explicit error handling
loadUsers() {
  this.userService.getUsers()
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (users) => this.users.set(users),
      error: (error) => {
        console.error('Failed to load users', error);
        this.notificationService.error('Failed to load users');
        this.users.set([]);
      },
      complete: () => console.log('Users loaded'),
    });
}

// ❌ AVOID - Ignoring errors
loadUsers() {
  this.userService.getUsers()
    .subscribe(users => this.users.set(users));
}
```

### 6. Performance Considerations

Use computed signals for expensive operations:

```typescript
// ✅ CORRECT - Memoized computation
export class MyComponent {
  users = signal<User[]>([]);
  searchQuery = signal('');

  // Only recalculates when users or searchQuery change
  filteredUsers = computed(() =>
    this.users()
      .filter(u => u.name.includes(this.searchQuery()))
      .sort((a, b) => a.name.localeCompare(b.name))
  );
}

// Template
// <div>{{ filteredUsers().length }} results</div>
// <div *ngFor="let user of filteredUsers()">{{ user.name }}</div>

// ❌ AVOID - Recalculates on every change detection cycle
export class MyComponent {
  users: User[] = [];
  searchQuery = '';

  get filteredUsers(): User[] {
    return this.users
      .filter(u => u.name.includes(this.searchQuery))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
```

### 7. Component Communication

Use @Input/@Output for parent-child communication:

```typescript
// ✅ CORRECT - Clear component interface
@Component({
  selector: 'app-user-card',
  standalone: true,
  template: `...`
})
export class UserCardComponent {
  @Input() user!: User;
  @Output() userSelected = new EventEmitter<User>();

  onSelect() {
    this.userSelected.emit(this.user);
  }
}

// Usage in parent
<app-user-card
  [user]="selectedUser"
  (userSelected)="onUserSelected($event)" />

// ❌ AVOID - Tight coupling with service
export class UserCardComponent {
  user: User | null = null;

  constructor(private userService: UserService) {
    this.userService.selectedUser$.subscribe(
      user => this.user = user
    );
  }
}
```

---

## Documentation Standards

### JSDoc Comments

Every public method/class should have JSDoc:

```typescript
/**
 * Calculates the percentage of actual value against target
 *
 * @param actual - Current value
 * @param target - Target/goal value
 * @param maxLimit - Maximum percentage cap (default: 999)
 * @returns Calculated percentage, capped at maxLimit
 *
 * @example
 * calculatePercentage(50, 100);        // Returns: 50
 * calculatePercentage(150, 100, 100);  // Returns: 100 (capped)
 * calculatePercentage(50, 200);        // Returns: 25
 */
export function calculatePercentage(
  actual: number | null,
  target: number | null,
  maxLimit: number = 999
): number {
  if (!target || target === 0) return 0;
  return Math.min(Math.round((actual ?? 0) / target * 100), maxLimit);
}
```

### Component Documentation

```typescript
/**
 * UserListComponent - Displays a list of users with filtering and sorting
 *
 * Features:
 * - Multi-column display with customizable columns
 * - Search filtering across all columns
 * - Sortable by any column
 * - Inline edit mode for quick updates
 * - Delete with confirmation dialog
 *
 * @example
 * <app-user-list
 *   [users]="users$ | async"
 *   (userSelected)="selectUser($event)"
 *   (userDeleted)="removeUser($event)" />
 *
 * @input users - Array of users to display
 * @output userSelected - Emitted when user is selected
 * @output userDeleted - Emitted when user is deleted
 */
@Component({
  selector: 'app-user-list',
  standalone: true,
  template: `...`
})
export class UserListComponent { }
```

### Service Documentation

```typescript
/**
 * UserService - Handles all user-related API operations
 *
 * Provides methods for:
 * - Fetching users with optional filtering
 * - Creating new users
 * - Updating existing users
 * - Deleting users
 *
 * All methods include error handling and return typed observables.
 *
 * @example
 * users = signal<User[]>([]);
 *
 * ngOnInit() {
 *   this.userService.getUsers()
 *     .pipe(takeUntilDestroyed(this.destroyRef))
 *     .subscribe(users => this.users.set(users));
 * }
 */
@Injectable({ providedIn: 'root' })
export class UserService { }
```

### README Files

Each major feature should have a README:

```markdown
# Users Module

## Overview
Manages user creation, editing, and deletion.

## Components
- `UserListComponent` - Displays all users
- `UserFormComponent` - Create/edit user form
- `UserCardComponent` - Individual user display

## Services
- `UserService` - API operations
- `UserStateService` - State management

## Usage
```

---

## Checklist for New Code

Before submitting a pull request, verify:

- [ ] Uses `ChangeDetectionStrategy.OnPush`
- [ ] Uses signals for state management
- [ ] Uses `takeUntilDestroyed()` for subscriptions
- [ ] No hardcoded values (use constants)
- [ ] No `any` types (explicit typing)
- [ ] Error handling implemented
- [ ] 100+ lines of logic extracted to services
- [ ] JSDoc comments on public methods/classes
- [ ] Test coverage for services (80%+)
- [ ] SCSS uses design tokens (no hex colors)
- [ ] Component under 150 lines
- [ ] Template under 200 lines
- [ ] Follows naming conventions
- [ ] No circular dependencies

---

## Additional Resources

- [Angular Best Practices](https://angular.io/guide/styleguide)
- [RxJS Documentation](https://rxjs.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [SCSS Guidelines](https://sass-lang.com/guide)

---

**Last Updated**: 2026-08-28
**Version**: 1.0
**Maintainer**: Development Team
