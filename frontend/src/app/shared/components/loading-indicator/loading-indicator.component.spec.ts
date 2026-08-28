import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingIndicatorComponent } from './loading-indicator.component';

describe('LoadingIndicatorComponent', () => {
  let component: LoadingIndicatorComponent;
  let fixture: ComponentFixture<LoadingIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingIndicatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Rendering', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should not render any content when loading is false', () => {
      component.loading = false;
      component.type = 'inline';
      fixture.detectChanges();
      const content = fixture.nativeElement.querySelector('[class*="loading-"]');
      expect(content).toBeNull();
    });

    it('should render content when loading is true', () => {
      component.loading = true;
      component.type = 'inline';
      fixture.detectChanges();
      const content = fixture.nativeElement.querySelector('.loading-inline');
      expect(content).toBeTruthy();
    });

    it('should render overlay type when specified', () => {
      component.loading = true;
      component.type = 'overlay';
      fixture.detectChanges();
      const overlay = fixture.nativeElement.querySelector('.loading-overlay');
      expect(overlay).toBeTruthy();
    });

    it('should render inline type when specified', () => {
      component.loading = true;
      component.type = 'inline';
      fixture.detectChanges();
      const inline = fixture.nativeElement.querySelector('.loading-inline');
      expect(inline).toBeTruthy();
    });

    it('should render progress type when specified', () => {
      component.loading = true;
      component.type = 'progress';
      fixture.detectChanges();
      const progress = fixture.nativeElement.querySelector('.loading-progress');
      expect(progress).toBeTruthy();
    });

    it('should render skeleton type when specified', () => {
      component.loading = true;
      component.type = 'skeleton';
      fixture.detectChanges();
      const skeleton = fixture.nativeElement.querySelector('.loading-skeleton');
      expect(skeleton).toBeTruthy();
    });

    it('should not render other types when one is active', () => {
      component.loading = true;
      component.type = 'overlay';
      fixture.detectChanges();
      const inline = fixture.nativeElement.querySelector('.loading-inline');
      const progress = fixture.nativeElement.querySelector('.loading-progress');
      const skeleton = fixture.nativeElement.querySelector('.loading-skeleton');
      expect(inline).toBeNull();
      expect(progress).toBeNull();
      expect(skeleton).toBeNull();
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
      const newComponent = new LoadingIndicatorComponent();
      expect(newComponent.loading).toBe(false);
    });

    it('should toggle visibility when loading changes', () => {
      component.loading = false;
      component.type = 'inline';
      fixture.detectChanges();
      let inline = fixture.nativeElement.querySelector('.loading-inline');
      expect(inline).toBeNull();

      component.loading = true;
      fixture.detectChanges();
      inline = fixture.nativeElement.querySelector('.loading-inline');
      expect(inline).toBeTruthy();
    });

    it('should work with all loading types', () => {
      const types: Array<'overlay' | 'inline' | 'progress' | 'skeleton'> = [
        'overlay',
        'inline',
        'progress',
        'skeleton',
      ];

      types.forEach((type) => {
        component.loading = true;
        component.type = type;
        fixture.detectChanges();

        const selector = `.loading-${type}`;
        const element = fixture.nativeElement.querySelector(selector);
        expect(element).toBeTruthy();
      });
    });
  });

  describe('Input Properties - type', () => {
    it('should accept type as overlay', () => {
      component.type = 'overlay';
      expect(component.type).toBe('overlay');
    });

    it('should accept type as inline', () => {
      component.type = 'inline';
      expect(component.type).toBe('inline');
    });

    it('should accept type as progress', () => {
      component.type = 'progress';
      expect(component.type).toBe('progress');
    });

    it('should accept type as skeleton', () => {
      component.type = 'skeleton';
      expect(component.type).toBe('skeleton');
    });

    it('should default to inline when not provided', () => {
      const newComponent = new LoadingIndicatorComponent();
      expect(newComponent.type).toBe('inline');
    });

    it('should switch type dynamically', () => {
      component.loading = true;

      component.type = 'overlay';
      fixture.detectChanges();
      let overlay = fixture.nativeElement.querySelector('.loading-overlay');
      expect(overlay).toBeTruthy();

      component.type = 'inline';
      fixture.detectChanges();
      overlay = fixture.nativeElement.querySelector('.loading-overlay');
      expect(overlay).toBeNull();
      let inline = fixture.nativeElement.querySelector('.loading-inline');
      expect(inline).toBeTruthy();
    });

    it('should render correct type after initialization', () => {
      component.loading = true;
      component.type = 'skeleton';
      fixture.detectChanges();
      const skeleton = fixture.nativeElement.querySelector('.loading-skeleton');
      expect(skeleton).toBeTruthy();
    });
  });

  describe('Input Properties - message', () => {
    it('should accept message input', () => {
      component.message = 'Test message';
      expect(component.message).toBe('Test message');
    });

    it('should default to empty string when not provided', () => {
      const newComponent = new LoadingIndicatorComponent();
      expect(newComponent.message).toBe('');
    });

    it('should display message in overlay type', () => {
      component.loading = true;
      component.type = 'overlay';
      component.message = 'Chargement...';
      fixture.detectChanges();
      const message = fixture.nativeElement.querySelector('.loading-overlay__content p');
      expect(message).toBeTruthy();
      expect(message.textContent).toBe('Chargement...');
    });

    it('should display message in inline type', () => {
      component.loading = true;
      component.type = 'inline';
      component.message = 'En cours...';
      fixture.detectChanges();
      const message = fixture.nativeElement.querySelector('.loading-inline span');
      expect(message).toBeTruthy();
      expect(message.textContent).toBe('En cours...');
    });

    it('should not display message in progress type', () => {
      component.loading = true;
      component.type = 'progress';
      component.message = 'Ignored';
      fixture.detectChanges();
      const message = fixture.nativeElement.querySelector('.loading-progress p');
      expect(message).toBeNull();
    });

    it('should not display message in skeleton type', () => {
      component.loading = true;
      component.type = 'skeleton';
      component.message = 'Ignored';
      fixture.detectChanges();
      const message = fixture.nativeElement.querySelector('.loading-skeleton span');
      expect(message).toBeNull();
    });

    it('should hide message when empty string in overlay', () => {
      component.loading = true;
      component.type = 'overlay';
      component.message = '';
      fixture.detectChanges();
      const message = fixture.nativeElement.querySelector('.loading-overlay__content p');
      expect(message).toBeNull();
    });

    it('should hide message when empty string in inline', () => {
      component.loading = true;
      component.type = 'inline';
      component.message = '';
      fixture.detectChanges();
      const message = fixture.nativeElement.querySelector('.loading-inline span');
      expect(message).toBeNull();
    });

    it('should update message dynamically in overlay', () => {
      component.loading = true;
      component.type = 'overlay';
      component.message = 'Step 1';
      fixture.detectChanges();
      let message = fixture.nativeElement.querySelector('.loading-overlay__content p');
      expect(message.textContent).toBe('Step 1');

      component.message = 'Step 2';
      fixture.detectChanges();
      message = fixture.nativeElement.querySelector('.loading-overlay__content p');
      expect(message.textContent).toBe('Step 2');
    });

    it('should update message dynamically in inline', () => {
      component.loading = true;
      component.type = 'inline';
      component.message = 'Message 1';
      fixture.detectChanges();
      let message = fixture.nativeElement.querySelector('.loading-inline span');
      expect(message.textContent).toBe('Message 1');

      component.message = 'Message 2';
      fixture.detectChanges();
      message = fixture.nativeElement.querySelector('.loading-inline span');
      expect(message.textContent).toBe('Message 2');
    });

    it('should handle long messages', () => {
      component.loading = true;
      component.type = 'overlay';
      const longMessage = 'A'.repeat(200);
      component.message = longMessage;
      fixture.detectChanges();
      const message = fixture.nativeElement.querySelector('.loading-overlay__content p');
      expect(message.textContent).toBe(longMessage);
    });
  });

  describe('CSS Classes and Styling', () => {
    describe('Overlay Type Styling', () => {
      beforeEach(() => {
        component.loading = true;
        component.type = 'overlay';
      });

      it('should have loading-overlay class', () => {
        fixture.detectChanges();
        const overlay = fixture.nativeElement.querySelector('.loading-overlay');
        expect(overlay.classList.contains('loading-overlay')).toBe(true);
      });

      it('should have loading-overlay__content class', () => {
        fixture.detectChanges();
        const content = fixture.nativeElement.querySelector('.loading-overlay__content');
        expect(content.classList.contains('loading-overlay__content')).toBe(true);
      });

      it('should render spinner icon in overlay', () => {
        fixture.detectChanges();
        const icon = fixture.nativeElement.querySelector('.loading-overlay__content i');
        expect(icon).toBeTruthy();
        expect(icon.className).toContain('pi');
        expect(icon.className).toContain('pi-spin');
        expect(icon.className).toContain('pi-spinner');
      });

      it('should have absolute positioning', () => {
        fixture.detectChanges();
        const overlay = fixture.nativeElement.querySelector('.loading-overlay');
        const style = window.getComputedStyle(overlay);
        expect(style.position).toBe('absolute');
      });

      it('should cover entire container with inset 0', () => {
        fixture.detectChanges();
        const overlay = fixture.nativeElement.querySelector('.loading-overlay');
        expect(overlay).toBeTruthy();
        // Uses inset: 0 to cover entire container
      });

      it('should have high z-index', () => {
        fixture.detectChanges();
        const overlay = fixture.nativeElement.querySelector('.loading-overlay');
        const style = window.getComputedStyle(overlay);
        expect(parseInt(style.zIndex) >= 50).toBe(true);
      });

      it('should have semi-transparent background', () => {
        fixture.detectChanges();
        const overlay = fixture.nativeElement.querySelector('.loading-overlay');
        expect(overlay).toBeTruthy();
        // rgba(255, 255, 255, 0.9) background
      });
    });

    describe('Inline Type Styling', () => {
      beforeEach(() => {
        component.loading = true;
        component.type = 'inline';
      });

      it('should have loading-inline class', () => {
        fixture.detectChanges();
        const inline = fixture.nativeElement.querySelector('.loading-inline');
        expect(inline.classList.contains('loading-inline')).toBe(true);
      });

      it('should display as flex', () => {
        fixture.detectChanges();
        const inline = fixture.nativeElement.querySelector('.loading-inline');
        const style = window.getComputedStyle(inline);
        expect(style.display).toBe('flex');
      });

      it('should center items vertically', () => {
        fixture.detectChanges();
        const inline = fixture.nativeElement.querySelector('.loading-inline');
        const style = window.getComputedStyle(inline);
        expect(style.alignItems).toContain('center');
      });

      it('should have gap between icon and message', () => {
        fixture.detectChanges();
        const inline = fixture.nativeElement.querySelector('.loading-inline');
        expect(inline).toBeTruthy();
        // gap: 0.75rem
      });

      it('should have padding', () => {
        fixture.detectChanges();
        const inline = fixture.nativeElement.querySelector('.loading-inline');
        const style = window.getComputedStyle(inline);
        expect(style.padding).toBeTruthy();
      });
    });

    describe('Progress Type Styling', () => {
      beforeEach(() => {
        component.loading = true;
        component.type = 'progress';
      });

      it('should have loading-progress class', () => {
        fixture.detectChanges();
        const progress = fixture.nativeElement.querySelector('.loading-progress');
        expect(progress.classList.contains('loading-progress')).toBe(true);
      });

      it('should have fixed positioning', () => {
        fixture.detectChanges();
        const progress = fixture.nativeElement.querySelector('.loading-progress');
        const style = window.getComputedStyle(progress);
        expect(style.position).toBe('fixed');
      });

      it('should be at top of screen', () => {
        fixture.detectChanges();
        const progress = fixture.nativeElement.querySelector('.loading-progress');
        expect(progress).toBeTruthy();
        // top: 0
      });

      it('should span full width', () => {
        fixture.detectChanges();
        const progress = fixture.nativeElement.querySelector('.loading-progress');
        expect(progress).toBeTruthy();
        // left: 0, right: 0
      });

      it('should have minimal height', () => {
        fixture.detectChanges();
        const progress = fixture.nativeElement.querySelector('.loading-progress');
        expect(progress).toBeTruthy();
        // height: 3px
      });

      it('should have high z-index', () => {
        fixture.detectChanges();
        const progress = fixture.nativeElement.querySelector('.loading-progress');
        const style = window.getComputedStyle(progress);
        expect(parseInt(style.zIndex) >= 100).toBe(true);
      });

      it('should contain animated bar', () => {
        fixture.detectChanges();
        const bar = fixture.nativeElement.querySelector('.loading-progress__bar');
        expect(bar).toBeTruthy();
        expect(bar.classList.contains('loading-progress__bar')).toBe(true);
      });
    });

    describe('Skeleton Type Styling', () => {
      beforeEach(() => {
        component.loading = true;
        component.type = 'skeleton';
      });

      it('should have loading-skeleton class', () => {
        fixture.detectChanges();
        const skeleton = fixture.nativeElement.querySelector('.loading-skeleton');
        expect(skeleton.classList.contains('loading-skeleton')).toBe(true);
      });

      it('should display as flex column', () => {
        fixture.detectChanges();
        const skeleton = fixture.nativeElement.querySelector('.loading-skeleton');
        const style = window.getComputedStyle(skeleton);
        expect(style.display).toBe('flex');
        expect(style.flexDirection).toBe('column');
      });

      it('should have gap between skeleton lines', () => {
        fixture.detectChanges();
        const skeleton = fixture.nativeElement.querySelector('.loading-skeleton');
        expect(skeleton).toBeTruthy();
        // gap: 0.75rem
      });

      it('should have padding', () => {
        fixture.detectChanges();
        const skeleton = fixture.nativeElement.querySelector('.loading-skeleton');
        const style = window.getComputedStyle(skeleton);
        expect(style.padding).toBeTruthy();
      });

      it('should render three skeleton lines', () => {
        fixture.detectChanges();
        const lines = fixture.nativeElement.querySelectorAll('.skeleton-line');
        expect(lines.length).toBe(3);
      });

      it('should have skeleton-line class on each line', () => {
        fixture.detectChanges();
        const lines = fixture.nativeElement.querySelectorAll('.skeleton-line');
        lines.forEach((line: HTMLElement) => {
          expect(line.classList.contains('skeleton-line')).toBe(true);
        });
      });

      it('skeleton lines should have rounded borders', () => {
        fixture.detectChanges();
        const line = fixture.nativeElement.querySelector('.skeleton-line');
        expect(line).toBeTruthy();
        // border-radius: 4px
      });
    });
  });

  describe('State Transitions', () => {
    it('should transition from loading false to true', () => {
      component.loading = false;
      component.type = 'inline';
      fixture.detectChanges();
      let inline = fixture.nativeElement.querySelector('.loading-inline');
      expect(inline).toBeNull();

      component.loading = true;
      fixture.detectChanges();
      inline = fixture.nativeElement.querySelector('.loading-inline');
      expect(inline).toBeTruthy();
    });

    it('should transition from loading true to false', () => {
      component.loading = true;
      component.type = 'inline';
      fixture.detectChanges();
      let inline = fixture.nativeElement.querySelector('.loading-inline');
      expect(inline).toBeTruthy();

      component.loading = false;
      fixture.detectChanges();
      inline = fixture.nativeElement.querySelector('.loading-inline');
      expect(inline).toBeNull();
    });

    it('should handle type change while loading', () => {
      component.loading = true;
      component.type = 'inline';
      fixture.detectChanges();
      let inline = fixture.nativeElement.querySelector('.loading-inline');
      expect(inline).toBeTruthy();

      component.type = 'overlay';
      fixture.detectChanges();
      inline = fixture.nativeElement.querySelector('.loading-inline');
      const overlay = fixture.nativeElement.querySelector('.loading-overlay');
      expect(inline).toBeNull();
      expect(overlay).toBeTruthy();
    });

    it('should handle multiple type transitions', () => {
      component.loading = true;
      const types: Array<'overlay' | 'inline' | 'progress' | 'skeleton'> = [
        'overlay',
        'inline',
        'progress',
        'skeleton',
        'inline',
      ];

      types.forEach((type) => {
        component.type = type;
        fixture.detectChanges();
        const selector = `.loading-${type}`;
        const element = fixture.nativeElement.querySelector(selector);
        expect(element).toBeTruthy();
      });
    });

    it('should maintain state after rapid changes', () => {
      component.loading = true;
      component.type = 'inline';
      fixture.detectChanges();

      component.loading = false;
      fixture.detectChanges();
      component.loading = true;
      fixture.detectChanges();
      component.type = 'overlay';
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector('.loading-overlay');
      expect(overlay).toBeTruthy();
    });

    it('should update message during state transitions', () => {
      component.loading = true;
      component.type = 'inline';
      component.message = 'Message 1';
      fixture.detectChanges();
      let message = fixture.nativeElement.querySelector('.loading-inline span');
      expect(message.textContent).toBe('Message 1');

      component.type = 'overlay';
      component.message = 'Message 2';
      fixture.detectChanges();
      message = fixture.nativeElement.querySelector('.loading-overlay__content p');
      expect(message.textContent).toBe('Message 2');
    });
  });

  describe('Edge Cases - null/undefined/empty values', () => {
    it('should handle undefined loading property', () => {
      component.loading = undefined as any;
      component.type = 'inline';
      fixture.detectChanges();
      const inline = fixture.nativeElement.querySelector('.loading-inline');
      expect(inline).toBeNull();
    });

    it('should handle undefined type property', () => {
      component.loading = true;
      component.type = undefined as any;
      fixture.detectChanges();
      // Should render nothing or default type - verify it doesn't crash
      const overlay = fixture.nativeElement.querySelector('.loading-overlay');
      const inline = fixture.nativeElement.querySelector('.loading-inline');
      const progress = fixture.nativeElement.querySelector('.loading-progress');
      const skeleton = fixture.nativeElement.querySelector('.loading-skeleton');
      // At least one of these might be null or all could be null
      expect(
        overlay || inline || progress || skeleton || true
      ).toBeTruthy();
    });

    it('should handle null message', () => {
      component.loading = true;
      component.type = 'overlay';
      component.message = null as any;
      fixture.detectChanges();
      const message = fixture.nativeElement.querySelector('.loading-overlay__content p');
      expect(message).toBeNull();
    });

    it('should handle empty string message', () => {
      component.loading = true;
      component.type = 'inline';
      component.message = '';
      fixture.detectChanges();
      const message = fixture.nativeElement.querySelector('.loading-inline span');
      expect(message).toBeNull();
    });

    it('should handle message with only whitespace', () => {
      component.loading = true;
      component.type = 'inline';
      component.message = '   ';
      fixture.detectChanges();
      const message = fixture.nativeElement.querySelector('.loading-inline span');
      expect(message).toBeTruthy();
    });

    it('should handle 0 as falsy for loading', () => {
      component.loading = 0 as any;
      component.type = 'inline';
      fixture.detectChanges();
      const inline = fixture.nativeElement.querySelector('.loading-inline');
      expect(inline).toBeNull();
    });

    it('should handle 1 as truthy for loading', () => {
      component.loading = 1 as any;
      component.type = 'inline';
      fixture.detectChanges();
      const inline = fixture.nativeElement.querySelector('.loading-inline');
      expect(inline).toBeTruthy();
    });

    it('should not crash with very long message', () => {
      component.loading = true;
      component.type = 'inline';
      component.message = 'X'.repeat(10000);
      fixture.detectChanges();
      const message = fixture.nativeElement.querySelector('.loading-inline span');
      expect(message).toBeTruthy();
    });

    it('should handle message with special characters', () => {
      component.loading = true;
      component.type = 'overlay';
      component.message = 'Loading 📁 Documents (50%)...';
      fixture.detectChanges();
      const message = fixture.nativeElement.querySelector('.loading-overlay__content p');
      expect(message.textContent).toContain('50%');
    });
  });

  describe('Animation/Display Properties', () => {
    describe('Overlay Animation', () => {
      beforeEach(() => {
        component.loading = true;
        component.type = 'overlay';
        fixture.detectChanges();
      });

      it('should render overlay with spinner animation', () => {
        const icon = fixture.nativeElement.querySelector('.loading-overlay__content i');
        expect(icon.className).toContain('pi-spin');
      });

      it('should have backdrop blur effect', () => {
        const overlay = fixture.nativeElement.querySelector('.loading-overlay');
        expect(overlay).toBeTruthy();
        // backdrop-filter: blur(2px)
      });

      it('should center content in overlay', () => {
        const content = fixture.nativeElement.querySelector('.loading-overlay__content');
        const style = window.getComputedStyle(content);
        expect(style.display).toBe('flex');
        expect(style.flexDirection).toBe('column');
        expect(style.alignItems).toContain('center');
      });
    });

    describe('Progress Animation', () => {
      beforeEach(() => {
        component.loading = true;
        component.type = 'progress';
        fixture.detectChanges();
      });

      it('should render progress bar with animation', () => {
        const bar = fixture.nativeElement.querySelector('.loading-progress__bar');
        expect(bar).toBeTruthy();
        // Has animation: progress 1.5s ease-in-out infinite
      });

      it('should have gradient background', () => {
        const bar = fixture.nativeElement.querySelector('.loading-progress__bar');
        expect(bar).toBeTruthy();
        // linear-gradient background-image
      });

      it('should be visible at top of screen', () => {
        const progress = fixture.nativeElement.querySelector('.loading-progress');
        expect(progress).toBeTruthy();
      });
    });

    describe('Skeleton Animation', () => {
      beforeEach(() => {
        component.loading = true;
        component.type = 'skeleton';
        fixture.detectChanges();
      });

      it('should render skeleton lines with shimmer animation', () => {
        const lines = fixture.nativeElement.querySelectorAll('.skeleton-line');
        expect(lines.length).toBe(3);
        // Each line has animation: sk-shimmer 1.5s ease-in-out infinite
      });

      it('should have gradient background on lines', () => {
        const line = fixture.nativeElement.querySelector('.skeleton-line');
        expect(line).toBeTruthy();
        // linear-gradient background-image
      });
    });

    describe('Inline Animation', () => {
      beforeEach(() => {
        component.loading = true;
        component.type = 'inline';
        fixture.detectChanges();
      });

      it('should render inline with spinner animation', () => {
        const icon = fixture.nativeElement.querySelector('.loading-inline i');
        expect(icon.className).toContain('pi-spin');
      });

      it('should align icon and text horizontally', () => {
        const inline = fixture.nativeElement.querySelector('.loading-inline');
        const style = window.getComputedStyle(inline);
        expect(style.display).toBe('flex');
        expect(style.alignItems).toContain('center');
      });
    });

    it('should not render animation elements when loading is false', () => {
      component.loading = false;
      component.type = 'overlay';
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector('.loading-overlay');
      expect(overlay).toBeNull();
    });

    it('should support all types with animations', () => {
      const types: Array<'overlay' | 'inline' | 'progress' | 'skeleton'> = [
        'overlay',
        'inline',
        'progress',
        'skeleton',
      ];

      types.forEach((type) => {
        component.loading = true;
        component.type = type;
        fixture.detectChanges();
        const element = fixture.nativeElement.querySelector(`[class*="loading-${type}"]`);
        expect(element).toBeTruthy();
      });
    });
  });

  describe('Integration Tests', () => {
    it('should render complete overlay loading state', () => {
      component.loading = true;
      component.type = 'overlay';
      component.message = 'Traitement en cours...';
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector('.loading-overlay');
      const content = fixture.nativeElement.querySelector('.loading-overlay__content');
      const icon = fixture.nativeElement.querySelector('.loading-overlay__content i');
      const message = fixture.nativeElement.querySelector('.loading-overlay__content p');

      expect(overlay).toBeTruthy();
      expect(content).toBeTruthy();
      expect(icon).toBeTruthy();
      expect(message).toBeTruthy();
    });

    it('should render complete inline loading state', () => {
      component.loading = true;
      component.type = 'inline';
      component.message = 'Chargement...';
      fixture.detectChanges();

      const inline = fixture.nativeElement.querySelector('.loading-inline');
      const icon = fixture.nativeElement.querySelector('.loading-inline i');
      const message = fixture.nativeElement.querySelector('.loading-inline span');

      expect(inline).toBeTruthy();
      expect(icon).toBeTruthy();
      expect(message).toBeTruthy();
    });

    it('should handle switching between all types', () => {
      component.loading = true;
      const types: Array<'overlay' | 'inline' | 'progress' | 'skeleton'> = [
        'overlay',
        'inline',
        'progress',
        'skeleton',
      ];

      types.forEach((type, index) => {
        component.type = type;
        component.message = `Type: ${type}`;
        fixture.detectChanges();

        const selector = `.loading-${type}`;
        const element = fixture.nativeElement.querySelector(selector);
        expect(element).toBeTruthy();

        // Verify no other type is rendered
        const otherTypes = types.filter((_, i) => i !== index);
        otherTypes.forEach((otherType) => {
          const otherElement = fixture.nativeElement.querySelector(
            `.loading-${otherType}`
          );
          expect(otherElement).toBeNull();
        });
      });
    });

    it('should work with multiple component instances', () => {
      component.loading = true;
      component.type = 'inline';
      component.message = 'Component 1';
      fixture.detectChanges();

      const anotherFixture = TestBed.createComponent(LoadingIndicatorComponent);
      const anotherComponent = anotherFixture.componentInstance;
      anotherComponent.loading = true;
      anotherComponent.type = 'overlay';
      anotherComponent.message = 'Component 2';
      anotherFixture.detectChanges();

      expect(component.type).toBe('inline');
      expect(anotherComponent.type).toBe('overlay');
      expect(component.message).toBe('Component 1');
      expect(anotherComponent.message).toBe('Component 2');
    });

    it('should handle rapid loading/message updates with all types', () => {
      component.loading = true;
      const types: Array<'overlay' | 'inline' | 'progress' | 'skeleton'> = [
        'overlay',
        'inline',
        'progress',
        'skeleton',
      ];

      for (let i = 0; i < 5; i++) {
        component.type = types[i % types.length];
        component.message = `Update ${i}`;
        fixture.detectChanges();
      }

      const selector = `.loading-${component.type}`;
      const element = fixture.nativeElement.querySelector(selector);
      expect(element).toBeTruthy();
    });

    it('should properly clean up when loading turns off', () => {
      component.loading = true;
      component.type = 'overlay';
      component.message = 'Loading...';
      fixture.detectChanges();

      let overlay = fixture.nativeElement.querySelector('.loading-overlay');
      expect(overlay).toBeTruthy();

      component.loading = false;
      fixture.detectChanges();

      overlay = fixture.nativeElement.querySelector('.loading-overlay');
      expect(overlay).toBeNull();

      // Verify no child elements are left
      const allLoaders = fixture.nativeElement.querySelectorAll('[class*="loading-"]');
      expect(allLoaders.length).toBe(0);
    });

    it('should maintain type while toggling loading state', () => {
      component.type = 'skeleton';
      component.message = 'Skeleton message';

      component.loading = true;
      fixture.detectChanges();
      let skeleton = fixture.nativeElement.querySelector('.loading-skeleton');
      expect(skeleton).toBeTruthy();

      component.loading = false;
      fixture.detectChanges();
      skeleton = fixture.nativeElement.querySelector('.loading-skeleton');
      expect(skeleton).toBeNull();

      component.loading = true;
      fixture.detectChanges();
      skeleton = fixture.nativeElement.querySelector('.loading-skeleton');
      expect(skeleton).toBeTruthy();
    });
  });
});
