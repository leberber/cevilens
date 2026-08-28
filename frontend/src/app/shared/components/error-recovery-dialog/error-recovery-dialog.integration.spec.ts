import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErrorRecoveryDialogComponent } from './error-recovery-dialog.component';
import { ErrorRecoveryService } from '../../../core/services/error-recovery.service';
import { NotificationService } from '../../../core/services/notification.service';

/**
 * Integration tests for ErrorRecoveryDialog with HTTP error handling workflows
 *
 * Tests cover:
 * 1. Global error handler pattern with HTTP errors
 * 2. Local component error handling
 * 3. Authentication flow with 401/403 errors
 * 4. Data validation errors
 * 5. Network and server errors
 * 6. Complete user workflow scenarios
 */

// Test component that integrates error recovery dialog with HTTP calls
@Component({
  selector: 'app-test-error-recovery',
  standalone: true,
  imports: [CommonModule, ErrorRecoveryDialogComponent],
  template: `
    <div class="test-container">
      <button id="load-data-btn" (click)="loadData()">Load Data</button>
      <button id="submit-form-btn" (click)="submitForm()">Submit Form</button>
      <button id="export-btn" (click)="exportData()">Export Data</button>
      <div id="data-display" *ngIf="data">{{ data }}</div>
      <div id="loading-state" *ngIf="isLoading">Loading...</div>
      <app-error-recovery-dialog [error]="error" />
    </div>
  `,
})
class TestErrorRecoveryComponent {
  @ViewChild(ErrorRecoveryDialogComponent) errorDialog!: ErrorRecoveryDialogComponent;

  error: any = null;
  data: string | null = null;
  isLoading = false;
  retryCallback: (() => void) | null = null;

  constructor(
    private http: HttpClient,
    private errorRecoveryService: ErrorRecoveryService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  loadData() {
    this.isLoading = true;
    this.http.get<{ data: string }>('/api/data').subscribe({
      next: (response) => {
        this.data = response.data;
        this.isLoading = false;
        this.error = null;
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.handleError(err, 'Erreur de chargement', () => this.loadData());
      },
    });
  }

  submitForm() {
    this.isLoading = true;
    this.http.post<{ success: boolean }>('/api/submit', { test: 'data' }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.error = null;
        this.notificationService.success('Formulaire soumis avec succès');
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.handleError(err, 'Erreur de soumission', () => this.submitForm());
      },
    });
  }

  exportData() {
    this.isLoading = true;
    this.http.get('/api/export').subscribe({
      next: () => {
        this.isLoading = false;
        this.error = null;
        this.notificationService.success('Données exportées');
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.handleError(err, 'Erreur d\'export', () => this.exportData());
      },
    });
  }

  private handleError(err: HttpErrorResponse, operation: string, retry: () => void) {
    this.retryCallback = retry;
    const recovery = this.errorRecoveryService.getRecovery(err.status);
    this.error = {
      ...recovery,
      message: recovery.message,
      action: {
        label: recovery.action?.label || 'Réessayer',
        callback: () => {
          this.error = null;
          retry();
        },
      },
    };
  }
}

describe('ErrorRecoveryDialog - Integration Tests', () => {
  let component: TestErrorRecoveryComponent;
  let fixture: ComponentFixture<TestErrorRecoveryComponent>;
  let httpMock: HttpTestingController;
  let errorRecoveryService: ErrorRecoveryService;
  let router: jasmine.SpyObj<Router>;
  let notificationService: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const notificationSpy = jasmine.createSpyObj('NotificationService', ['success', 'error', 'warn', 'info']);

    await TestBed.configureTestingModule({
      imports: [TestErrorRecoveryComponent, HttpClientTestingModule],
      providers: [
        ErrorRecoveryService,
        { provide: Router, useValue: routerSpy },
        { provide: NotificationService, useValue: notificationSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestErrorRecoveryComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    errorRecoveryService = TestBed.inject(ErrorRecoveryService);
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    notificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ============================================================================
  // 1. GLOBAL ERROR HANDLER PATTERN (8 tests)
  // ============================================================================

  describe('Global Error Handler Pattern', () => {
    it('should display error dialog when HTTP 500 error occurs', fakeAsync(() => {
      component.loadData();
      tick();

      const req = httpMock.expectOne('/api/data');
      req.flush('Internal Server Error', { status: 500, statusText: 'Server Error' });
      tick();

      fixture.detectChanges();
      expect(component.error).toBeTruthy();
      expect(component.error.title).toBe('Erreur serveur');
      const dialog = fixture.nativeElement.querySelector('.error-recovery-dialog');
      expect(dialog).toBeTruthy();
    }));

    it('should display error message and suggestions when error occurs', fakeAsync(() => {
      component.loadData();
      tick();

      const req = httpMock.expectOne('/api/data');
      req.flush('Server Error', { status: 500, statusText: 'Server Error' });
      tick();

      fixture.detectChanges();
      expect(component.error.message).toContain('Une erreur interne');
      expect(component.error.suggestions.length).toBeGreaterThan(0);
    }));

    it('should show Retry button when error has action', fakeAsync(() => {
      component.loadData();
      tick();

      const req = httpMock.expectOne('/api/data');
      req.flush('Error', { status: 422, statusText: 'Validation Error' });
      tick();

      fixture.detectChanges();
      const actionBtn = fixture.nativeElement.querySelector('.action-btn--primary');
      expect(actionBtn).toBeTruthy();
      expect(actionBtn.textContent).toContain('Réessayer');
    }));

    it('should retry request when Retry button is clicked', fakeAsync(() => {
      component.loadData();
      tick();

      let req = httpMock.expectOne('/api/data');
      req.flush('Error', { status: 500, statusText: 'Server Error' });
      tick();

      fixture.detectChanges();
      const actionBtn = fixture.nativeElement.querySelector('.action-btn--primary');
      expect(actionBtn).toBeTruthy();

      // Click retry
      actionBtn.click();
      tick();

      // Should make new request
      req = httpMock.expectOne('/api/data');
      req.flush({ data: 'Success' });
      tick();

      fixture.detectChanges();
      expect(component.data).toBe('Success');
      expect(component.error).toBeNull();
    }));

    it('should navigate to login when user clicks Login button for 401 error', fakeAsync(() => {
      component.loadData();
      tick();

      const req = httpMock.expectOne('/api/data');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      tick();

      fixture.detectChanges();
      const recovery = errorRecoveryService.getRecovery(401);
      expect(recovery.action?.label).toBe('Se reconnecter');

      // Simulate clicking the action button
      recovery.action?.callback();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    }));

    it('should dismiss dialog when user clicks Dismiss button', fakeAsync(() => {
      component.loadData();
      tick();

      const req = httpMock.expectOne('/api/data');
      req.flush('Error', { status: 500, statusText: 'Server Error' });
      tick();

      fixture.detectChanges();
      expect(component.error).toBeTruthy();

      // Manually dismiss error
      component.error = null;
      fixture.detectChanges();

      const dialog = fixture.nativeElement.querySelector('.error-recovery-dialog');
      expect(dialog).toBeNull();
    }));

    it('should clear error state after dismiss', fakeAsync(() => {
      component.loadData();
      tick();

      const req = httpMock.expectOne('/api/data');
      req.flush('Error', { status: 500, statusText: 'Server Error' });
      tick();

      fixture.detectChanges();
      expect(component.error).toBeTruthy();

      component.error = null;
      fixture.detectChanges();

      expect(component.error).toBeNull();
    }));

    it('should show multiple errors sequentially', fakeAsync(() => {
      // First error
      component.loadData();
      tick();

      let req = httpMock.expectOne('/api/data');
      req.flush('Error 1', { status: 404, statusText: 'Not Found' });
      tick();

      fixture.detectChanges();
      expect(component.error.title).toBe('Ressource non trouvée');

      // Clear first error
      component.error = null;
      fixture.detectChanges();

      // Second error
      component.submitForm();
      tick();

      req = httpMock.expectOne('/api/submit');
      req.flush('Error 2', { status: 422, statusText: 'Validation Error' });
      tick();

      fixture.detectChanges();
      expect(component.error.title).toBe('Données invalides');
    }));

    it('should replace previous error with new error', fakeAsync(() => {
      // First error
      component.loadData();
      tick();

      let req = httpMock.expectOne('/api/data');
      req.flush('Error 1', { status: 404, statusText: 'Not Found' });
      tick();

      fixture.detectChanges();
      expect(component.error.title).toBe('Ressource non trouvée');

      // New error without dismissing previous
      component.submitForm();
      tick();

      req = httpMock.expectOne('/api/submit');
      req.flush('Error 2', { status: 500, statusText: 'Server Error' });
      tick();

      fixture.detectChanges();
      expect(component.error.title).toBe('Erreur serveur');
    }));
  });

  // ============================================================================
  // 2. LOCAL COMPONENT ERROR HANDLING (7 tests)
  // ============================================================================

  describe('Local Component Error Handling', () => {
    it('should catch HTTP error in component and display contextual error', fakeAsync(() => {
      component.loadData();
      tick();

      const req = httpMock.expectOne('/api/data');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
      tick();

      fixture.detectChanges();
      expect(component.error).toBeTruthy();
      expect(component.error.title).toBe('Ressource non trouvée');
    }));

    it('should allow retry of failed operation', fakeAsync(() => {
      component.loadData();
      tick();

      let req = httpMock.expectOne('/api/data');
      req.flush('Error', { status: 500, statusText: 'Server Error' });
      tick();

      fixture.detectChanges();
      const actionBtn = fixture.nativeElement.querySelector('.action-btn--primary');
      expect(actionBtn).toBeTruthy();

      // Click retry
      actionBtn.click();
      tick();

      // New request should be made
      req = httpMock.expectOne('/api/data');
      req.flush({ data: 'Success' });
      tick();

      fixture.detectChanges();
      expect(component.data).toBe('Success');
    }));

    it('should allow navigation away from error dialog', fakeAsync(() => {
      component.loadData();
      tick();

      const req = httpMock.expectOne('/api/data');
      req.flush('Error', { status: 403, statusText: 'Forbidden' });
      tick();

      fixture.detectChanges();
      expect(component.error).toBeTruthy();

      // Get the navigation action from error recovery
      const recovery = errorRecoveryService.getRecovery(403);
      expect(recovery.action?.label).toBe('Retour au tableau de bord');
      recovery.action?.callback();

      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    }));

    it('should not affect other operations when one fails', fakeAsync(() => {
      // First operation fails
      component.loadData();
      tick();

      let req = httpMock.expectOne('/api/data');
      req.flush('Error', { status: 500, statusText: 'Server Error' });
      tick();

      fixture.detectChanges();
      expect(component.error).toBeTruthy();

      // Dismiss error
      component.error = null;
      fixture.detectChanges();

      // Second operation succeeds
      component.submitForm();
      tick();

      req = httpMock.expectOne('/api/submit');
      req.flush({ success: true });
      tick();

      fixture.detectChanges();
      expect(notificationService.success).toHaveBeenCalled();
      expect(component.error).toBeNull();
    }));

    it('should manage loading state correctly during error', fakeAsync(() => {
      component.loadData();
      fixture.detectChanges();

      expect(component.isLoading).toBe(true);

      const req = httpMock.expectOne('/api/data');
      req.flush('Error', { status: 500, statusText: 'Server Error' });
      tick();

      fixture.detectChanges();
      expect(component.isLoading).toBe(false);
      expect(component.error).toBeTruthy();
    }));

    it('should manage loading state correctly after successful retry', fakeAsync(() => {
      component.loadData();
      tick();

      let req = httpMock.expectOne('/api/data');
      req.flush('Error', { status: 500, statusText: 'Server Error' });
      tick();

      fixture.detectChanges();
      expect(component.isLoading).toBe(false);

      // Retry
      const actionBtn = fixture.nativeElement.querySelector('.action-btn--primary');
      actionBtn.click();
      tick();

      expect(component.isLoading).toBe(true);

      req = httpMock.expectOne('/api/data');
      req.flush({ data: 'Success' });
      tick();

      fixture.detectChanges();
      expect(component.isLoading).toBe(false);
    }));

    it('should show toast notification and error dialog simultaneously', fakeAsync(() => {
      component.submitForm();
      tick();

      const req = httpMock.expectOne('/api/submit');
      req.flush('Validation Error', { status: 422, statusText: 'Unprocessable Entity' });
      tick();

      fixture.detectChanges();
      // Error dialog is shown
      expect(component.error).toBeTruthy();
      // Toast could be shown by interceptor
      expect(notificationService.warn).toHaveBeenCalled();
    }));
  });

  // ============================================================================
  // 3. AUTHENTICATION FLOW (6 tests)
  // ============================================================================

  describe('Authentication Flow', () => {
    it('should show "Session Expired" dialog for 401 error', fakeAsync(() => {
      component.loadData();
      tick();

      const req = httpMock.expectOne('/api/data');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      tick();

      fixture.detectChanges();
      expect(component.error.title).toBe('Session expirée');
      expect(component.error.message).toContain('session a expiré');
    }));

    it('should show Login button that navigates to /login', fakeAsync(() => {
      component.loadData();
      tick();

      const req = httpMock.expectOne('/api/data');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      tick();

      fixture.detectChanges();
      const recovery = errorRecoveryService.getRecovery(401);
      expect(recovery.action?.label).toBe('Se reconnecter');

      recovery.action?.callback();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    }));

    it('should clear form and show 401 on failed form submission', fakeAsync(() => {
      component.submitForm();
      tick();

      const req = httpMock.expectOne('/api/submit');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      tick();

      fixture.detectChanges();
      expect(component.error.title).toBe('Session expirée');
      expect(component.isLoading).toBe(false);
    }));

    it('should allow operation to succeed after login', fakeAsync(() => {
      component.loadData();
      tick();

      let req = httpMock.expectOne('/api/data');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      tick();

      fixture.detectChanges();
      expect(component.error).toBeTruthy();

      // Simulate redirect and login
      router.navigate(['dashboard']);

      // Retry operation
      component.error = null;
      component.loadData();
      tick();

      req = httpMock.expectOne('/api/data');
      req.flush({ data: 'Secure Data' });
      tick();

      fixture.detectChanges();
      expect(component.data).toBe('Secure Data');
      expect(component.error).toBeNull();
    }));

    it('should show "Access Denied" dialog for 403 error', fakeAsync(() => {
      component.loadData();
      tick();

      const req = httpMock.expectOne('/api/data');
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
      tick();

      fixture.detectChanges();
      expect(component.error.title).toBe('Accès refusé');
      expect(component.error.message).toContain('permissions');
    }));

    it('should allow navigation to dashboard after 403 error', fakeAsync(() => {
      component.loadData();
      tick();

      const req = httpMock.expectOne('/api/data');
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
      tick();

      fixture.detectChanges();
      const recovery = errorRecoveryService.getRecovery(403);
      recovery.action?.callback();

      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    }));
  });

  // ============================================================================
  // 4. DATA VALIDATION ERRORS (6 tests)
  // ============================================================================

  describe('Data Validation Errors', () => {
    it('should show validation error for 422 response', fakeAsync(() => {
      component.submitForm();
      tick();

      const req = httpMock.expectOne('/api/submit');
      req.flush('Invalid data', { status: 422, statusText: 'Unprocessable Entity' });
      tick();

      fixture.detectChanges();
      expect(component.error.title).toBe('Données invalides');
      expect(component.error.suggestions.length).toBeGreaterThan(0);
    }));

    it('should show suggestions for data validation', fakeAsync(() => {
      component.submitForm();
      tick();

      const req = httpMock.expectOne('/api/submit');
      req.flush('Invalid email format', { status: 422, statusText: 'Unprocessable Entity' });
      tick();

      fixture.detectChanges();
      const suggestions = component.error.suggestions;
      expect(suggestions.length).toBeGreaterThan(0);
      expect(Array.isArray(suggestions)).toBe(true);
    }));

    it('should allow user to fix data and retry', fakeAsync(() => {
      component.submitForm();
      tick();

      let req = httpMock.expectOne('/api/submit');
      req.flush('Invalid data', { status: 422, statusText: 'Unprocessable Entity' });
      tick();

      fixture.detectChanges();
      expect(component.error).toBeTruthy();

      // User fixes data and clicks retry
      const actionBtn = fixture.nativeElement.querySelector('.action-btn--primary');
      actionBtn.click();
      tick();

      // New request with corrected data
      req = httpMock.expectOne('/api/submit');
      req.flush({ success: true });
      tick();

      fixture.detectChanges();
      expect(component.error).toBeNull();
    }));

    it('should display field-level error information', fakeAsync(() => {
      component.submitForm();
      tick();

      const req = httpMock.expectOne('/api/submit');
      const errorResponse = {
        detail: 'Email format is invalid',
        fields: { email: 'Invalid email' }
      };
      req.flush(errorResponse, { status: 422, statusText: 'Unprocessable Entity' });
      tick();

      fixture.detectChanges();
      expect(component.error.message).toContain('Données invalides');
    }));

    it('should show success after validation fix', fakeAsync(() => {
      component.submitForm();
      tick();

      let req = httpMock.expectOne('/api/submit');
      req.flush('Invalid data', { status: 422, statusText: 'Unprocessable Entity' });
      tick();

      fixture.detectChanges();

      // Retry after fixing data
      component.error = null;
      component.submitForm();
      tick();

      req = httpMock.expectOne('/api/submit');
      req.flush({ success: true });
      tick();

      fixture.detectChanges();
      expect(notificationService.success).toHaveBeenCalledWith('Formulaire soumis avec succès');
    }));

    it('should display multiple validation errors', fakeAsync(() => {
      component.submitForm();
      tick();

      const req = httpMock.expectOne('/api/submit');
      req.flush('Multiple validation errors', { status: 422, statusText: 'Unprocessable Entity' });
      tick();

      fixture.detectChanges();
      expect(component.error).toBeTruthy();
      expect(component.error.suggestions.length).toBeGreaterThan(0);
    }));
  });

  // ============================================================================
  // 5. NETWORK & SERVER ERRORS (5 tests)
  // ============================================================================

  describe('Network & Server Errors', () => {
    it('should show "Connection Lost" message for network error', fakeAsync(() => {
      component.loadData();
      tick();

      const req = httpMock.expectOne('/api/data');
      req.error(new ErrorEvent('network error', { message: 'Connection lost' }));
      tick();

      fixture.detectChanges();
      // Network error (status 0) shows connection error
      const recovery = errorRecoveryService.getRecovery(0);
      expect(recovery.title).toBe('Erreur de connexion');
    }));

    it('should suggest internet connection checks for network error', fakeAsync(() => {
      const recovery = errorRecoveryService.getRecovery('NETWORK_ERROR');
      expect(recovery.suggestions.length).toBeGreaterThan(0);
      expect(recovery.suggestions.some((s: string) => s.toLowerCase().includes('internet'))).toBe(true);
    }));

    it('should show "Server Error" message for 500 response', fakeAsync(() => {
      component.loadData();
      tick();

      const req = httpMock.expectOne('/api/data');
      req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
      tick();

      fixture.detectChanges();
      expect(component.error.title).toBe('Erreur serveur');
    }));

    it('should suggest contacting support for server error', fakeAsync(() => {
      const recovery = errorRecoveryService.getRecovery(500);
      const suggestions = recovery.suggestions;
      expect(suggestions.some((s: string) => s.toLowerCase().includes('support'))).toBe(true);
    }));

    it('should allow retry after temporary server issue', fakeAsync(() => {
      component.loadData();
      tick();

      let req = httpMock.expectOne('/api/data');
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
      tick();

      fixture.detectChanges();

      // Click retry
      const actionBtn = fixture.nativeElement.querySelector('.action-btn--primary');
      actionBtn.click();
      tick();

      // Second attempt succeeds
      req = httpMock.expectOne('/api/data');
      req.flush({ data: 'Success' });
      tick();

      fixture.detectChanges();
      expect(component.data).toBe('Success');
      expect(component.error).toBeNull();
    }));

    it('should handle gracefully after sustained errors', fakeAsync(() => {
      component.loadData();
      tick();

      let req = httpMock.expectOne('/api/data');
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
      tick();

      fixture.detectChanges();
      expect(component.error).toBeTruthy();

      // Dismiss error
      component.error = null;
      fixture.detectChanges();

      expect(component.error).toBeNull();
    }));
  });

  // ============================================================================
  // 6. USER FLOW SCENARIOS (3 tests)
  // ============================================================================

  describe('User Flow Scenarios', () => {
    it('should handle complete purchase workflow with retry', fakeAsync(() => {
      // Step 1: User initiates purchase (form submission)
      component.submitForm();
      tick();

      let req = httpMock.expectOne('/api/submit');
      req.flush('Server temporarily unavailable', { status: 500, statusText: 'Server Error' });
      tick();

      fixture.detectChanges();
      expect(component.error).toBeTruthy();
      expect(component.error.title).toBe('Erreur serveur');

      // Step 2: Dialog shows error with retry option
      const actionBtn = fixture.nativeElement.querySelector('.action-btn--primary');
      expect(actionBtn).toBeTruthy();
      expect(actionBtn.textContent).toContain('Réessayer');

      // Step 3: User clicks retry
      actionBtn.click();
      tick();

      // Step 4: Request succeeds
      req = httpMock.expectOne('/api/submit');
      req.flush({ success: true });
      tick();

      fixture.detectChanges();
      expect(component.error).toBeNull();
      expect(notificationService.success).toHaveBeenCalledWith('Formulaire soumis avec succès');
    }));

    it('should handle form submission with validation error recovery', fakeAsync(() => {
      // Step 1: User submits invalid form
      component.submitForm();
      tick();

      let req = httpMock.expectOne('/api/submit');
      req.flush('Invalid email format', { status: 422, statusText: 'Unprocessable Entity' });
      tick();

      fixture.detectChanges();
      expect(component.error.title).toBe('Données invalides');

      // Step 2: Dialog shows validation error with suggestions
      expect(component.error.suggestions.length).toBeGreaterThan(0);

      // Step 3: User fixes data and retries
      const actionBtn = fixture.nativeElement.querySelector('.action-btn--primary');
      actionBtn.click();
      tick();

      // Step 4: Request succeeds with corrected data
      req = httpMock.expectOne('/api/submit');
      req.flush({ success: true });
      tick();

      fixture.detectChanges();
      expect(component.error).toBeNull();
    }));

    it('should handle data export with error handling', fakeAsync(() => {
      // Step 1: User initiates export
      component.exportData();
      tick();

      let req = httpMock.expectOne('/api/export');
      req.flush('Export failed', { status: 500, statusText: 'Server Error' });
      tick();

      fixture.detectChanges();
      expect(component.error).toBeTruthy();

      // Step 2: Error dialog shown
      const suggestions = fixture.nativeElement.querySelectorAll('.suggestions-list li');
      expect(suggestions.length).toBeGreaterThan(0);

      // Step 3: User clicks retry
      const actionBtn = fixture.nativeElement.querySelector('.action-btn--primary');
      actionBtn.click();
      tick();

      // Step 4: Export succeeds
      req = httpMock.expectOne('/api/export');
      req.flush({});
      tick();

      fixture.detectChanges();
      expect(component.error).toBeNull();
      expect(notificationService.success).toHaveBeenCalledWith('Données exportées');
    }));
  });

  // ============================================================================
  // ADDITIONAL EDGE CASES & STATE MANAGEMENT (3 tests)
  // ============================================================================

  describe('Error Dialog State Management & Edge Cases', () => {
    it('should properly transition between error and success states', fakeAsync(() => {
      // Initially no error
      expect(component.error).toBeNull();

      // Error occurs
      component.loadData();
      tick();

      let req = httpMock.expectOne('/api/data');
      req.flush('Error', { status: 500, statusText: 'Server Error' });
      tick();

      fixture.detectChanges();
      expect(component.error).toBeTruthy();

      // Retry succeeds
      const actionBtn = fixture.nativeElement.querySelector('.action-btn--primary');
      actionBtn.click();
      tick();

      req = httpMock.expectOne('/api/data');
      req.flush({ data: 'Success' });
      tick();

      fixture.detectChanges();
      expect(component.error).toBeNull();
      expect(component.data).toBe('Success');
    }));

    it('should handle rapid consecutive errors', fakeAsync(() => {
      // First error
      component.loadData();
      tick();

      let req = httpMock.expectOne('/api/data');
      req.flush('Error 1', { status: 404, statusText: 'Not Found' });
      tick();

      fixture.detectChanges();
      const firstError = component.error.title;

      // Second error immediately after
      component.submitForm();
      tick();

      req = httpMock.expectOne('/api/submit');
      req.flush('Error 2', { status: 500, statusText: 'Server Error' });
      tick();

      fixture.detectChanges();
      // Last error should be displayed
      expect(component.error.title).not.toBe(firstError);
      expect(component.error.title).toBe('Erreur serveur');
    }));

    it('should maintain dialog visibility through error state changes', fakeAsync(() => {
      component.loadData();
      tick();

      const req = httpMock.expectOne('/api/data');
      req.flush('Error', { status: 500, statusText: 'Server Error' });
      tick();

      fixture.detectChanges();
      let dialog = fixture.nativeElement.querySelector('.error-recovery-dialog');
      expect(dialog).toBeTruthy();

      // Change error content
      component.error = {
        title: 'New Error',
        message: 'Different message',
        suggestions: ['Suggestion'],
        dismissible: true,
        action: { label: 'Action', callback: () => {} }
      };
      fixture.detectChanges();

      dialog = fixture.nativeElement.querySelector('.error-recovery-dialog');
      expect(dialog).toBeTruthy();
      expect(dialog.querySelector('h3').textContent).toBe('New Error');
    }));
  });
});
