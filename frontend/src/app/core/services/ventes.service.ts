import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpParamsBuilder } from './http-params.builder';

export interface VenteRead {
  id: number;
  annee_mois: string;
  date_commande: string | null;
  num_commande: string | null;
  type_commande: string | null;
  source: string | null;
  code_client: string | null;
  nom_client: string | null;
  categorie_client: string | null;
  adresse_client: string | null;
  route: string | null;
  commune: string | null;
  wilaya: string | null;
  zone: string | null;
  region: string | null;
  tel_client: string | null;
  type_client: string | null;
  code_fdv: string | null;
  nom_fdv: string | null;
  canal: string | null;
  code_distributeur: string | null;
  nom_distributeur: string | null;
  buid: string | null;
  depot_livraison: string | null;
  statut_commande: string | null;
  date_creation: string | null;
  date_confirmation: string | null;
  date_facturation: string | null;
  code_livreur: string | null;
  nom_livreur: string | null;
  matricule_van: string | null;
  code_produit: string | null;
  description_produit: string | null;
  famille: string | null;
  sous_famille: string | null;
  uom_vente: string | null;
  cout_produit: number | null;
  prix_unitaire: number | null;
  uom_principale: string | null;
  prix_unitaire_uom_pr: number | null;
  qte_commandee: number | null;
  qte_chargee: number | null;
  qte_livree: number | null;
  qte_facturee: number | null;
  total_commande: number | null;
  total_facture: number | null;
  total_remise: number | null;
  gratuite: number | null;
}

export interface VentePage {
  total: number;
  items: VenteRead[];
}


export interface UploadResponse {
  lignes: number;
  annee_mois: string;
  message: string;
}

export interface DateRange {
  min_date: string | null;
  max_date: string | null;
}

export interface VenteListParams {
  page?: number;
  per_page?: number;
  annee_mois?: string;
  date_from?: string;
  date_to?: string;
  date_commande?: string;
  famille?: string;
  sous_famille?: string;
  type_commande?: string;
  categorie_client?: string;
  statut_commande?: string;
  wilaya?: string;
  zone?: string;
  region?: string;
  source?: string;
  canal?: string;
  route?: string;
  nom_fdv?: string;
  nom_livreur?: string;
  nom_distributeur?: string;
  nom_client?: string;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class VentesService {
  private http = inject(HttpClient);
  private paramsBuilder = inject(HttpParamsBuilder);

  list(params: VenteListParams = {}) {
    const p = this.paramsBuilder.build(params);
    return this.http.get<VentePage>('/api/v1/ventes', { params: p });
  }

  getDateRange() {
    return this.http.get<DateRange>('/api/v1/ventes/date-range');
  }

  getPeriodes() {
    return this.http.get<string[]>('/api/v1/ventes/periodes');
  }

  getFamilles(date_from?: string, date_to?: string) {
    const p = this.paramsBuilder.build({ date_from, date_to });
    return this.http.get<string[]>('/api/v1/ventes/familles', { params: p });
  }

  getFdvs(date_from?: string, date_to?: string) {
    const p = this.paramsBuilder.build({ date_from, date_to });
    return this.http.get<string[]>('/api/v1/ventes/fdvs', { params: p });
  }

  getClients(date_from?: string, date_to?: string, nom_fdv?: string) {
    const p = this.paramsBuilder.build({ date_from, date_to, nom_fdv });
    return this.http.get<string[]>('/api/v1/ventes/clients', { params: p });
  }

  getClientNames() {
    return this.http.get<string[]>('/api/v1/ventes/client-names');
  }

  getDistinct(field: string, date_from?: string, date_to?: string, search?: string) {
    const p = this.paramsBuilder.build({ date_from, date_to, search });
    return this.http.get<string[]>(`/api/v1/ventes/distinct/${field}`, { params: p });
  }

  upload(file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<UploadResponse>('/api/v1/ventes/upload', form);
  }

}
