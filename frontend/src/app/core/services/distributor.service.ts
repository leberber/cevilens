import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Distributor } from '../models/distributor.model';

@Injectable({
  providedIn: 'root'
})
export class DistributorService {
  private apiUrl = '/api/v1/distributors';

  constructor(private http: HttpClient) {}

  listDistributors(): Observable<Distributor[]> {
    return this.http.get<Distributor[]>(this.apiUrl);
  }

  getDistributor(id: number): Observable<Distributor> {
    return this.http.get<Distributor>(`${this.apiUrl}/${id}`);
  }
}
