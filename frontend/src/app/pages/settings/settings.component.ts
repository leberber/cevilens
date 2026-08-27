import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { ConfigService } from '../../core/services/config.service';
import { NotificationService } from '../../core/services/notification.service';
import { FormSubmitHelper } from '../../core/services/form-submit.helper';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './settings.component.html',
})
export class SettingsComponent implements OnInit {
  private configService  = inject(ConfigService);
  private notification   = inject(NotificationService);
  private formSubmit     = inject(FormSubmitHelper);
  private fb             = inject(FormBuilder);

  loading = false;
  saving  = false;

  form = this.fb.group({
    consigne_plastique: [0, [Validators.required, Validators.min(0)]],
    consigne_bois:      [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit() {
    this.formSubmit.load(
      this.configService.get<{ consigne_plastique: number; consigne_bois: number }>('pricing'),
      (loading) => (this.loading = loading),
      {
        onSuccess: (data) => this.form.patchValue(data),
        errorMessage: 'Impossible de charger la configuration',
      }
    );
  }

  save() {
    this.formSubmit.submit(
      this.form,
      (saving) => (this.saving = saving),
      this.configService.put('pricing', this.form.value),
      {
        successMessage: 'Configuration enregistrée',
        errorMessage: 'Erreur lors de la sauvegarde',
      }
    );
  }
}
