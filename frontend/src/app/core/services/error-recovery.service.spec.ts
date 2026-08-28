import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ErrorRecoveryService } from './error-recovery.service';

describe('ErrorRecoveryService', () => {
  let service: ErrorRecoveryService;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        ErrorRecoveryService,
        { provide: Router, useValue: routerSpy },
      ],
    });
    service = TestBed.inject(ErrorRecoveryService);
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  describe('getRecovery - Authentication Errors', () => {
    it('should handle 401 error', () => {
      const recovery = service.getRecovery('401');
      expect(recovery.title).toBe('Session expirée');
      expect(recovery.message).toContain('session a expiré');
      expect(recovery.suggestions.length).toBe(2);
      expect(recovery.dismissible).toBe(false);
      expect(recovery.action).toBeDefined();
    });

    it('should handle AUTH_EXPIRED error', () => {
      const recovery = service.getRecovery('AUTH_EXPIRED');
      expect(recovery.title).toBe('Session expirée');
      expect(recovery.dismissible).toBe(false);
    });

    it('should navigate to login on 401 action', () => {
      const recovery = service.getRecovery('401');
      recovery.action?.callback();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('getRecovery - Authorization Errors', () => {
    it('should handle 403 error', () => {
      const recovery = service.getRecovery('403');
      expect(recovery.title).toBe('Accès refusé');
      expect(recovery.message).toContain('permissions');
      expect(recovery.suggestions.length).toBe(2);
      expect(recovery.dismissible).toBe(true);
    });

    it('should handle FORBIDDEN error', () => {
      const recovery = service.getRecovery('FORBIDDEN');
      expect(recovery.title).toBe('Accès refusé');
    });

    it('should navigate to dashboard on 403 action', () => {
      const recovery = service.getRecovery('403');
      recovery.action?.callback();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });

  describe('getRecovery - Not Found Errors', () => {
    it('should handle 404 error', () => {
      const recovery = service.getRecovery('404');
      expect(recovery.title).toBe('Ressource non trouvée');
      expect(recovery.message).toContain('n\'existe pas');
      expect(recovery.suggestions.length).toBe(3);
      expect(recovery.dismissible).toBe(true);
    });

    it('should handle NOT_FOUND error', () => {
      const recovery = service.getRecovery('NOT_FOUND');
      expect(recovery.title).toBe('Ressource non trouvée');
    });

    it('should navigate to utilisateurs on 404 action', () => {
      const recovery = service.getRecovery('404');
      recovery.action?.callback();
      expect(router.navigate).toHaveBeenCalledWith(['/utilisateurs']);
    });
  });

  describe('getRecovery - Conflict Errors', () => {
    it('should handle 409 error', () => {
      const recovery = service.getRecovery('409');
      expect(recovery.title).toBe('Conflit de données');
      expect(recovery.message).toContain('modifiées');
      expect(recovery.suggestions.length).toBe(3);
      expect(recovery.dismissible).toBe(true);
    });

    it('should handle CONFLICT error', () => {
      const recovery = service.getRecovery('CONFLICT');
      expect(recovery.title).toBe('Conflit de données');
    });

    it('should have reload action for 409', () => {
      const recovery = service.getRecovery('409');
      expect(recovery.action).toBeDefined();
      expect(recovery.action?.label).toBe('Actualiser');
    });
  });

  describe('getRecovery - Validation Errors', () => {
    it('should handle 422 error', () => {
      const recovery = service.getRecovery('422');
      expect(recovery.title).toBe('Données invalides');
      expect(recovery.message).toContain('ne respectent pas le format');
      expect(recovery.suggestions.length).toBe(3);
      expect(recovery.dismissible).toBe(true);
    });

    it('should handle VALIDATION_ERROR with custom message', () => {
      const recovery = service.getRecovery('422', { message: 'Email invalide' });
      expect(recovery.message).toBe('Email invalide');
    });

    it('should handle VALIDATION_ERROR error string', () => {
      const recovery = service.getRecovery('VALIDATION_ERROR');
      expect(recovery.title).toBe('Données invalides');
    });
  });

  describe('getRecovery - Server Errors', () => {
    it('should handle 500 error', () => {
      const recovery = service.getRecovery('500');
      expect(recovery.title).toBe('Erreur serveur');
      expect(recovery.message).toContain('erreur interne');
      expect(recovery.suggestions.length).toBe(3);
      expect(recovery.dismissible).toBe(true);
      expect(recovery.action).toBeDefined();
    });

    it('should handle SERVER_ERROR string', () => {
      const recovery = service.getRecovery('SERVER_ERROR');
      expect(recovery.title).toBe('Erreur serveur');
    });

    it('should have reload action for 500', () => {
      const recovery = service.getRecovery('500');
      expect(recovery.action).toBeDefined();
      expect(recovery.action?.label).toBe('Réessayer');
    });
  });

  describe('getRecovery - Service Unavailable', () => {
    it('should handle 503 error', () => {
      const recovery = service.getRecovery('503');
      expect(recovery.title).toBe('Service indisponible');
      expect(recovery.message).toContain('maintenance');
      expect(recovery.suggestions.length).toBe(3);
      expect(recovery.dismissible).toBe(true);
    });

    it('should handle SERVICE_UNAVAILABLE string', () => {
      const recovery = service.getRecovery('SERVICE_UNAVAILABLE');
      expect(recovery.title).toBe('Service indisponible');
    });
  });

  describe('getRecovery - Network Errors', () => {
    it('should handle NETWORK_ERROR', () => {
      const recovery = service.getRecovery('NETWORK_ERROR');
      expect(recovery.title).toBe('Erreur de connexion');
      expect(recovery.message).toContain('serveur');
      expect(recovery.suggestions.length).toBe(4);
      expect(recovery.dismissible).toBe(true);
      expect(recovery.action).toBeDefined();
    });

    it('should handle 0 error code (network error)', () => {
      const recovery = service.getRecovery('0');
      expect(recovery.title).toBe('Erreur de connexion');
    });

    it('should have reload action for network error', () => {
      const recovery = service.getRecovery('NETWORK_ERROR');
      expect(recovery.action).toBeDefined();
      expect(recovery.action?.label).toBe('Réessayer');
    });
  });

  describe('getRecovery - Custom Errors', () => {
    it('should handle DUPLICATE_ENTRY error', () => {
      const recovery = service.getRecovery('DUPLICATE_ENTRY');
      expect(recovery.title).toBe('Entrée dupliquée');
      expect(recovery.message).toBe('Cet élément existe déjà.');
      expect(recovery.suggestions.length).toBe(3);
      expect(recovery.dismissible).toBe(true);
    });

    it('should handle DUPLICATE_ENTRY with custom message', () => {
      const recovery = service.getRecovery('DUPLICATE_ENTRY', { message: 'Email déjà utilisé' });
      expect(recovery.message).toBe('Email déjà utilisé');
    });

    it('should handle INVALID_FORMAT error', () => {
      const recovery = service.getRecovery('INVALID_FORMAT');
      expect(recovery.title).toBe('Format invalide');
      expect(recovery.message).toBe('Le format des données est invalide.');
      expect(recovery.suggestions.length).toBe(3);
    });

    it('should handle INVALID_FORMAT with custom message', () => {
      const recovery = service.getRecovery('INVALID_FORMAT', { message: 'Téléphone invalide' });
      expect(recovery.message).toBe('Téléphone invalide');
    });
  });

  describe('getRecovery - Default Error', () => {
    it('should handle unknown error code', () => {
      const recovery = service.getRecovery('UNKNOWN_CODE');
      expect(recovery.title).toBe('Erreur');
      expect(recovery.message).toBe('Une erreur est survenue.');
      expect(recovery.suggestions.length).toBe(2);
      expect(recovery.dismissible).toBe(true);
    });

    it('should handle unknown error with custom message', () => {
      const recovery = service.getRecovery('UNKNOWN_CODE', { message: 'Erreur personnalisée' });
      expect(recovery.message).toBe('Erreur personnalisée');
    });

    it('should handle null error code', () => {
      const recovery = service.getRecovery(null as any);
      expect(recovery.title).toBe('Erreur');
    });
  });

  describe('formatWithSuggestions', () => {
    it('should format error with suggestions', () => {
      const formatted = service.formatWithSuggestions('401');
      expect(formatted).toContain('Session expirée');
      expect(formatted).toContain('Suggestions:');
      expect(formatted).toContain('1. ');
      expect(formatted).toContain('2. ');
    });

    it('should format error with context', () => {
      const formatted = service.formatWithSuggestions('422', { message: 'Email invalide' });
      expect(formatted).toContain('Email invalide');
      expect(formatted).toContain('Suggestions:');
    });

    it('should include all suggestions in formatted output', () => {
      const formatted = service.formatWithSuggestions('500');
      const suggestionCount = (formatted.match(/\d\./g) || []).length;
      expect(suggestionCount).toBe(3); // 500 error has 3 suggestions
    });

    it('should format 404 with all elements', () => {
      const formatted = service.formatWithSuggestions('404');
      expect(formatted).toContain('Ressource non trouvée');
      expect(formatted).toContain('L\'URL peut être incorrecte');
      expect(formatted).toContain('L\'élément a peut-être été supprimé');
    });
  });

  describe('error code type handling', () => {
    it('should handle numeric error codes', () => {
      const recovery = service.getRecovery(401);
      expect(recovery.title).toBe('Session expirée');
    });

    it('should handle string error codes', () => {
      const recovery = service.getRecovery('401');
      expect(recovery.title).toBe('Session expirée');
    });

    it('should treat numeric and string codes equally', () => {
      const numeric = service.getRecovery(403);
      const string = service.getRecovery('403');
      expect(numeric.title).toBe(string.title);
      expect(numeric.message).toBe(string.message);
    });
  });

  describe('action callbacks', () => {
    it('should have action for 401 error', () => {
      const recovery = service.getRecovery('401');
      expect(recovery.action).toBeDefined();
      expect(recovery.action?.label).toBe('Se reconnecter');
    });

    it('should have action for 403 error', () => {
      const recovery = service.getRecovery('403');
      expect(recovery.action).toBeDefined();
      expect(recovery.action?.label).toBe('Retour au tableau de bord');
    });

    it('should have action for 500 error', () => {
      const recovery = service.getRecovery('500');
      expect(recovery.action).toBeDefined();
      expect(recovery.action?.label).toBe('Réessayer');
    });

    it('should not have action for 422 error', () => {
      const recovery = service.getRecovery('422');
      expect(recovery.action).toBeUndefined();
    });
  });

  describe('dismissible property', () => {
    it('should mark 401 as non-dismissible', () => {
      const recovery = service.getRecovery('401');
      expect(recovery.dismissible).toBe(false);
    });

    it('should mark other errors as dismissible', () => {
      const errors = ['403', '404', '409', '422', '500', '503', 'NETWORK_ERROR', 'DUPLICATE_ENTRY', 'INVALID_FORMAT'];
      errors.forEach(code => {
        const recovery = service.getRecovery(code);
        expect(recovery.dismissible).toBe(true);
      });
    });
  });
});
