import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Toast } from 'primeng/toast';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Select } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';

import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { FormErrorComponent } from '../../../shared/components/form-error/form-error.component';
import { UsersService } from '../../../core/services/users.service';
import { AuthService } from '../../../core/services/auth.service';
import { RoleService } from '../../../core/services/role.service';
import { DistributorService } from '../../../core/services/distributor.service';
import { NotificationService } from '../../../core/services/notification.service';
import { FormSubmitHelper } from '../../../core/services/form-submit.helper';
import { UtilityService } from '../../../core/services/utility.service';
import { FormPrefillHelper } from '../../../core/services/form-prefill.helper';
import { FormValidationHelper } from '../../../core/services/form-validation.helper';
import { APP_CONFIG } from '../../../core/constants/app.constants';
import { User, UserCreate, UserUpdate, UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-utilisateur-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Toast, InputText, Password, Select, ToggleSwitch, StatusBadgeComponent, FormErrorComponent],
  templateUrl: './utilisateur-form.component.html',
  styleUrl: './utilisateur-form.component.scss',
})
export class UtilisateurFormComponent implements OnInit {
  private usersService      = inject(UsersService);
  private distributorService = inject(DistributorService);
  private notification      = inject(NotificationService);
  private formSubmit        = inject(FormSubmitHelper);
  private utility           = inject(UtilityService);
  private formPrefill       = inject(FormPrefillHelper);
  private fb                = inject(FormBuilder);
  private router            = inject(Router);
  private route             = inject(ActivatedRoute);
  auth                      = inject(AuthService);
  private roleService       = inject(RoleService);
  validation                = inject(FormValidationHelper);

  editingId: number | null = null;
  saving = false;
  distributors: any[] = [];

  get distributeurOptions() {
    return [
      { label: '— Aucune restriction —', value: null },
      ...this.distributors.map(d => ({ label: `${d.code} - ${d.nom}`, value: d.id })),
    ];
  }

  private readonly allRoleOptions = [
    { label: '🔑 Platform Admin',      value: 'platform_admin',     adminOnly: true  },
    { label: '📦 Distributor Admin',   value: 'distributor_admin',  adminOnly: true  },
    { label: '👮 Superviseur',         value: 'superviseur',        adminOnly: true  },
    { label: '🚚 Prévendeur',          value: 'prevendeur',         adminOnly: false },
  ];

  get roleOptions() {
    return this.roleService.isAdmin()
      ? this.allRoleOptions
      : this.allRoleOptions.filter(r => !r.adminOnly);
  }

  readonly roleBadgeMap: Record<string, string> = {
    platform_admin:    'badge badge--danger',
    distributor_admin: 'badge badge--warning',
    superviseur:       'badge badge--secondary',
    prevendeur:        'badge badge--info',
  };

  private readonly roleIcons: Record<string, string> = {
    platform_admin:    'pi-shield-alt',
    distributor_admin: 'pi-building',
    superviseur:       'pi-users',
    prevendeur:        'pi-send',
  };

  get currentRole(): string { return this.form.get('role')?.value ?? 'superviseur'; }
  get roleIcon(): string    { return this.roleIcons[this.currentRole]  ?? 'pi-user'; }

  form = this.fb.group({
    phone:            ['', [Validators.required, (c: AbstractControl) => this.utility.isValidPhone(c.value ?? '') ? null : { invalidPhone: true }]],
    full_name:        ['', Validators.required],
    password:         [''],
    role:             ['superviseur' as UserRole, Validators.required],
    is_active:        [true],
    employe_code:     [null as string | null],
    distributor_id:   [null as number | null],
  });

  ngOnInit() {
    this.formSubmit.load(
      this.distributorService.listDistributors(),
      () => {}, // No loading state needed for this
      {
        onSuccess: (dists) => {
          this.distributors = dists;
        },
        errorMessage: 'Impossible de charger les distributeurs',
      }
    );

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.editingId = +idParam;
      const state = history.state as { utilisateur?: User };
      if (state?.utilisateur) {
        const u = state.utilisateur;
        this.form.patchValue({
          phone: u.phone,
          full_name: u.full_name,
          role: u.role,
          is_active: u.is_active,
          password: '',
          employe_code: u.employe_code ?? null,
          distributor_id: u.distributor_id ?? null,
        });
      } else {
        this.router.navigate(['/utilisateurs']);
      }
    } else {
      this.form.get('password')!.setValidators(Validators.required);
      this.form.get('password')!.updateValueAndValidity();
      let prefill = (history.state as any)?.prefill;
      if (!prefill) {
        prefill = this.formPrefill.loadFormState('utilisateur_prefill');
        if (prefill) this.formPrefill.clearFormState('utilisateur_prefill');
      }
      if (prefill) {
        this.form.patchValue({
          full_name:    prefill.full_name    ?? '',
          employe_code: prefill.employe_code ?? null,
          role:         prefill.role         ?? 'superviseur',
        });
      }
    }
  }

  save() {
    const v = this.form.value;

    if (this.editingId) {
      const body: UserUpdate = {
        full_name: v.full_name!,
        phone: v.phone!,
        role: v.role as UserRole,
        is_active: v.is_active!,
        employe_code: v.employe_code || null,
        distributor_id: v.distributor_id || null,
      };
      if (v.password) body.password = v.password;
      this.formSubmit.submit(
        this.form,
        (saving) => (this.saving = saving),
        this.usersService.update(this.editingId, body),
        {
          successMessage: 'Utilisateur modifié',
          navigateTo: '/utilisateurs',
          navigateDelay: APP_CONFIG.NAVIGATION_DELAY,
        }
      );
    } else {
      const body: UserCreate = {
        phone: v.phone!,
        full_name: v.full_name!,
        password: v.password!,
        role: v.role as UserRole,
        employe_code: v.employe_code || null,
        distributor_id: v.distributor_id || null,
      };
      this.formSubmit.submit(
        this.form,
        (saving) => (this.saving = saving),
        this.usersService.create(body),
        {
          successMessage: 'Utilisateur créé',
          navigateTo: '/utilisateurs',
          navigateDelay: APP_CONFIG.NAVIGATION_DELAY,
        }
      );
    }
  }

  cancel() { this.router.navigate(['/utilisateurs']); }
}
