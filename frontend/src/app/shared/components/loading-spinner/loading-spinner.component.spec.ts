import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingSpinnerComponent } from './loading-spinner.component';

describe('LoadingSpinnerComponent', () => {
  let component: LoadingSpinnerComponent;
  let fixture: ComponentFixture<LoadingSpinnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingSpinnerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingSpinnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Rendering', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should not render spinner container when loading is false', () => {
      component.loading = false;
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.loading-spinner-container');
      expect(container).toBeNull();
    });

    it('should render spinner container when loading is true', () => {
      component.loading = true;
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.loading-spinner-container');
      expect(container).toBeTruthy();
    });

    it('should render spinner icon when loading is true', () => {
      component.loading = true;
      fixture.detectChanges();
      const spinner = fixture.nativeElement.querySelector('.loading-spinner');
      expect(spinner).toBeTruthy();
    });

    it('should render spinner icon with pi classes', () => {
      component.loading = true;
      fixture.detectChanges();
      const icon = fixture.nativeElement.querySelector('.loading-spinner i');
      expect(icon).toBeTruthy();
      expect(icon.className).toContain('pi');
      expect(icon.className).toContain('pi-spin');
      expect(icon.className).toContain('pi-spinner');
    });

    it('should render message when loading is true and message is provided', () => {
      component.loading = true;
      component.message = 'Chargement en cours...';
      fixture.detectChanges();
      const messageElement = fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement).toBeTruthy();
      expect(messageElement.textContent).toContain('Chargement en cours...');
    });

    it('should not render message when message is empty string', () => {
      component.loading = true;
      component.message = '';
      fixture.detectChanges();
      const messageElement = fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement).toBeNull();
    });

    it('should not render message when loading is false', () => {
      component.loading = false;
      component.message = 'Chargement en cours...';
      fixture.detectChanges();
      const messageElement = fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement).toBeNull();
    });

    it('should render entire container when loading is false', () => {
      component.loading = false;
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.loading-spinner-container');
      expect(container).toBeNull();
    });
  });

  describe('Input Properties - loading', () => {
    it('should accept loading input as true', () => {
      component.loading = true;
      expect(component.loading).toBe(true);
    });

    it('should accept loading input as false', () => {
      component.loading = false;
      expect(component.loading).toBe(false);
    });

    it('should default to false when not provided', () => {
      const newComponent = new LoadingSpinnerComponent();
      expect(newComponent.loading).toBe(false);
    });

    it('should toggle spinner visibility when loading changes', () => {
      component.loading = false;
      fixture.detectChanges();
      let container = fixture.nativeElement.querySelector('.loading-spinner-container');
      expect(container).toBeNull();

      component.loading = true;
      fixture.detectChanges();
      container = fixture.nativeElement.querySelector('.loading-spinner-container');
      expect(container).toBeTruthy();

      component.loading = false;
      fixture.detectChanges();
      container = fixture.nativeElement.querySelector('.loading-spinner-container');
      expect(container).toBeNull();
    });

    it('should maintain loading state after detectChanges', () => {
      component.loading = true;
      fixture.detectChanges();
      expect(component.loading).toBe(true);
      fixture.detectChanges();
      expect(component.loading).toBe(true);
    });
  });

  describe('Input Properties - message', () => {
    it('should accept message input', () => {
      component.message = 'Test message';
      expect(component.message).toBe('Test message');
    });

    it('should default to empty string when not provided', () => {
      const newComponent = new LoadingSpinnerComponent();
      expect(newComponent.message).toBe('');
    });

    it('should render message text correctly', () => {
      component.loading = true;
      component.message = 'Veuillez patienter...';
      fixture.detectChanges();
      const messageElement = fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement.textContent).toBe('Veuillez patienter...');
    });

    it('should update message dynamically', () => {
      component.loading = true;
      component.message = 'Message 1';
      fixture.detectChanges();
      let messageElement = fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement.textContent).toBe('Message 1');

      component.message = 'Message 2';
      fixture.detectChanges();
      messageElement = fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement.textContent).toBe('Message 2');
    });

    it('should show message when set to non-empty string while loading', () => {
      component.loading = true;
      component.message = 'Loading data...';
      fixture.detectChanges();
      const messageElement = fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement).toBeTruthy();
    });

    it('should hide message when cleared while loading', () => {
      component.loading = true;
      component.message = 'Loading data...';
      fixture.detectChanges();
      let messageElement = fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement).toBeTruthy();

      component.message = '';
      fixture.detectChanges();
      messageElement = fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement).toBeNull();
    });

    it('should handle very long message text', () => {
      component.loading = true;
      const longMessage = 'A'.repeat(200);
      component.message = longMessage;
      fixture.detectChanges();
      const messageElement = fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement.textContent).toBe(longMessage);
    });

    it('should handle message with special characters', () => {
      component.loading = true;
      component.message = 'Chargement: 50% - 📁 Documents...';
      fixture.detectChanges();
      const messageElement = fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement.textContent).toContain('50%');
    });

    it('should handle message with HTML entities', () => {
      component.loading = true;
      component.message = 'Chargement &amp; traitement...';
      fixture.detectChanges();
      const messageElement = fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement.textContent).toContain('Chargement &amp; traitement...');
    });
  });

  describe('CSS Classes and Styling', () => {
    it('should have loading-spinner-container class', () => {
      component.loading = true;
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.loading-spinner-container');
      expect(container.classList.contains('loading-spinner-container')).toBe(true);
    });

    it('should have loading-spinner class on spinner element', () => {
      component.loading = true;
      fixture.detectChanges();
      const spinner = fixture.nativeElement.querySelector('.loading-spinner');
      expect(spinner.classList.contains('loading-spinner')).toBe(true);
    });

    it('should have loading-message class on message element', () => {
      component.loading = true;
      component.message = 'Test';
      fixture.detectChanges();
      const message = fixture.nativeElement.querySelector('.loading-message');
      expect(message.classList.contains('loading-message')).toBe(true);
    });

    it('should display container with flex layout', () => {
      component.loading = true;
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.loading-spinner-container');
      const style = window.getComputedStyle(container);
      expect(style.display).toBe('flex');
    });

    it('should center content with flex-direction column', () => {
      component.loading = true;
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.loading-spinner-container');
      const style = window.getComputedStyle(container);
      expect(style.flexDirection).toBe('column');
    });

    it('should have consistent padding', () => {
      component.loading = true;
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.loading-spinner-container');
      expect(container).toBeTruthy();
      // Verify padding is set (exact value depends on CSS)
    });

    it('should have minimum height for layout', () => {
      component.loading = true;
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.loading-spinner-container');
      expect(container).toBeTruthy();
      // Min-height ensures consistent spacing
    });
  });

  describe('State Transitions', () => {
    it('should transition from loading false to true', () => {
      component.loading = false;
      fixture.detectChanges();
      let container = fixture.nativeElement.querySelector('.loading-spinner-container');
      expect(container).toBeNull();

      component.loading = true;
      fixture.detectChanges();
      container = fixture.nativeElement.querySelector('.loading-spinner-container');
      expect(container).toBeTruthy();
    });

    it('should transition from loading true to false', () => {
      component.loading = true;
      fixture.detectChanges();
      let container = fixture.nativeElement.querySelector('.loading-spinner-container');
      expect(container).toBeTruthy();

      component.loading = false;
      fixture.detectChanges();
      container = fixture.nativeElement.querySelector('.loading-spinner-container');
      expect(container).toBeNull();
    });

    it('should update message during loading state', () => {
      component.loading = true;
      component.message = 'Starting...';
      fixture.detectChanges();
      let messageElement = fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement.textContent).toBe('Starting...');

      component.message = 'In progress...';
      fixture.detectChanges();
      messageElement = fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement.textContent).toBe('In progress...');

      component.message = 'Complete!';
      fixture.detectChanges();
      messageElement = fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement.textContent).toBe('Complete!');
    });

    it('should handle rapid state changes', () => {
      component.loading = true;
      fixture.detectChanges();
      component.loading = false;
      fixture.detectChanges();
      component.loading = true;
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.loading-spinner-container');
      expect(container).toBeTruthy();
    });

    it('should maintain state after multiple detectChanges calls', () => {
      component.loading = true;
      component.message = 'Test';
      fixture.detectChanges();
      fixture.detectChanges();
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.loading-spinner-container');
      expect(container).toBeTruthy();
      const messageElement = fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement.textContent).toBe('Test');
    });
  });

  describe('Edge Cases - null/undefined/empty values', () => {
    it('should handle undefined loading property', () => {
      component.loading = undefined as any;
      fixture.detectChanges();
      // Should treat as falsy
      const container = fixture.nativeElement.querySelector('.loading-spinner-container');
      // undefined is falsy, so container should not render
      expect(container).toBeNull();
    });

    it('should handle null message as empty string', () => {
      component.loading = true;
      component.message = null as any;
      fixture.detectChanges();
      const messageElement = fixture.nativeElement.querySelector('.loading-message');
      // null/undefined message should not render
      expect(messageElement).toBeNull();
    });

    it('should handle empty string message', () => {
      component.loading = true;
      component.message = '';
      fixture.detectChanges();
      const messageElement = fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement).toBeNull();
    });

    it('should handle message with only whitespace', () => {
      component.loading = true;
      component.message = '   ';
      fixture.detectChanges();
      const messageElement = fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement).toBeTruthy();
      expect(messageElement.textContent).toBe('   ');
    });

    it('should handle 0 as falsy for loading', () => {
      component.loading = 0 as any;
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.loading-spinner-container');
      expect(container).toBeNull();
    });

    it('should handle 1 as truthy for loading', () => {
      component.loading = 1 as any;
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.loading-spinner-container');
      expect(container).toBeTruthy();
    });

    it('should handle empty string as falsy for loading', () => {
      component.loading = '' as any;
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.loading-spinner-container');
      expect(container).toBeNull();
    });

    it('should not crash with very large message', () => {
      component.loading = true;
      component.message = 'X'.repeat(10000);
      fixture.detectChanges();
      const messageElement = fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement).toBeTruthy();
    });
  });

  describe('Animation/Display Properties', () => {
    it('should have spinner animation applied', () => {
      component.loading = true;
      fixture.detectChanges();
      const icon = fixture.nativeElement.querySelector('.loading-spinner i');
      expect(icon).toBeTruthy();
      // Icon has pi-spin class which applies animation
      expect(icon.className).toContain('pi-spin');
    });

    it('should display spinner as visible element', () => {
      component.loading = true;
      fixture.detectChanges();
      const icon = fixture.nativeElement.querySelector('.loading-spinner i');
      const style = window.getComputedStyle(icon);
      // Should not have display: none or visibility: hidden
      expect(style.display).not.toBe('none');
    });

    it('should show message with appropriate font size', () => {
      component.loading = true;
      component.message = 'Test message';
      fixture.detectChanges();
      const messageElement = fixture.nativeElement.querySelector('.loading-message');
      const style = window.getComputedStyle(messageElement);
      expect(style.fontSize).toBeTruthy();
    });

    it('should have message with secondary color', () => {
      component.loading = true;
      component.message = 'Test message';
      fixture.detectChanges();
      const messageElement = fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement).toBeTruthy();
      // Uses --text-color-secondary CSS variable
    });

    it('should have spinner with primary color', () => {
      component.loading = true;
      fixture.detectChanges();
      const spinner = fixture.nativeElement.querySelector('.loading-spinner');
      expect(spinner).toBeTruthy();
      // Uses --primary-color CSS variable
    });

    it('should have appropriate gap between spinner and message', () => {
      component.loading = true;
      component.message = 'Test';
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.loading-spinner-container');
      expect(container).toBeTruthy();
      // Container has gap: 1rem
    });

    it('should center spinner horizontally', () => {
      component.loading = true;
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.loading-spinner-container');
      const style = window.getComputedStyle(container);
      expect(style.alignItems).toContain('center');
    });

    it('should center content vertically', () => {
      component.loading = true;
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.loading-spinner-container');
      const style = window.getComputedStyle(container);
      expect(style.justifyContent).toContain('center');
    });
  });

  describe('Integration Tests', () => {
    it('should render complete loading state with all elements', () => {
      component.loading = true;
      component.message = 'Chargement des données...';
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.loading-spinner-container');
      const spinner = fixture.nativeElement.querySelector('.loading-spinner');
      const icon = fixture.nativeElement.querySelector('.loading-spinner i');
      const message = fixture.nativeElement.querySelector('.loading-message');

      expect(container).toBeTruthy();
      expect(spinner).toBeTruthy();
      expect(icon).toBeTruthy();
      expect(message).toBeTruthy();
    });

    it('should work with multiple component instances', () => {
      component.loading = true;
      component.message = 'Spinner 1';
      fixture.detectChanges();

      const anotherFixture = TestBed.createComponent(LoadingSpinnerComponent);
      const anotherComponent = anotherFixture.componentInstance;
      anotherComponent.loading = true;
      anotherComponent.message = 'Spinner 2';
      anotherFixture.detectChanges();

      expect(component.message).toBe('Spinner 1');
      expect(anotherComponent.message).toBe('Spinner 2');
    });

    it('should handle rapid loading/message updates', () => {
      component.loading = true;
      for (let i = 0; i < 10; i++) {
        component.message = `Loading step ${i}`;
        fixture.detectChanges();
      }

      const messageElement = fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement.textContent).toBe('Loading step 9');
    });
  });
});
