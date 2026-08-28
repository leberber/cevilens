import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LoadingManager } from '../../core/services/loading-manager.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private readonly auth           = inject(AuthService);
  private readonly router         = inject(Router);
  private readonly fb             = inject(FormBuilder);
  private readonly loadingManager = inject(LoadingManager);

  readonly loading      = signal(false);
  readonly pageReady    = signal(false);
  readonly focusedField = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly errorMsg     = signal<string | null>(null);

  form = this.fb.group({
    phone:    ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  ngOnInit() {
    setTimeout(() => this.pageReady.set(true), 80);
  }

  onFocus(field: string) { this.focusedField.set(field); this.errorMsg.set(null); }
  onBlur()               { this.focusedField.set(null); }
  togglePassword()       { this.showPassword.update(v => !v); }

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.errorMsg.set(null);
    const { phone, password } = this.form.getRawValue();
    this.loadingManager.load(
      this.loading,
      this.auth.login(phone!, password!),
      () => this.router.navigate(['/']),
      () => this.errorMsg.set('Identifiants incorrects')
    );
  }
}
