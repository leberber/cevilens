import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';

/**
 * Helper service for building HttpParams from objects
 * Consolidates repeated conditional param construction across services
 */
@Injectable({
  providedIn: 'root',
})
export class HttpParamsBuilder {
  /**
   * Build HttpParams from object, including only truthy values
   */
  build(obj: Record<string, any>): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(obj)) {
      if (value != null && value !== '' && value !== false) {
        params = params.set(key, String(value));
      }
    }
    return params;
  }

  /**
   * Build HttpParams from object with custom filter predicate
   */
  buildWith(
    obj: Record<string, any>,
    shouldInclude: (key: string, value: any) => boolean
  ): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(obj)) {
      if (shouldInclude(key, value)) {
        params = params.set(key, String(value));
      }
    }
    return params;
  }

  /**
   * Build HttpParams appending to existing params
   */
  append(
    existingParams: HttpParams,
    obj: Record<string, any>
  ): HttpParams {
    let params = existingParams;
    for (const [key, value] of Object.entries(obj)) {
      if (value != null && value !== '' && value !== false) {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
