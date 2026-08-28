import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ErrorRecoveryDialogComponent } from './error-recovery-dialog.component';
import { ErrorRecovery } from '../../../core/services/error-recovery.service';

describe('ErrorRecoveryDialogComponent', () => {
  let component: ErrorRecoveryDialogComponent;
  let fixture: ComponentFixture<ErrorRecoveryDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, ErrorRecoveryDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorRecoveryDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with null error', () => {
      expect(component.error).toBeNull();
    });

    it('should not render dialog when error is null', () => {
      component.error = null;
      fixture.detectChanges();
      const dialog = fixture.nativeElement.querySelector('.error-recovery-dialog');
      expect(dialog).toBeNull();
    });
  });

  describe('Error Display - Title', () => {
    it('should render error title when error is provided', () => {
      component.error = {
        title: 'Session expirée',
        message: 'Votre session a expiré.',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      const titleElement = fixture.nativeElement.querySelector('.error-header h3');
      expect(titleElement).toBeTruthy();
      expect(titleElement.textContent).toBe('Session expirée');
    });

    it('should render different titles based on error', () => {
      component.error = {
        title: 'Erreur serveur',
        message: 'Une erreur interne s\'est produite.',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      const titleElement = fixture.nativeElement.querySelector('.error-header h3');
      expect(titleElement.textContent).toBe('Erreur serveur');

      component.error = {
        title: 'Ressource non trouvée',
        message: 'L\'élément n\'existe pas.',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      expect(titleElement.textContent).toBe('Ressource non trouvée');
    });

    it('should update title when error changes', () => {
      component.error = {
        title: 'Erreur 1',
        message: 'Message 1',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();

      let titleElement = fixture.nativeElement.querySelector('.error-header h3');
      expect(titleElement.textContent).toBe('Erreur 1');

      component.error = {
        title: 'Erreur 2',
        message: 'Message 2',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      titleElement = fixture.nativeElement.querySelector('.error-header h3');
      expect(titleElement.textContent).toBe('Erreur 2');
    });
  });

  describe('Error Display - Message', () => {
    it('should render error message', () => {
      component.error = {
        title: 'Test Error',
        message: 'This is a test error message.',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      const messageElement = fixture.nativeElement.querySelector('.error-message');
      expect(messageElement).toBeTruthy();
      expect(messageElement.textContent).toContain('This is a test error message.');
    });

    it('should render French error messages', () => {
      component.error = {
        title: 'Accès refusé',
        message: 'Vous n\'avez pas les permissions nécessaires pour cette action.',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      const messageElement = fixture.nativeElement.querySelector('.error-message');
      expect(messageElement.textContent).toContain('Vous n\'avez pas les permissions nécessaires');
    });

    it('should update message when error changes', () => {
      component.error = {
        title: 'Error',
        message: 'First message',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();

      let messageElement = fixture.nativeElement.querySelector('.error-message');
      expect(messageElement.textContent).toBe('First message');

      component.error = {
        title: 'Error',
        message: 'Second message',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      messageElement = fixture.nativeElement.querySelector('.error-message');
      expect(messageElement.textContent).toBe('Second message');
    });

    it('should handle long error messages', () => {
      const longMessage = 'A'.repeat(200);
      component.error = {
        title: 'Error',
        message: longMessage,
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      const messageElement = fixture.nativeElement.querySelector('.error-message');
      expect(messageElement.textContent).toContain(longMessage);
    });
  });

  describe('Suggestions List', () => {
    it('should render suggestions when provided', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [
          'First suggestion',
          'Second suggestion',
          'Third suggestion',
        ],
        dismissible: true,
      };
      fixture.detectChanges();
      const suggestionsList = fixture.nativeElement.querySelector('.suggestions-list');
      expect(suggestionsList).toBeTruthy();
      const items = fixture.nativeElement.querySelectorAll('.suggestions-list li');
      expect(items.length).toBe(3);
      expect(items[0].textContent).toBe('First suggestion');
      expect(items[1].textContent).toBe('Second suggestion');
      expect(items[2].textContent).toBe('Third suggestion');
    });

    it('should not render suggestions section when suggestions array is empty', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      const suggestionsDiv = fixture.nativeElement.querySelector('.suggestions');
      expect(suggestionsDiv).toBeNull();
    });

    it('should not render suggestions section when suggestions is undefined', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: undefined as any,
        dismissible: true,
      };
      fixture.detectChanges();
      const suggestionsDiv = fixture.nativeElement.querySelector('.suggestions');
      expect(suggestionsDiv).toBeNull();
    });

    it('should render suggestions header', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: ['Suggestion 1'],
        dismissible: true,
      };
      fixture.detectChanges();
      const header = fixture.nativeElement.querySelector('.suggestions h4');
      expect(header).toBeTruthy();
      expect(header.textContent).toContain('Suggestions:');
    });

    it('should handle multiple suggestions correctly', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [
          'Vérifiez votre connexion Internet.',
          'Attendez quelques instants et réessayez.',
          'Contactez le support si le problème persiste.',
          'Consultez notre page de statut.',
        ],
        dismissible: true,
      };
      fixture.detectChanges();
      const items = fixture.nativeElement.querySelectorAll('.suggestions-list li');
      expect(items.length).toBe(4);
    });

    it('should update suggestions when error changes', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: ['Old suggestion'],
        dismissible: true,
      };
      fixture.detectChanges();

      let items = fixture.nativeElement.querySelectorAll('.suggestions-list li');
      expect(items.length).toBe(1);

      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: ['New suggestion 1', 'New suggestion 2'],
        dismissible: true,
      };
      fixture.detectChanges();
      items = fixture.nativeElement.querySelectorAll('.suggestions-list li');
      expect(items.length).toBe(2);
      expect(items[0].textContent).toBe('New suggestion 1');
    });
  });

  describe('Icon Rendering', () => {
    it('should render icon with correct class', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      const icon = fixture.nativeElement.querySelector('.error-header i');
      expect(icon).toBeTruthy();
      expect(icon.className).toContain('pi');
      expect(icon.className).toContain('pi-exclamation-circle');
    });

    it('should render icon in error header', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      const headerDiv = fixture.nativeElement.querySelector('.error-header');
      const icon = headerDiv.querySelector('i');
      expect(icon).toBeTruthy();
    });

    it('should render icon before title text', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      const headerDiv = fixture.nativeElement.querySelector('.error-header');
      const icon = headerDiv.querySelector('i');
      const title = headerDiv.querySelector('h3');
      expect(icon).toBeTruthy();
      expect(title).toBeTruthy();
      const children = Array.from(headerDiv.children);
      expect(children.indexOf(icon)).toBeLessThan(children.indexOf(title));
    });
  });

  describe('Action Button', () => {
    it('should render action button when action is provided', () => {
      const mockCallback = jasmine.createSpy('callback');
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        action: {
          label: 'Retry',
          callback: mockCallback,
        },
        dismissible: true,
      };
      fixture.detectChanges();
      const actionBtn = fixture.nativeElement.querySelector('.action-btn--primary');
      expect(actionBtn).toBeTruthy();
      expect(actionBtn.textContent).toContain('Retry');
    });

    it('should not render action button when action is undefined', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      const actionBtn = fixture.nativeElement.querySelector('.action-btn--primary');
      expect(actionBtn).toBeNull();
    });

    it('should call action callback when action button is clicked', () => {
      const mockCallback = jasmine.createSpy('callback');
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        action: {
          label: 'Retry',
          callback: mockCallback,
        },
        dismissible: true,
      };
      fixture.detectChanges();
      const actionBtn = fixture.nativeElement.querySelector('.action-btn--primary');
      actionBtn.click();
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should call onAction method when action button is clicked', () => {
      spyOn(component, 'onAction');
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        action: {
          label: 'Retry',
          callback: () => {},
        },
        dismissible: true,
      };
      fixture.detectChanges();
      const actionBtn = fixture.nativeElement.querySelector('.action-btn--primary');
      actionBtn.click();
      expect(component.onAction).toHaveBeenCalled();
    });

    it('should display correct action label', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        action: {
          label: 'Se reconnecter',
          callback: () => {},
        },
        dismissible: true,
      };
      fixture.detectChanges();
      const actionBtn = fixture.nativeElement.querySelector('.action-btn--primary');
      expect(actionBtn.textContent).toContain('Se reconnecter');

      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        action: {
          label: 'Actualiser',
          callback: () => {},
        },
        dismissible: true,
      };
      fixture.detectChanges();
      expect(actionBtn.textContent).toContain('Actualiser');
    });

    it('should have correct CSS class for primary button', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        action: {
          label: 'Action',
          callback: () => {},
        },
        dismissible: true,
      };
      fixture.detectChanges();
      const actionBtn = fixture.nativeElement.querySelector('.action-btn--primary');
      expect(actionBtn.classList.contains('action-btn')).toBe(true);
      expect(actionBtn.classList.contains('action-btn--primary')).toBe(true);
    });

    it('should handle multiple action callbacks sequentially', () => {
      const callback1 = jasmine.createSpy('callback1');
      const callback2 = jasmine.createSpy('callback2');

      component.error = {
        title: 'Error 1',
        message: 'Message 1',
        suggestions: [],
        action: {
          label: 'Action 1',
          callback: callback1,
        },
        dismissible: true,
      };
      fixture.detectChanges();

      let actionBtn = fixture.nativeElement.querySelector('.action-btn--primary');
      actionBtn.click();
      expect(callback1).toHaveBeenCalled();

      component.error = {
        title: 'Error 2',
        message: 'Message 2',
        suggestions: [],
        action: {
          label: 'Action 2',
          callback: callback2,
        },
        dismissible: true,
      };
      fixture.detectChanges();

      actionBtn = fixture.nativeElement.querySelector('.action-btn--primary');
      actionBtn.click();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('Close/Dismiss Button', () => {
    it('should render dismiss button when dismissible is true', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      const dismissBtn = fixture.nativeElement.querySelector('.action-btn--secondary');
      expect(dismissBtn).toBeTruthy();
      expect(dismissBtn.textContent).toContain('Fermer');
    });

    it('should not render dismiss button when dismissible is false', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        dismissible: false,
      };
      fixture.detectChanges();
      const dismissBtn = fixture.nativeElement.querySelector('.action-btn--secondary');
      expect(dismissBtn).toBeNull();
    });

    it('should call onDismiss method when dismiss button is clicked', () => {
      spyOn(component, 'onDismiss');
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      const dismissBtn = fixture.nativeElement.querySelector('.action-btn--secondary');
      dismissBtn.click();
      expect(component.onDismiss).toHaveBeenCalled();
    });

    it('should set error to null when dismiss is called', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        dismissible: true,
      };
      expect(component.error).toBeTruthy();
      component.onDismiss();
      expect(component.error).toBeNull();
    });

    it('should hide dialog after dismissal', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      let dialog = fixture.nativeElement.querySelector('.error-recovery-dialog');
      expect(dialog).toBeTruthy();

      component.onDismiss();
      fixture.detectChanges();
      dialog = fixture.nativeElement.querySelector('.error-recovery-dialog');
      expect(dialog).toBeNull();
    });

    it('should have correct CSS class for secondary button', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      const dismissBtn = fixture.nativeElement.querySelector('.action-btn--secondary');
      expect(dismissBtn.classList.contains('action-btn')).toBe(true);
      expect(dismissBtn.classList.contains('action-btn--secondary')).toBe(true);
    });
  });

  describe('CSS Classes', () => {
    it('should have error-recovery-dialog class on root element', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      const dialog = fixture.nativeElement.querySelector('.error-recovery-dialog');
      expect(dialog.classList.contains('error-recovery-dialog')).toBe(true);
    });

    it('should have error-header class on header element', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      const header = fixture.nativeElement.querySelector('.error-header');
      expect(header.classList.contains('error-header')).toBe(true);
    });

    it('should have error-message class on message element', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      const message = fixture.nativeElement.querySelector('.error-message');
      expect(message.classList.contains('error-message')).toBe(true);
    });

    it('should have suggestions class on suggestions container', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: ['Suggestion'],
        dismissible: true,
      };
      fixture.detectChanges();
      const suggestions = fixture.nativeElement.querySelector('.suggestions');
      expect(suggestions.classList.contains('suggestions')).toBe(true);
    });

    it('should have suggestions-list class on list element', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: ['Suggestion'],
        dismissible: true,
      };
      fixture.detectChanges();
      const list = fixture.nativeElement.querySelector('.suggestions-list');
      expect(list.classList.contains('suggestions-list')).toBe(true);
    });

    it('should have error-actions class on actions container', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      const actions = fixture.nativeElement.querySelector('.error-actions');
      expect(actions.classList.contains('error-actions')).toBe(true);
    });
  });

  describe('Input Properties', () => {
    it('should accept error input property', () => {
      const testError: ErrorRecovery = {
        title: 'Test Title',
        message: 'Test Message',
        suggestions: [],
        dismissible: true,
      };
      component.error = testError;
      expect(component.error).toBe(testError);
    });

    it('should initialize with null error', () => {
      expect(component.error).toBeNull();
    });

    it('should allow changing error property', () => {
      const error1: ErrorRecovery = {
        title: 'Error 1',
        message: 'Message 1',
        suggestions: [],
        dismissible: true,
      };
      const error2: ErrorRecovery = {
        title: 'Error 2',
        message: 'Message 2',
        suggestions: [],
        dismissible: false,
      };

      component.error = error1;
      expect(component.error).toBe(error1);

      component.error = error2;
      expect(component.error).toBe(error2);
    });

    it('should accept ErrorRecovery with all optional fields', () => {
      const fullError: ErrorRecovery = {
        title: 'Full Error',
        message: 'Full message',
        suggestions: ['Suggestion 1', 'Suggestion 2'],
        action: {
          label: 'Action',
          callback: () => {},
        },
        dismissible: true,
      };
      component.error = fullError;
      expect(component.error).toBe(fullError);
      expect(component.error?.action).toBeTruthy();
    });

    it('should accept ErrorRecovery without optional action field', () => {
      const minimalError: ErrorRecovery = {
        title: 'Minimal Error',
        message: 'Minimal message',
        suggestions: [],
        dismissible: true,
      };
      component.error = minimalError;
      expect(component.error).toBe(minimalError);
      expect(component.error?.action).toBeUndefined();
    });
  });

  describe('Action Methods', () => {
    it('should have onAction method', () => {
      expect(typeof component.onAction).toBe('function');
    });

    it('should have onDismiss method', () => {
      expect(typeof component.onDismiss).toBe('function');
    });

    it('onAction should call callback when action exists', () => {
      const mockCallback = jasmine.createSpy('callback');
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        action: {
          label: 'Action',
          callback: mockCallback,
        },
        dismissible: true,
      };

      component.onAction();
      expect(mockCallback).toHaveBeenCalled();
    });

    it('onAction should not throw when action is undefined', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        dismissible: true,
      };

      expect(() => component.onAction()).not.toThrow();
    });

    it('onAction should not throw when error is null', () => {
      component.error = null;
      expect(() => component.onAction()).not.toThrow();
    });

    it('onDismiss should set error to null', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        dismissible: true,
      };

      component.onDismiss();
      expect(component.error).toBeNull();
    });
  });

  describe('Accessibility - Semantic HTML', () => {
    it('should use h3 tag for title', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      const titleElement = fixture.nativeElement.querySelector('.error-header h3');
      expect(titleElement).toBeTruthy();
      expect(titleElement.tagName.toLowerCase()).toBe('h3');
    });

    it('should use h4 tag for suggestions header', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: ['Suggestion'],
        dismissible: true,
      };
      fixture.detectChanges();
      const header = fixture.nativeElement.querySelector('.suggestions h4');
      expect(header).toBeTruthy();
      expect(header.tagName.toLowerCase()).toBe('h4');
    });

    it('should use p tag for error message', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      const messageElement = fixture.nativeElement.querySelector('.error-message');
      expect(messageElement).toBeTruthy();
      expect(messageElement.tagName.toLowerCase()).toBe('p');
    });

    it('should use ul tag for suggestions list', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: ['Suggestion'],
        dismissible: true,
      };
      fixture.detectChanges();
      const list = fixture.nativeElement.querySelector('.suggestions-list');
      expect(list).toBeTruthy();
      expect(list.tagName.toLowerCase()).toBe('ul');
    });

    it('should use li tags for list items', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: ['Suggestion 1', 'Suggestion 2'],
        dismissible: true,
      };
      fixture.detectChanges();
      const items = fixture.nativeElement.querySelectorAll('.suggestions-list li');
      expect(items.length).toBe(2);
      items.forEach((item: HTMLElement) => {
        expect(item.tagName.toLowerCase()).toBe('li');
      });
    });

    it('should use button tags for action buttons', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        action: {
          label: 'Action',
          callback: () => {},
        },
        dismissible: true,
      };
      fixture.detectChanges();
      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
      buttons.forEach((button: HTMLElement) => {
        expect(button.tagName.toLowerCase()).toBe('button');
      });
    });

    it('should use i tag for icon', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      const icon = fixture.nativeElement.querySelector('.error-header i');
      expect(icon).toBeTruthy();
      expect(icon.tagName.toLowerCase()).toBe('i');
    });
  });

  describe('Accessibility - ARIA Labels', () => {
    it('should have descriptive text in alert role', () => {
      component.error = {
        title: 'Session expirée',
        message: 'Votre session a expiré.',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      const dialog = fixture.nativeElement.querySelector('.error-recovery-dialog');
      expect(dialog).toBeTruthy();
      // Dialog should be a proper element structure with heading
      const title = fixture.nativeElement.querySelector('.error-header h3');
      expect(title).toBeTruthy();
    });

    it('should have clear text content for screen readers', () => {
      component.error = {
        title: 'Erreur de connexion',
        message: 'Impossible de se connecter au serveur.',
        suggestions: [
          'Vérifiez votre connexion Internet.',
          'Attendez quelques instants et réessayez.',
        ],
        dismissible: true,
      };
      fixture.detectChanges();
      const dialog = fixture.nativeElement.querySelector('.error-recovery-dialog');
      const text = dialog.textContent;
      expect(text).toContain('Erreur de connexion');
      expect(text).toContain('Impossible de se connecter au serveur');
      expect(text).toContain('Vérifiez votre connexion Internet');
    });

    it('should have readable button labels for screen readers', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        action: {
          label: 'Réessayer',
          callback: () => {},
        },
        dismissible: true,
      };
      fixture.detectChanges();
      const actionBtn = fixture.nativeElement.querySelector('.action-btn--primary');
      const dismissBtn = fixture.nativeElement.querySelector('.action-btn--secondary');
      expect(actionBtn.textContent.trim()).toBe('Réessayer');
      expect(dismissBtn.textContent).toContain('Fermer');
    });
  });

  describe('Complete Error Scenarios', () => {
    it('should render complete error dialog with all elements', () => {
      component.error = {
        title: 'Session expirée',
        message: 'Votre session a expiré. Veuillez vous reconnecter.',
        suggestions: [
          'Votre session de sécurité a expiré après une période d\'inactivité.',
          'Tous les formulaires non enregistrés seront perdus.',
        ],
        action: {
          label: 'Se reconnecter',
          callback: () => {},
        },
        dismissible: false,
      };
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.error-recovery-dialog')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.error-header i')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.error-header h3')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.error-message')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.suggestions')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.suggestions-list')).toBeTruthy();
      expect(fixture.nativeElement.querySelectorAll('.suggestions-list li').length).toBe(2);
      expect(fixture.nativeElement.querySelector('.action-btn--primary')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.action-btn--secondary')).toBeNull();
    });

    it('should render 403 error scenario', () => {
      const callback = jasmine.createSpy('callback');
      component.error = {
        title: 'Accès refusé',
        message: 'Vous n\'avez pas les permissions nécessaires pour cette action.',
        suggestions: [
          'Contactez votre administrateur pour demander l\'accès.',
          'Vérifiez que votre rôle permet cette action.',
        ],
        action: {
          label: 'Retour au tableau de bord',
          callback,
        },
        dismissible: true,
      };
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.error-header h3').textContent).toBe('Accès refusé');
      expect(fixture.nativeElement.querySelector('.error-message').textContent).toContain('permissions');
      expect(fixture.nativeElement.querySelectorAll('.suggestions-list li').length).toBe(2);
      expect(fixture.nativeElement.querySelector('.action-btn--primary')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.action-btn--secondary')).toBeTruthy();

      fixture.nativeElement.querySelector('.action-btn--primary').click();
      expect(callback).toHaveBeenCalled();
    });

    it('should render 404 error scenario', () => {
      component.error = {
        title: 'Ressource non trouvée',
        message: 'L\'élément que vous cherchez n\'existe pas ou a été supprimé.',
        suggestions: [
          'L\'URL peut être incorrecte.',
          'L\'élément a peut-être été supprimé.',
          'Vérifiez les paramètres de l\'URL.',
        ],
        action: {
          label: 'Retour à la liste',
          callback: () => {},
        },
        dismissible: true,
      };
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.error-header h3').textContent).toBe('Ressource non trouvée');
      expect(fixture.nativeElement.querySelectorAll('.suggestions-list li').length).toBe(3);
    });

    it('should render error with only dismiss option (no action)', () => {
      component.error = {
        title: 'Information',
        message: 'Simple error without action',
        suggestions: ['Just a suggestion'],
        dismissible: true,
      };
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.action-btn--primary')).toBeNull();
      expect(fixture.nativeElement.querySelector('.action-btn--secondary')).toBeTruthy();
    });

    it('should render error with only action button (not dismissible)', () => {
      component.error = {
        title: 'Critical Error',
        message: 'You must take an action',
        suggestions: [],
        action: {
          label: 'Required Action',
          callback: () => {},
        },
        dismissible: false,
      };
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.action-btn--primary')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.action-btn--secondary')).toBeNull();
    });
  });

  describe('State Changes', () => {
    it('should update DOM when error property changes', () => {
      component.error = {
        title: 'First Error',
        message: 'First message',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();

      let titleElement = fixture.nativeElement.querySelector('.error-header h3');
      expect(titleElement.textContent).toBe('First Error');

      component.error = {
        title: 'Second Error',
        message: 'Second message',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();

      titleElement = fixture.nativeElement.querySelector('.error-header h3');
      expect(titleElement.textContent).toBe('Second Error');
    });

    it('should hide dialog when error is set to null', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.error-recovery-dialog')).toBeTruthy();

      component.error = null;
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.error-recovery-dialog')).toBeNull();
    });

    it('should toggle between error states', () => {
      // First error
      component.error = {
        title: 'Error 1',
        message: 'Message 1',
        suggestions: ['Suggestion 1'],
        dismissible: true,
      };
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.suggestions-list li').textContent).toBe('Suggestion 1');

      // Clear error
      component.error = null;
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.error-recovery-dialog')).toBeNull();

      // New error
      component.error = {
        title: 'Error 2',
        message: 'Message 2',
        suggestions: ['Suggestion 2'],
        dismissible: false,
      };
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.suggestions-list li').textContent).toBe('Suggestion 2');
      expect(fixture.nativeElement.querySelector('.action-btn--secondary')).toBeNull();
    });
  });

  describe('Button Interactions', () => {
    it('should have clickable action button', () => {
      const mockCallback = jasmine.createSpy('callback');
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        action: {
          label: 'Action',
          callback: mockCallback,
        },
        dismissible: true,
      };
      fixture.detectChanges();

      const actionBtn = fixture.nativeElement.querySelector('.action-btn--primary');
      actionBtn.click();

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should have clickable dismiss button', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();

      expect(component.error).toBeTruthy();

      const dismissBtn = fixture.nativeElement.querySelector('.action-btn--secondary');
      dismissBtn.click();

      expect(component.error).toBeNull();
    });

    it('should support multiple clicks on action button', () => {
      let clickCount = 0;
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        action: {
          label: 'Action',
          callback: () => { clickCount++; },
        },
        dismissible: true,
      };
      fixture.detectChanges();

      const actionBtn = fixture.nativeElement.querySelector('.action-btn--primary');
      actionBtn.click();
      actionBtn.click();
      actionBtn.click();

      expect(clickCount).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long title text', () => {
      component.error = {
        title: 'A'.repeat(200),
        message: 'Message',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      const titleElement = fixture.nativeElement.querySelector('.error-header h3');
      expect(titleElement.textContent.length).toBe(200);
    });

    it('should handle special characters in message', () => {
      component.error = {
        title: 'Error',
        message: 'Message with special chars: & < > " \'',
        suggestions: [],
        dismissible: true,
      };
      fixture.detectChanges();
      const messageElement = fixture.nativeElement.querySelector('.error-message');
      expect(messageElement.textContent).toContain('&');
    });

    it('should handle empty suggestion strings', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: ['', 'Real suggestion', ''],
        dismissible: true,
      };
      fixture.detectChanges();
      const items = fixture.nativeElement.querySelectorAll('.suggestions-list li');
      expect(items.length).toBe(3);
    });

    it('should handle very long action label', () => {
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        action: {
          label: 'This is a very long action label that should still display correctly',
          callback: () => {},
        },
        dismissible: true,
      };
      fixture.detectChanges();
      const actionBtn = fixture.nativeElement.querySelector('.action-btn--primary');
      expect(actionBtn.textContent).toContain('This is a very long action label');
    });

    it('should handle action with error in callback gracefully', () => {
      let callbackExecuted = false;
      component.error = {
        title: 'Error',
        message: 'Message',
        suggestions: [],
        action: {
          label: 'Action',
          callback: () => { callbackExecuted = true; },
        },
        dismissible: true,
      };
      fixture.detectChanges();

      const actionBtn = fixture.nativeElement.querySelector('.action-btn--primary');
      actionBtn.click();

      expect(callbackExecuted).toBe(true);
    });
  });
});
