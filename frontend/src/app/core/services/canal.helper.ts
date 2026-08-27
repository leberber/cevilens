import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CanalHelper {
  selectByCanal<T>(canal: 'VD' | 'VH', vdValue: T, vhValue: T): T {
    return canal === 'VD' ? vdValue : vhValue;
  }
}
