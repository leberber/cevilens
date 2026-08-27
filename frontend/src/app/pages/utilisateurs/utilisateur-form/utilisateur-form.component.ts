import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Toast } from 'primeng/toast';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Select } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { MessageService } from 'primeng/api';

import { UsersService } from '../../../core/services/users.service';
import { AuthService } from '../../../core/services/auth.service';
import { VentesService } from '../../../core/services/ventes.service';
import { DistributorService } from '../../../core/services/distributor.service';
import { User, UserCreate, UserUpdate, UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-utilisateur-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Toast, InputText, Password, Select, ToggleSwitch],
  providers: [MessageService],
  templateUrl: './utilisateur-form.component.html',
})
export class UtilisateurFormComponent implements OnInit {
  private usersService      = inject(UsersService);
  private ventesService     = inject(VentesService);
  private distributorService = inject(DistributorService);
  private messageService    = inject(MessageService);
  private fb                = inject(FormBuilder);
  private router            = inject(Router);
  private route             = inject(ActivatedRoute);
  auth                      = inject(AuthService);

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
    return this.auth.isAdmin
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

  private readonly roleLabels: Record<string, string> = {
    platform_admin:    'Platform Admin',
    distributor_admin: 'Distributor Admin',
    superviseur:       'Superviseur',
    prevendeur:        'Prévendeur',
  };

  get currentRole(): string { return this.form.get('role')?.value ?? 'superviseur'; }
  get roleIcon(): string    { return this.roleIcons[this.currentRole]  ?? 'pi-user'; }
  get roleBadgeClass(): string { return this.roleBadgeMap[this.currentRole] ?? 'badge'; }
  get roleDisplayLabel(): string { return this.roleLabels[this.currentRole] ?? ''; }

  form = this.fb.group({
    phone:            ['', Validators.required],
    full_name:        ['', Validators.required],
    password:         [''],
    role:             ['superviseur' as UserRole, Validators.required],
    is_active:        [true],
    employe_code:     [null as string | null],
    distributor_id:   [null as number | null],
  });

  ngOnInit() {
    this.distributorService.listDistributors().subscribe({
      next: (dists) => {
        console.log('Distributors loaded:', dists);
        this.distributors = dists;
      },
      error: (err) => {
        console.error('Failed to load distributors:', err);
        this.messageService.add({ severity: 'warn', summary: 'Avertissement', detail: 'Impossible de charger les distributeurs', life: 3000 });
      },
    });

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
        const stored = sessionStorage.getItem('utilisateur_prefill');
        if (stored) {
          prefill = JSON.parse(stored);
          sessionStorage.removeItem('utilisateur_prefill');
        }
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
    if (this.form.invalid) return;
    this.saving = true;
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
      this.usersService.update(this.editingId, body).subscribe({
        next: () => this.done('Utilisateur modifié'),
        error: e => this.err(e),
      });
    } else {
      const body: UserCreate = {
        phone: v.phone!,
        full_name: v.full_name!,
        password: v.password!,
        role: v.role as UserRole,
        employe_code: v.employe_code || null,
        distributor_id: v.distributor_id || null,
      };
      this.usersService.create(body).subscribe({
        next: () => this.done('Utilisateur créé'),
        error: e => this.err(e),
      });
    }
  }

  private done(detail: string) {
    this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 3000 });
    setTimeout(() => this.router.navigate(['/utilisateurs']), 1000);
  }

  private err(e: any) {
    this.saving = false;
    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: e.error?.detail ?? 'Erreur', life: 4000 });
  }

  cancel() { this.router.navigate(['/utilisateurs']); }
}
