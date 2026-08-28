import { TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormValidationHelper } from './form-validation.helper';

describe('FormValidationHelper', () => {
  let service: FormValidationHelper;
  let fb: FormBuilder;
  let form: FormGroup;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FormValidationHelper, FormBuilder],
    });
    service = TestBed.inject(FormValidationHelper);
    fb = TestBed.inject(FormBuilder);

    form = fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      phone: ['', [Validators.required]],
    });
  });

  describe('getErrorMessage', () => {
    it('should return empty string for null control', () => {
      const message = service.getErrorMessage(null);
      expect(message).toBe('');
    });

    it('should return empty string for valid control', () => {
      const control = form.get('email');
      control?.setValue('test@example.com');
      const message = service.getErrorMessage(control);
      expect(message).toBe('');
    });

    it('should return required error message', () => {
      const control = form.get('email');
      const message = service.getErrorMessage(control, 'Email');
      expect(message).toContain('Email est requis');
    });

    it('should return email error message', () => {
      const control = form.get('email');
      control?.setValue('invalid-email');
      const message = service.getErrorMessage(control, 'Email');
      expect(message).toContain('adresse e-mail');
    });

    it('should return minlength error message', () => {
      const control = form.get('password');
      control?.setValue('short');
      const message = service.getErrorMessage(control, 'Mot de passe');
      expect(message).toContain('au moins 8');
    });

    it('should use default field label', () => {
      const control = form.get('email');
      const message = service.getErrorMessage(control);
      expect(message).toContain('Ce champ est requis');
    });
  });

  describe('hasError', () => {
    it('should return false for null control', () => {
      const result = service.hasError(null);
      expect(result).toBeFalse();
    });

    it('should return false for untouched invalid control', () => {
      const control = form.get('email');
      const result = service.hasError(control);
      expect(result).toBeFalse();
    });

    it('should return true for touched invalid control', () => {
      const control = form.get('email');
      control?.markAsTouched();
      const result = service.hasError(control);
      expect(result).toBeTrue();
    });

    it('should return false for touched valid control', () => {
      const control = form.get('email');
      control?.setValue('test@example.com');
      control?.markAsTouched();
      const result = service.hasError(control);
      expect(result).toBeFalse();
    });
  });

  describe('getFieldClasses', () => {
    it('should return pristine class for new control', () => {
      const control = form.get('email');
      const classes = service.getFieldClasses(control);
      expect(classes['field-pristine']).toBeTrue();
      expect(classes['field-error']).toBeFalse();
    });

    it('should return error class for touched invalid control', () => {
      const control = form.get('email');
      control?.markAsTouched();
      const classes = service.getFieldClasses(control);
      expect(classes['field-error']).toBeTrue();
    });

    it('should return valid class for touched valid control', () => {
      const control = form.get('email');
      control?.setValue('test@example.com');
      control?.markAsTouched();
      const classes = service.getFieldClasses(control);
      expect(classes['field-valid']).toBeTrue();
      expect(classes['field-error']).toBeFalse();
    });
  });

  describe('markAllAsTouched', () => {
    it('should mark form group and all controls as touched', () => {
      service.markAllAsTouched(form);

      expect(form.touched).toBeTrue();
      expect(form.get('email')?.touched).toBeTrue();
      expect(form.get('password')?.touched).toBeTrue();
      expect(form.get('phone')?.touched).toBeTrue();
    });

    it('should work with nested form groups', () => {
      const nestedForm = fb.group({
        personal: fb.group({
          email: ['', Validators.required],
          name: ['', Validators.required],
        }),
      });

      service.markAllAsTouched(nestedForm);
      expect(nestedForm.get('personal.email')?.touched).toBeTrue();
    });
  });

  describe('hasFormErrors', () => {
    it('should return true when form has invalid controls', () => {
      const result = service.hasFormErrors(form);
      expect(result).toBeTrue();
    });

    it('should return false when form is valid', () => {
      form.patchValue({
        email: 'test@example.com',
        password: 'password123',
        phone: '0550000000',
      });
      const result = service.hasFormErrors(form);
      expect(result).toBeFalse();
    });
  });

  describe('getErrorCount', () => {
    it('should return correct error count', () => {
      const count = service.getErrorCount(form);
      expect(count).toBe(3); // All three fields are invalid
    });

    it('should return 0 when form is valid', () => {
      form.patchValue({
        email: 'test@example.com',
        password: 'password123',
        phone: '0550000000',
      });
      const count = service.getErrorCount(form);
      expect(count).toBe(0);
    });

    it('should work with single control', () => {
      const control = form.get('email');
      const count = service.getErrorCount(control!);
      expect(count).toBe(1);
    });
  });

  describe('getFormErrors', () => {
    it('should return object with all form errors', () => {
      const errors = service.getFormErrors(form);
      expect(Object.keys(errors).length).toBeGreaterThan(0);
    });

    it('should return empty object for valid form', () => {
      form.patchValue({
        email: 'test@example.com',
        password: 'password123',
        phone: '0550000000',
      });
      const errors = service.getFormErrors(form);
      expect(Object.keys(errors).length).toBe(0);
    });

    it('should include specific error details', () => {
      const errors = service.getFormErrors(form);
      expect(errors['email']).toBeDefined();
      expect(errors['email']['required']).toBeDefined();
    });
  });
});
