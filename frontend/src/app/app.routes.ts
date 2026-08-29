import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { authGuard, adminOrEmployeGuard, adminGuard, rootGuard, prevenderOnlyGuard, notPrevenderGuard, platformAdminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', canActivate: [rootGuard], children: [] },
      { path: 'dashboard',         canActivate: [notPrevenderGuard], loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'analytics',         canActivate: [notPrevenderGuard], loadComponent: () => import('./pages/analytics/analytics.component').then(m => m.AnalyticsComponent) },
      { path: 'carte',             canActivate: [notPrevenderGuard], loadComponent: () => import('./pages/geo-explorer/geo-explorer.component').then(m => m.GeoExplorerComponent) },
      { path: 'admin',             canActivate: [platformAdminGuard], loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'distributors',      canActivate: [platformAdminGuard], loadComponent: () => import('./pages/distributors/distributors.component').then(m => m.DistributorsComponent) },

      { path: 'ventes',   canActivate: [adminOrEmployeGuard], loadComponent: () => import('./pages/ventes/ventes.component').then(m => m.VentesComponent) },
      { path: 'rapport-facturation',   canActivate: [adminOrEmployeGuard], loadComponent: () => import('./pages/rapport-facturation/rapport-facturation.component').then(m => m.RapportFacturationComponent) },
      { path: 'upload',   canActivate: [adminOrEmployeGuard], loadComponent: () => import('./pages/upload/upload.component').then(m => m.UploadComponent) },

      { path: 'utilisateurs',              canActivate: [adminOrEmployeGuard], loadComponent: () => import('./pages/utilisateurs/utilisateurs.component').then(m => m.UtilisateursComponent) },
      { path: 'utilisateurs/nouveau',      canActivate: [adminOrEmployeGuard], loadComponent: () => import('./pages/utilisateurs/utilisateur-form/utilisateur-form.component').then(m => m.UtilisateurFormComponent) },
      { path: 'utilisateurs/:id/modifier', canActivate: [adminGuard],          loadComponent: () => import('./pages/utilisateurs/utilisateur-form/utilisateur-form.component').then(m => m.UtilisateurFormComponent) },

      { path: 'objectifs',    canActivate: [adminOrEmployeGuard], loadComponent: () => import('./pages/objectifs-admin/objectifs-admin.component').then(m => m.ObjectifsAdminComponent) },
      { path: 'logs',       canActivate: [platformAdminGuard],  loadComponent: () => import('./pages/logs/logs.component').then(m => m.LogsComponent) },

      { path: 'prevendeur', canActivate: [prevenderOnlyGuard], loadComponent: () => import('./pages/prevendeur/prevendeur.component').then(m => m.PrevendeurComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
