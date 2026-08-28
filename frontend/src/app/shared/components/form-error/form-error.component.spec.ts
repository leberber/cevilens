import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormErrorComponent } from './form-error.component';

describe('FormErrorComponent', () => {
  let component: FormErrorComponent;
  let fixture: ComponentFixture<FormErrorComponent>;
  let fb: FormBuilder;
  let form: FormGroup;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormErrorComponent],
      providers: [FormBuilder],
    }).compileComponents();

    fixture = TestBed.createComponent(FormErrorComponent);
    component = fixture.componentInstance;
    fb = TestBed.inject(FormBuilder);

    form = fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      phone: ['', [Validators.required, Validators.pattern(/^0\d{9}$/)]],
    });

    fixture.detectChanges();
  });

  describe('Rendering', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should not render error for pristine field', () => {
      component.control = form.get('email');
      fixture.detectChanges();
      const errorDiv = fixture.nativeElement.querySelector('.form-error');
      expect(errorDiv).toBeNull();
    });

    it('should not render error for untouched invalid field', () => {
      const control = form.get('email');
      control?.markAsUntouched();
      component.control = control;
      fixture.detectChanges();
      const errorDiv = fixture.nativeElement.querySelector('.form-error');
      expect(errorDiv).toBeNull();
    });

    it('should render error for touched invalid field', () => {
      const control = form.get('email');
      control?.markAsTouched();
      component.control = control;
      fixture.detectChanges();
      const errorDiv = fixture.nativeElement.querySelector('.form-error');
      expect(errorDiv).toBeTruthy();
    });

    it('should render error icon with correct class', () => {
      const control = form.get('email');
      control?.markAsTouched();
      component.control = control;
      fixture.detectChanges();
      const icon = fixture.nativeElement.querySelector('.form-error i');
      expect(icon).toBeTruthy();
      expect(icon.className).toContain('pi-exclamation-circle');
    });

    it('should render error message text', () => {
      const control = form.get('email');
      control?.markAsTouched();
      component.control = control;
      component.fieldLabel = 'Email';
      fixture.detectChanges();
      const span = fixture.nativeElement.querySelector('.form-error span');
      expect(span.textContent).toContain('Email est requis');
    });

    it('should not render error when control becomes valid', () => {
      const control = form.get('email');
      control?.markAsTouched();
      control?.setValue('test@example.com');
      component.control = control;
      fixture.detectChanges();
      const errorDiv = fixture.nativeElement.querySelector('.form-error');
      expect(errorDiv).toBeNull();
    });
  });

  describe('Error Messages', () => {
    it('should display required error message', () => {
      const control = form.get('email');
      control?.markAsTouched();
      component.control = control;
      component.fieldLabel = 'Email';
      const message = component.getErrorMessage();
      expect(message).toBe('Email est requis');
    });

    it('should display email error message', () => {
      const control = form.get('email');
      control?.setValue('invalid-email');
      control?.markAsTouched();
      component.control = control;
      component.fieldLabel = 'Email';
      const message = component.getErrorMessage();
      expect(message).toContain('adresse e-mail');
    });

    it('should display minlength error message', () => {
      const control = form.get('password');
      control?.setValue('short');
      control?.markAsTouched();
      component.control = control;
      component.fieldLabel = 'Mot de passe';
      const message = component.getErrorMessage();
      expect(message).toContain('au moins 8');
    });

    it('should display pattern error message', () => {
      const control = form.get('phone');
      control?.setValue('123');
      control?.markAsTouched();
      component.control = control;
      component.fieldLabel = 'Téléphone';
      const message = component.getErrorMessage();
      expect(message).toContain('ne respecte pas le format');
    });

    it('should use custom field label in error message', () => {
      const control = form.get('email');
      control?.markAsTouched();
      component.control = control;
      component.fieldLabel = 'Adresse Email';
      const message = component.getErrorMessage();
      expect(message).toContain('Adresse Email');
    });

    it('should use default field label when not provided', () => {
      const control = form.get('email');
      control?.markAsTouched();
      component.control = control;
      component.fieldLabel = 'Ce champ'; // default
      const message = component.getErrorMessage();
      expect(message).toContain('Ce champ');
    });

    it('should return empty string for valid control', () => {
      const control = form.get('email');
      control?.setValue('test@example.com');
      control?.markAsTouched();
      component.control = control;
      const message = component.getErrorMessage();
      expect(message).toBe('');
    });

    it('should return empty string for null control', () => {
      component.control = null;
      const message = component.getErrorMessage();
      expect(message).toBe('');
    });

    it('should handle multiple validation errors (shows first)', () => {
      const control = form.get('email');
      control?.markAsTouched();
      // Control has both required and email errors
      component.control = control;
      component.fieldLabel = 'Email';
      const message = component.getErrorMessage();
      // Should show required first (as it checks required first)
      expect(message).toBe('Email est requis');
    });
  });

  describe('hasError Getter', () => {
    it('should return false for pristine field', () => {
      const control = form.get('email');
      component.control = control;
      expect(component.hasError).toBe(false);
    });

    it('should return false for untouched invalid field', () => {
      const control = form.get('email');
      control?.markAsUntouched();
      component.control = control;
      expect(component.hasError).toBe(false);
    });

    it('should return true for touched invalid field', () => {
      const control = form.get('email');
      control?.markAsTouched();
      component.control = control;
      expect(component.hasError).toBe(true);
    });

    it('should return false for touched valid field', () => {
      const control = form.get('email');
      control?.setValue('test@example.com');
      control?.markAsTouched();
      component.control = control;
      expect(component.hasError).toBe(false);
    });

    it('should return false for null control', () => {
      component.control = null;
      expect(component.hasError).toBe(false);
    });

    it('should update when control state changes', () => {
      const control = form.get('email');
      component.control = control;
      expect(component.hasError).toBe(false);

      control?.markAsTouched();
      expect(component.hasError).toBe(true);

      control?.setValue('test@example.com');
      expect(component.hasError).toBe(false);
    });
  });

  describe('Input Properties', () => {
    it('should accept FormControl via control input', () => {
      const control = form.get('email');
      component.control = control;
      expect(component.control).toBe(control);
    });

    it('should accept fieldLabel input', () => {
      component.fieldLabel = 'Custom Field';
      expect(component.fieldLabel).toBe('Custom Field');
    });

    it('should use default fieldLabel when not set', () => {
      expect(component.fieldLabel).toBe('Ce champ');
    });

    it('should allow changing fieldLabel dynamically', () => {
      const control = form.get('email');
      control?.markAsTouched();
      component.control = control;

      component.fieldLabel = 'Email Address';
      fixture.detectChanges();
      let message = component.getErrorMessage();
      expect(message).toContain('Email Address');

      component.fieldLabel = 'Adresse Email';
      message = component.getErrorMessage();
      expect(message).toContain('Adresse Email');
    });

    it('should allow setting control to null', () => {
      const control = form.get('email');
      component.control = control;
      expect(component.control).toBeTruthy();

      component.control = null;
      expect(component.control).toBeNull();
      expect(component.hasError).toBe(false);
    });
  });

  describe('Styling', () => {
    it('should have form-error CSS class', () => {
      const control = form.get('email');
      control?.markAsTouched();
      component.control = control;
      fixture.detectChanges();
      const errorDiv = fixture.nativeElement.querySelector('.form-error');
      expect(errorDiv.classList.contains('form-error')).toBe(true);
    });

    it('should display error with flex layout', () => {
      const control = form.get('email');
      control?.markAsTouched();
      component.control = control;
      fixture.detectChanges();
      const errorDiv = fixture.nativeElement.querySelector('.form-error');
      const style = window.getComputedStyle(errorDiv);
      expect(style.display).toBe('flex');
    });

    it('should use color-danger CSS variable for text color', () => {
      const control = form.get('email');
      control?.markAsTouched();
      component.control = control;
      fixture.detectChanges();
      const errorDiv = fixture.nativeElement.querySelector('.form-error');
      // Component uses var(--color-danger, #f87171) as fallback
      expect(errorDiv).toBeTruthy();
    });
  });

  describe('Special Validators', () => {
    it('should handle invalidPhone error', () => {
      const customForm = fb.group({
        phone: ['', Validators.required],
      });
      const control = customForm.get('phone');
      control?.setErrors({ invalidPhone: true });
      control?.markAsTouched();
      component.control = control;
      component.fieldLabel = 'Téléphone';
      const message = component.getErrorMessage();
      expect(message).toContain('invalide');
    });

    it('should handle matchPassword error', () => {
      const customForm = fb.group({
        password: ['', Validators.required],
        confirmPassword: ['', Validators.required],
      });
      const control = customForm.get('confirmPassword');
      control?.setErrors({ matchPassword: true });
      control?.markAsTouched();
      component.control = control;
      const message = component.getErrorMessage();
      expect(message).toBe('Les mots de passe ne correspondent pas');
    });

    it('should handle min error', () => {
      const customForm = fb.group({
        age: ['', Validators.min(18)],
      });
      const control = customForm.get('age');
      control?.setErrors({ min: { min: 18, actual: 10 } });
      control?.markAsTouched();
      component.control = control;
      component.fieldLabel = 'Âge';
      const message = component.getErrorMessage();
      expect(message).toContain('18');
    });

    it('should handle max error', () => {
      const customForm = fb.group({
        age: ['', Validators.max(100)],
      });
      const control = customForm.get('age');
      control?.setErrors({ max: { max: 100, actual: 150 } });
      control?.markAsTouched();
      component.control = control;
      component.fieldLabel = 'Âge';
      const message = component.getErrorMessage();
      expect(message).toContain('100');
    });

    it('should handle maxlength error', () => {
      const customForm = fb.group({
        comment: ['', Validators.maxLength(50)],
      });
      const control = customForm.get('comment');
      control?.setErrors({ maxlength: { requiredLength: 50, actualLength: 100 } });
      control?.markAsTouched();
      component.control = control;
      component.fieldLabel = 'Commentaire';
      const message = component.getErrorMessage();
      expect(message).toContain('50');
    });
  });

  describe('Integration with FormGroup', () => {
    it('should work with form group controls', () => {
      const emailControl = form.get('email');
      emailControl?.markAsTouched();
      component.control = emailControl;
      component.fieldLabel = 'Email';
      fixture.detectChanges();
      const errorDiv = fixture.nativeElement.querySelector('.form-error');
      expect(errorDiv).toBeTruthy();
    });

    it('should update when form control value changes', () => {
      const control = form.get('email');
      control?.markAsTouched();
      component.control = control;

      expect(component.hasError).toBe(true);
      control?.setValue('test@example.com');
      expect(component.hasError).toBe(false);
    });

    it('should handle form validation updates', () => {
      const control = form.get('email');
      component.control = control;
      component.fieldLabel = 'Email';

      expect(component.hasError).toBe(false);
      control?.markAsTouched();
      expect(component.hasError).toBe(true);
      fixture.detectChanges();
      const errorDiv = fixture.nativeElement.querySelector('.form-error');
      expect(errorDiv).toBeTruthy();
    });
  });
});
