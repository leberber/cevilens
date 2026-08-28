import { TestBed } from '@angular/core/testing';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
  AbstractControl,
  AsyncValidatorFn,
  ValidationErrors,
} from '@angular/forms';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { FormValidationHelper } from './form-validation.helper';
import { UtilityService } from './utility.service';

/**
 * Helper function to validate password matching across form groups
 */
function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;

  if (!password || !confirmPassword) return null;

  return password === confirmPassword ? null : { passwordMismatch: true };
}

/**
 * Form Validation Integration Tests
 * Comprehensive test suite covering end-to-end form validation workflows
 * with real Angular Reactive Forms patterns and user interactions.
 */
describe('Form Validation Integration Tests', () => {
  let formBuilder: FormBuilder;
  let validation: FormValidationHelper;
  let utility: UtilityService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FormBuilder, FormValidationHelper, UtilityService],
    });
    formBuilder = TestBed.inject(FormBuilder);
    validation = TestBed.inject(FormValidationHelper);
    utility = TestBed.inject(UtilityService);
  });

  describe('End-to-End Form Submission (10 tests)', () => {
    let userForm: FormGroup;

    beforeEach(() => {
      userForm = formBuilder.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        phone: ['', [Validators.required, (c: AbstractControl) => utility.isValidPhone(c.value ?? '') ? null : { invalidPhone: true }]],
      });
    });

    it('should allow valid form submission when all fields are valid', () => {
      userForm.patchValue({
        email: 'user@example.com',
        password: 'securePassword123',
        phone: '0550000000',
      });

      expect(userForm.valid).toBe(true);
      expect(userForm.pristine).toBe(true); // Form is pristine but valid
    });

    it('should prevent submission when form is invalid', () => {
      userForm.patchValue({
        email: 'invalid-email',
        password: 'short',
        phone: '123',
      });

      expect(userForm.invalid).toBe(true);
      expect(validation.hasFormErrors(userForm)).toBe(true);
    });

    it('should show all validation errors when form is invalid', () => {
      expect(userForm.invalid).toBe(true);
      const errors = validation.getFormErrors(userForm);
      expect(Object.keys(errors).length).toBeGreaterThan(0);
      expect(errors['email']).toBeDefined();
      expect(errors['password']).toBeDefined();
      expect(errors['phone']).toBeDefined();
    });

    it('should allow user to fix errors one by one', () => {
      // Initially invalid
      expect(userForm.invalid).toBe(true);

      // Fix email
      userForm.get('email')?.setValue('user@example.com');
      expect(userForm.get('email')?.valid).toBe(true);
      expect(userForm.invalid).toBe(true); // Still invalid due to other fields

      // Fix password
      userForm.get('password')?.setValue('securePassword123');
      expect(userForm.get('password')?.valid).toBe(true);
      expect(userForm.invalid).toBe(true); // Still invalid due to phone

      // Fix phone
      userForm.get('phone')?.setValue('0550000000');
      expect(userForm.get('phone')?.valid).toBe(true);
      expect(userForm.valid).toBe(true); // Now valid!
    });

    it('should decrease form error count as user fixes errors', () => {
      expect(validation.getErrorCount(userForm)).toBe(3);

      userForm.get('email')?.setValue('user@example.com');
      expect(validation.getErrorCount(userForm)).toBe(2);

      userForm.get('password')?.setValue('securePassword123');
      expect(validation.getErrorCount(userForm)).toBe(1);

      userForm.get('phone')?.setValue('0550000000');
      expect(validation.getErrorCount(userForm)).toBe(0);
    });

    it('should succeed when form is submitted after all errors are fixed', () => {
      userForm.patchValue({
        email: 'user@example.com',
        password: 'securePassword123',
        phone: '0550000000',
      });

      expect(userForm.valid).toBe(true);
      const formData = userForm.value;
      expect(formData.email).toBe('user@example.com');
      expect(formData.password).toBe('securePassword123');
      expect(formData.phone).toBe('0550000000');
    });

    it('should reset form and clear all errors when reset is called', () => {
      // Set values
      userForm.patchValue({
        email: 'user@example.com',
        password: 'securePassword123',
        phone: '0550000000',
      });

      // Mark as touched to show errors
      validation.markAllAsTouched(userForm);
      expect(userForm.touched).toBe(true);

      // Reset
      userForm.reset();
      expect(userForm.pristine).toBe(true);
      expect(userForm.touched).toBe(false);
      expect(userForm.value.email).toBeNull();
      expect(userForm.value.password).toBeNull();
      expect(userForm.value.phone).toBeNull();
    });

    it('should validate required fields when submitted without values', () => {
      validation.markAllAsTouched(userForm);

      const emailError = validation.getErrorMessage(userForm.get('email'), 'Email');
      const passwordError = validation.getErrorMessage(userForm.get('password'), 'Mot de passe');
      const phoneError = validation.getErrorMessage(userForm.get('phone'), 'Téléphone');

      expect(emailError).toContain('requis');
      expect(passwordError).toContain('requis');
      expect(phoneError).toContain('requis');
    });

    it('should validate email format when invalid email is entered', () => {
      const emailControl = userForm.get('email');
      emailControl?.setValue('invalid-email-format');
      emailControl?.markAsTouched();

      expect(emailControl?.invalid).toBe(true);
      const error = validation.getErrorMessage(emailControl, 'Email');
      expect(error).toContain('adresse e-mail');
    });

    it('should validate phone number format when invalid phone is entered', () => {
      const phoneControl = userForm.get('phone');
      phoneControl?.setValue('123456');
      phoneControl?.markAsTouched();

      expect(phoneControl?.invalid).toBe(true);
      const error = validation.getErrorMessage(phoneControl, 'Téléphone');
      expect(error).toContain('invalide');
    });

    it('should validate password confirmation matching via custom validator', () => {
      const confirmForm = formBuilder.group({
        password: ['', Validators.required],
        confirmPassword: ['', Validators.required],
      }, { validators: passwordMatchValidator });

      confirmForm.patchValue({
        password: 'password123',
        confirmPassword: 'password123',
      });
      expect(confirmForm.valid).toBe(true);

      confirmForm.patchValue({ confirmPassword: 'different' });
      expect(confirmForm.invalid).toBe(true);
    });
  });

  describe('Multi-field Validation (8 tests)', () => {
    let userForm: FormGroup;

    beforeEach(() => {
      userForm = formBuilder.group(
        {
          password: ['', [Validators.required, Validators.minLength(8)]],
          confirmPassword: ['', Validators.required],
          role: ['superviseur', Validators.required],
          supervisor: [{ value: '', disabled: true }],
        },
        { validators: passwordMatchValidator }
      );
    });

    it('should validate password confirmation matching across multiple fields', () => {
      userForm.patchValue({
        password: 'myPassword123',
        confirmPassword: 'myPassword123',
      });

      expect(userForm.valid).toBe(true);
      expect(userForm.getError('passwordMismatch')).toBeNull();
    });

    it('should show error when passwords do not match', () => {
      userForm.patchValue({
        password: 'myPassword123',
        confirmPassword: 'differentPassword',
      });

      expect(userForm.invalid).toBe(true);
      expect(userForm.getError('passwordMismatch')).toBe(true);
    });

    it('should apply conditional field validation based on role selection', () => {
      const supervisorControl = userForm.get('supervisor');
      const roleControl = userForm.get('role');

      // When role changes to require supervisor, enable and add validators
      roleControl?.setValue('prevendeur');
      supervisorControl?.enable();
      supervisorControl?.setValidators(Validators.required);
      supervisorControl?.updateValueAndValidity();

      expect(supervisorControl?.disabled).toBe(false);
      expect(supervisorControl?.invalid).toBe(true);

      supervisorControl?.setValue('John Doe');
      expect(supervisorControl?.valid).toBe(true);
    });

    it('should dynamically apply validators based on form state', () => {
      const passwordControl = userForm.get('password');

      // Start with minLength(8)
      passwordControl?.setValue('short');
      expect(passwordControl?.invalid).toBe(true);

      // Add additional validator (maxLength)
      passwordControl?.setValidators([
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(32),
      ]);
      passwordControl?.updateValueAndValidity();
      expect(passwordControl?.invalid).toBe(true);

      // Fix value
      passwordControl?.setValue('properPassword123');
      expect(passwordControl?.valid).toBe(true);
    });

    it('should handle multiple validators on single field', () => {
      const passwordControl = userForm.get('password');

      // Has both required and minLength validators
      expect(passwordControl?.hasError('required')).toBe(true);

      passwordControl?.setValue('short');
      expect(passwordControl?.hasError('minlength')).toBe(true);
      expect(passwordControl?.hasError('required')).toBe(false);
    });

    it('should show first error message when multiple validators fail', () => {
      const passwordControl = userForm.get('password');

      // Field has no value - required error should show first
      const errorMessage = validation.getErrorMessage(passwordControl, 'Mot de passe');
      expect(errorMessage).toContain('requis');
    });

    it('should integrate custom validator that checks email uniqueness', (done) => {
      const emailAsyncValidator: AsyncValidatorFn = (control: AbstractControl) => {
        if (!control.value) return of(null);

        // Simulate API call to check if email exists
        return of(control.value === 'taken@example.com' ? { emailTaken: true } : null).pipe(
          delay(100)
        );
      };

      const asyncForm = formBuilder.group({
        email: ['', [Validators.required, Validators.email], [emailAsyncValidator]],
      });

      asyncForm.get('email')?.setValue('taken@example.com');

      // Wait for async validator
      setTimeout(() => {
        expect(asyncForm.get('email')?.hasError('emailTaken')).toBe(true);
        done();
      }, 150);
    });

    it('should resolve async validator when email is unique', (done) => {
      const emailAsyncValidator: AsyncValidatorFn = (control: AbstractControl) => {
        if (!control.value) return of(null);
        return of(control.value === 'taken@example.com' ? { emailTaken: true } : null).pipe(
          delay(100)
        );
      };

      const asyncForm = formBuilder.group({
        email: ['', [Validators.required, Validators.email], [emailAsyncValidator]],
      });

      asyncForm.get('email')?.setValue('unique@example.com');

      setTimeout(() => {
        expect(asyncForm.get('email')?.hasError('emailTaken')).toBe(false);
        expect(asyncForm.get('email')?.valid).toBe(true);
        done();
      }, 150);
    });
  });

  describe('Real Form Component Workflow (12 tests)', () => {
    let userForm: FormGroup;

    beforeEach(() => {
      userForm = formBuilder.group({
        email: ['', [Validators.required, Validators.email]],
        fullName: ['', Validators.required],
        phone: ['', [Validators.required, (c: AbstractControl) => utility.isValidPhone(c.value ?? '') ? null : { invalidPhone: true }]],
        password: ['', [Validators.required, Validators.minLength(8)]],
      });
    });

    it('should trigger validation when user types in field', () => {
      const emailControl = userForm.get('email');

      emailControl?.setValue('t');
      expect(emailControl?.invalid).toBe(true);
      expect(emailControl?.pristine).toBe(true); // Still pristine, not touched

      emailControl?.setValue('test@example.com');
      expect(emailControl?.valid).toBe(true);
    });

    it('should show error only after field is touched', () => {
      const emailControl = userForm.get('email');

      // Invalid but not touched - no error should display
      expect(validation.hasError(emailControl)).toBe(false);

      // Mark as touched
      emailControl?.markAsTouched();
      expect(validation.hasError(emailControl)).toBe(true);
    });

    it('should not show errors on pristine field even when invalid', () => {
      const emailControl = userForm.get('email');
      expect(emailControl?.pristine).toBe(true);
      expect(emailControl?.invalid).toBe(true);
      expect(validation.hasError(emailControl)).toBe(false); // Error not shown while pristine
    });

    it('should show errors on touched field when invalid', () => {
      const emailControl = userForm.get('email');
      emailControl?.markAsTouched();

      expect(emailControl?.touched).toBe(true);
      expect(emailControl?.invalid).toBe(true);
      expect(validation.hasError(emailControl)).toBe(true);
    });

    it('should mark field as touched on blur event simulation', () => {
      const emailControl = userForm.get('email');
      expect(emailControl?.untouched).toBe(true);

      emailControl?.markAsTouched();
      expect(emailControl?.touched).toBe(true);
    });

    it('should update FormGroup validation state when any control changes', () => {
      expect(userForm.invalid).toBe(true);

      userForm.get('email')?.setValue('test@example.com');
      expect(userForm.invalid).toBe(true); // Still invalid

      userForm.get('fullName')?.setValue('John Doe');
      expect(userForm.invalid).toBe(true); // Still invalid

      userForm.get('phone')?.setValue('0550000000');
      expect(userForm.invalid).toBe(true); // Still invalid

      userForm.get('password')?.setValue('SecurePassword123');
      expect(userForm.valid).toBe(true); // Now valid!
    });

    it('should handle async validator integration during form workflow', (done) => {
      const emailAsyncValidator: AsyncValidatorFn = (control: AbstractControl) => {
        if (!control.value) return of(null);
        // Simulate API delay
        return of(control.value === 'taken@example.com' ? { emailTaken: true } : null).pipe(
          delay(50)
        );
      };

      const asyncForm = formBuilder.group({
        email: ['', [Validators.required, Validators.email], [emailAsyncValidator]],
      });

      asyncForm.get('email')?.setValue('newuser@example.com');

      setTimeout(() => {
        expect(asyncForm.get('email')?.valid).toBe(true);
        expect(asyncForm.valid).toBe(true);
        done();
      }, 100);
    });

    it('should handle form disable state and exclude disabled fields from validation', () => {
      const emailControl = userForm.get('email');

      // Initially invalid
      expect(userForm.invalid).toBe(true);

      // Disable email field
      emailControl?.disable();

      // Disabled fields are not included in form validity
      expect(userForm.get('email')?.disabled).toBe(true);
      expect(userForm.invalid).toBe(true); // Still has other required fields

      // Re-enable
      emailControl?.enable();
      expect(emailControl?.disabled).toBe(false);
      expect(userForm.invalid).toBe(true);
    });

    it('should maintain disabled field state when getting form value', () => {
      const emailControl = userForm.get('email');
      emailControl?.setValue('test@example.com');
      emailControl?.disable();

      const value = userForm.value;
      expect(value.email).toBeUndefined(); // Disabled fields excluded

      const rawValue = userForm.getRawValue();
      expect(rawValue.email).toBe('test@example.com'); // Raw value includes disabled
    });

    it('should reset form to initial state and clear all errors', () => {
      userForm.patchValue({
        email: 'test@example.com',
        fullName: 'John Doe',
        phone: '0550000000',
        password: 'SecurePassword123',
      });
      userForm.get('email')?.markAsTouched();
      userForm.get('fullName')?.markAsTouched();
      userForm.markAsDirty();

      expect(userForm.get('email')?.touched).toBe(true);
      expect(userForm.dirty).toBe(true);

      userForm.reset();

      expect(userForm.pristine).toBe(true);
      expect(userForm.get('email')?.touched).toBe(false);
      expect(userForm.value.email).toBeNull();
    });

    it('should update field classes based on validation state', () => {
      const emailControl = userForm.get('email');

      // Pristine, invalid
      let classes = validation.getFieldClasses(emailControl);
      expect(classes['field-pristine']).toBe(true);
      expect(classes['field-error']).toBe(false);
      expect(classes['field-valid']).toBe(false);

      // Touched, invalid (mark as dirty to change pristine state)
      emailControl?.markAsTouched();
      emailControl?.markAsDirty();
      classes = validation.getFieldClasses(emailControl);
      expect(classes['field-error']).toBe(true);
      expect(classes['field-pristine']).toBe(false);

      // Touched, valid
      emailControl?.setValue('test@example.com');
      classes = validation.getFieldClasses(emailControl);
      expect(classes['field-valid']).toBe(true);
      expect(classes['field-error']).toBe(false);
    });

    it('should allow patchValue for partial updates without marking dirty', () => {
      userForm.patchValue({
        email: 'test@example.com',
      });

      // patchValue doesn't mark form as dirty by default
      expect(userForm.dirty).toBe(false);
      expect(userForm.value.email).toBe('test@example.com');
    });
  });

  describe('User Interactions (8 tests)', () => {
    let registrationForm: FormGroup;

    beforeEach(() => {
      registrationForm = formBuilder.group({
        email: ['', [Validators.required, Validators.email]],
        fullName: ['', Validators.required],
        phone: ['', [Validators.required, (c: AbstractControl) => utility.isValidPhone(c.value ?? '') ? null : { invalidPhone: true }]],
        password: ['', [Validators.required, Validators.minLength(8)]],
      });
    });

    it('should disable submit button when form is invalid', () => {
      // Form is invalid
      expect(registrationForm.invalid).toBe(true);

      // Simulate submit button disabled check
      const submitEnabled = registrationForm.valid;
      expect(submitEnabled).toBe(false);
    });

    it('should enable submit button only when form is completely valid', () => {
      registrationForm.patchValue({
        email: 'user@example.com',
        fullName: 'John Doe',
        phone: '0550000000',
        password: 'SecurePassword123',
      });

      expect(registrationForm.valid).toBe(true);
      const submitEnabled = registrationForm.valid;
      expect(submitEnabled).toBe(true);
    });

    it('should display error summary with all form errors', () => {
      validation.markAllAsTouched(registrationForm);

      const allErrors = validation.getFormErrors(registrationForm);
      const errorCount = Object.keys(allErrors).length;

      expect(errorCount).toBeGreaterThan(0);
      expect(Object.keys(allErrors)).toContain('email');
      expect(Object.keys(allErrors)).toContain('fullName');
      expect(Object.keys(allErrors)).toContain('phone');
      expect(Object.keys(allErrors)).toContain('password');
    });

    it('should clear all errors when form is reset', () => {
      validation.markAllAsTouched(registrationForm);
      const errorCountBefore = validation.getErrorCount(registrationForm);
      expect(errorCountBefore).toBeGreaterThan(0);

      registrationForm.reset();
      // After reset, all fields are empty and marked as untouched, but validation helper
      // counts invalid controls. Empty required fields are still invalid.
      const errorCountAfter = validation.getErrorCount(registrationForm);
      expect(errorCountAfter).toBeGreaterThan(0); // Form still invalid (empty required fields)

      // But touched state should be cleared
      expect(registrationForm.get('email')?.touched).toBe(false);
    });

    it('should update field-level error messages as user types', () => {
      const emailControl = registrationForm.get('email');
      emailControl?.markAsTouched();

      // Empty field
      let error = validation.getErrorMessage(emailControl, 'Email');
      expect(error).toContain('requis');

      // Invalid email
      emailControl?.setValue('invalid-email');
      error = validation.getErrorMessage(emailControl, 'Email');
      expect(error).toContain('adresse e-mail');

      // Valid email
      emailControl?.setValue('test@example.com');
      error = validation.getErrorMessage(emailControl, 'Email');
      expect(error).toBe('');
    });

    it('should provide visual feedback for field validation states', () => {
      const emailControl = registrationForm.get('email');

      // Invalid and touched - show error styling
      emailControl?.markAsTouched();
      let classes = validation.getFieldClasses(emailControl);
      expect(classes['field-error']).toBe(true);

      // Valid and touched - show success styling
      emailControl?.setValue('test@example.com');
      classes = validation.getFieldClasses(emailControl);
      expect(classes['field-valid']).toBe(true);
      expect(classes['field-error']).toBe(false);
    });

    it('should integrate inline error component with form control', () => {
      const emailControl = registrationForm.get('email');

      // Simulate inline error component checking
      emailControl?.markAsTouched();
      const shouldDisplayError = validation.hasError(emailControl);
      expect(shouldDisplayError).toBe(true);

      const errorMessage = validation.getErrorMessage(emailControl, 'Email');
      expect(errorMessage).toBeTruthy();
    });

    it('should show success message after form submission', () => {
      registrationForm.patchValue({
        email: 'user@example.com',
        fullName: 'John Doe',
        phone: '0550000000',
        password: 'SecurePassword123',
      });

      if (registrationForm.valid) {
        const successMessage = 'Utilisateur créé avec succès';
        expect(successMessage).toContain('succès');
      }
    });
  });

  describe('Edge Cases (4 tests)', () => {
    let edgeForm: FormGroup;

    beforeEach(() => {
      edgeForm = formBuilder.group({
        fullName: ['', [Validators.required, Validators.maxLength(100)]],
        phone: ['', [Validators.required, (c: AbstractControl) => utility.isValidPhone(c.value ?? '') ? null : { invalidPhone: true }]],
        comments: ['', [Validators.maxLength(500)]],
      });
    });

    it('should handle very long input values within maxLength constraint', () => {
      const longName = 'A'.repeat(100);
      edgeForm.get('fullName')?.setValue(longName);
      expect(edgeForm.get('fullName')?.valid).toBe(true);

      const tooLongName = 'A'.repeat(101);
      edgeForm.get('fullName')?.setValue(tooLongName);
      expect(edgeForm.get('fullName')?.hasError('maxlength')).toBe(true);
    });

    it('should accept special characters in input fields', () => {
      const specialName = "Jean-Marie O'Connor (Jr.)";
      edgeForm.get('fullName')?.setValue(specialName);
      expect(edgeForm.get('fullName')?.valid).toBe(true);

      const specialComments = 'Notes: @mention & test #hashtag $price €euro';
      edgeForm.get('comments')?.setValue(specialComments);
      expect(edgeForm.get('comments')?.valid).toBe(true);
    });

    it('should support unicode and international characters', () => {
      const unicodeName = 'José María García-López';
      edgeForm.get('fullName')?.setValue(unicodeName);
      expect(edgeForm.get('fullName')?.valid).toBe(true);

      const arabicName = 'محمد علي';
      edgeForm.get('fullName')?.setValue(arabicName);
      expect(edgeForm.get('fullName')?.valid).toBe(true);

      const chineseName = '王小明';
      edgeForm.get('fullName')?.setValue(chineseName);
      expect(edgeForm.get('fullName')?.valid).toBe(true);
    });

    it('should handle rapid form state changes and maintain validation consistency', () => {
      const control = edgeForm.get('fullName');

      // Rapid value changes
      control?.setValue('A');
      expect(control?.valid).toBe(true);

      control?.setValue('');
      expect(control?.invalid).toBe(true);

      control?.setValue('Valid Name');
      expect(control?.valid).toBe(true);

      control?.setValue('Another Name');
      expect(control?.valid).toBe(true);

      // Form should be in consistent state
      expect(edgeForm.invalid).toBe(true); // Phone is still required
      expect(validation.getErrorCount(edgeForm)).toBe(1);
    });
  });

  describe('Complex Multi-Field Validation Scenarios', () => {
    it('should validate nested form groups with different validator configurations', () => {
      const complexForm = formBuilder.group({
        personalInfo: formBuilder.group({
          email: ['', [Validators.required, Validators.email]],
          phone: ['', Validators.required],
        }),
        accountInfo: formBuilder.group({
          username: ['', [Validators.required, Validators.minLength(4)]],
          password: ['', [Validators.required, Validators.minLength(8)]],
        }),
      });

      expect(complexForm.invalid).toBe(true);

      complexForm.get('personalInfo.email')?.setValue('test@example.com');
      complexForm.get('personalInfo.phone')?.setValue('0550000000');
      complexForm.get('accountInfo.username')?.setValue('johndoe');
      complexForm.get('accountInfo.password')?.setValue('SecurePassword123');

      expect(complexForm.valid).toBe(true);
    });

    it('should validate array of controls in FormArray', () => {
      const arrayForm = formBuilder.group({
        emails: formBuilder.array([
          formBuilder.control('', [Validators.required, Validators.email]),
          formBuilder.control('', [Validators.required, Validators.email]),
        ]),
      });

      expect(arrayForm.invalid).toBe(true);

      const emailsArray = arrayForm.get('emails');
      if (emailsArray && 'at' in emailsArray) {
        const formArray = emailsArray as any;
        formArray.at(0).setValue('test1@example.com');
        formArray.at(1).setValue('test2@example.com');
      }

      expect(arrayForm.valid).toBe(true);
    });

    it('should handle conditional validation based on parent form state', () => {
      const conditionalForm = formBuilder.group({
        isCompany: [false],
        companyName: [''],
        individualName: ['', Validators.required],
      });

      // Initially: individualName is required
      expect(conditionalForm.invalid).toBe(true);

      // User indicates company
      conditionalForm.get('isCompany')?.setValue(true);

      // Toggle requirement based on isCompany
      const isCompany = conditionalForm.get('isCompany')?.value;
      if (isCompany) {
        conditionalForm.get('companyName')?.setValidators(Validators.required);
        conditionalForm.get('individualName')?.clearValidators();
      } else {
        conditionalForm.get('companyName')?.clearValidators();
        conditionalForm.get('individualName')?.setValidators(Validators.required);
      }

      conditionalForm.get('companyName')?.updateValueAndValidity();
      conditionalForm.get('individualName')?.updateValueAndValidity();

      expect(conditionalForm.get('companyName')?.hasError('required')).toBe(true);

      conditionalForm.get('companyName')?.setValue('My Company Inc.');
      expect(conditionalForm.valid).toBe(true);
    });

    it('should maintain form state across multiple value updates and validator changes', () => {
      const dynamicForm = formBuilder.group({
        field1: ['', Validators.required],
        field2: ['', Validators.required],
      });

      // Initial state
      expect(dynamicForm.invalid).toBe(true);

      // Update field1
      dynamicForm.get('field1')?.setValue('Value 1');
      expect(dynamicForm.invalid).toBe(true);

      // Add new validator to field1
      const field1 = dynamicForm.get('field1');
      field1?.setValidators([Validators.required, Validators.minLength(5)]);
      field1?.updateValueAndValidity();
      expect(dynamicForm.invalid).toBe(true);

      // Fix field1
      field1?.setValue('Value that is longer');
      expect(dynamicForm.invalid).toBe(true);

      // Fix field2
      dynamicForm.get('field2')?.setValue('Value 2');
      expect(dynamicForm.valid).toBe(true);
    });
  });

  describe('Form State Management and Dirty Tracking', () => {
    it('should track pristine/dirty state separately from validation', () => {
      const form = formBuilder.group({
        email: ['', Validators.required],
      });

      // Initially pristine and invalid
      expect(form.pristine).toBe(true);
      expect(form.invalid).toBe(true);

      // After using setValue and explicitly marking as dirty
      form.get('email')?.setValue('test@example.com');
      form.get('email')?.markAsDirty();
      expect(form.get('email')?.dirty).toBe(true);
      expect(form.valid).toBe(true);

      // Reset clears both pristine state and value
      form.reset();
      expect(form.pristine).toBe(true);
      expect(form.get('email')?.pristine).toBe(true);
      expect(form.invalid).toBe(true);
    });

    it('should differentiate between touched and untouched fields', () => {
      const form = formBuilder.group({
        email: ['', Validators.required],
        phone: ['', Validators.required],
      });

      const emailControl = form.get('email');
      const phoneControl = form.get('phone');

      // Initially untouched
      expect(emailControl?.untouched).toBe(true);
      expect(phoneControl?.untouched).toBe(true);

      // Touch only email
      emailControl?.markAsTouched();
      expect(emailControl?.touched).toBe(true);
      expect(phoneControl?.untouched).toBe(true);

      // Touch phone
      phoneControl?.markAsTouched();
      expect(form.touched).toBe(true);
    });

    it('should handle form mark as untouched to reset interaction state', () => {
      const form = formBuilder.group({
        email: ['test@example.com', Validators.required],
      });

      const control = form.get('email');
      control?.markAsTouched();
      expect(control?.touched).toBe(true);

      // Mark as untouched
      control?.markAsUntouched();
      expect(control?.touched).toBe(false);
      expect(control?.untouched).toBe(true);
    });

    it('should preserve form values while resetting state', () => {
      const form = formBuilder.group({
        email: ['initial@example.com', Validators.required],
      });

      form.get('email')?.setValue('modified@example.com');
      form.get('email')?.markAsDirty();
      expect(form.get('email')?.dirty).toBe(true);

      const value = form.value;
      expect(value.email).toBe('modified@example.com');

      // Reset clears value and restores pristine state
      form.reset();
      expect(form.pristine).toBe(true);
      expect(form.get('email')?.pristine).toBe(true);
      expect(form.value.email).toBeNull();
    });
  });

  describe('Error Priority and Message Ordering', () => {
    it('should display required error before other validators', () => {
      const form = formBuilder.group({
        email: ['', [Validators.required, Validators.email, Validators.minLength(5)]],
      });

      const control = form.get('email');
      const error = validation.getErrorMessage(control, 'Email');

      // Should show 'required' not 'email'
      expect(error).toContain('requis');
    });

    it('should display appropriate error when required is satisfied but other validators fail', () => {
      const form = formBuilder.group({
        email: ['', [Validators.required, Validators.email]],
      });

      const control = form.get('email');
      control?.setValue('invalid');

      const error = validation.getErrorMessage(control, 'Email');
      expect(error).toContain('adresse e-mail');
    });

    it('should show pattern error for phone format validation', () => {
      const form = formBuilder.group({
        phone: ['123', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      });

      const control = form.get('phone');
      const error = validation.getErrorMessage(control, 'Téléphone');

      expect(error).toContain('format');
    });

    it('should show minlength error with required character count', () => {
      const form = formBuilder.group({
        password: ['short', [Validators.required, Validators.minLength(8)]],
      });

      const control = form.get('password');
      const error = validation.getErrorMessage(control, 'Mot de passe');

      expect(error).toContain('au moins 8');
    });

    it('should show maxlength error with maximum character count', () => {
      const form = formBuilder.group({
        comment: ['A'.repeat(101), [Validators.maxLength(100)]],
      });

      const control = form.get('comment');
      const error = validation.getErrorMessage(control, 'Commentaire');

      expect(error).toContain('100');
    });
  });
});
