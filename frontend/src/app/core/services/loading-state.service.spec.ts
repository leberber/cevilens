import { TestBed } from '@angular/core/testing';
import { LoadingStateService } from './loading-state.service';
import { signal } from '@angular/core';

describe('LoadingStateService', () => {
  let service: LoadingStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LoadingStateService],
    });
    service = TestBed.inject(LoadingStateService);
  });

  describe('create', () => {
    it('should create a signal initialized to false', () => {
      const loading = service.create();
      expect(loading()).toBe(false);
    });

    it('should return a writable signal', () => {
      const loading = service.create();
      loading.set(true);
      expect(loading()).toBe(true);
    });

    it('should create independent signals', () => {
      const loading1 = service.create();
      const loading2 = service.create();
      loading1.set(true);
      expect(loading1()).toBe(true);
      expect(loading2()).toBe(false);
    });
  });

  describe('createMultiple', () => {
    it('should create multiple signals with given keys', () => {
      const states = service.createMultiple('main', 'items', 'details');
      expect(Object.keys(states).length).toBe(3);
      expect(states['main']).toBeDefined();
      expect(states['items']).toBeDefined();
      expect(states['details']).toBeDefined();
    });

    it('should initialize all signals to false', () => {
      const states = service.createMultiple('a', 'b', 'c');
      expect(states['a']()).toBe(false);
      expect(states['b']()).toBe(false);
      expect(states['c']()).toBe(false);
    });

    it('should create independent signals for each key', () => {
      const states = service.createMultiple('x', 'y');
      states['x'].set(true);
      expect(states['x']()).toBe(true);
      expect(states['y']()).toBe(false);
    });

    it('should return empty object for no keys', () => {
      const states = service.createMultiple();
      expect(Object.keys(states).length).toBe(0);
    });

    it('should handle single key', () => {
      const states = service.createMultiple('single');
      expect(Object.keys(states).length).toBe(1);
      expect(states['single']()).toBe(false);
    });
  });

  describe('createWithValue', () => {
    it('should create signal initialized to true', () => {
      const loading = service.createWithValue(true);
      expect(loading()).toBe(true);
    });

    it('should create signal initialized to false', () => {
      const loading = service.createWithValue(false);
      expect(loading()).toBe(false);
    });

    it('should allow updating initial value', () => {
      const loading = service.createWithValue(true);
      loading.set(false);
      expect(loading()).toBe(false);
    });

    it('should toggle initial value', () => {
      const loading = service.createWithValue(false);
      loading.update(v => !v);
      expect(loading()).toBe(true);
    });
  });

  describe('combine', () => {
    it('should return false when all states are false', () => {
      const s1 = signal(false);
      const s2 = signal(false);
      const s3 = signal(false);
      const combined = service.combine(s1, s2, s3);
      expect(combined()).toBe(false);
    });

    it('should return true when any state is true', () => {
      const s1 = signal(false);
      const s2 = signal(true);
      const s3 = signal(false);
      const combined = service.combine(s1, s2, s3);
      expect(combined()).toBe(true);
    });

    it('should return true when all states are true', () => {
      const s1 = signal(true);
      const s2 = signal(true);
      const s3 = signal(true);
      const combined = service.combine(s1, s2, s3);
      expect(combined()).toBe(true);
    });

    it('should return false for empty array', () => {
      const combined = service.combine();
      expect(combined()).toBe(false);
    });

    it('should update when source signal changes', () => {
      const s1 = signal(false);
      const s2 = signal(false);
      const combined = service.combine(s1, s2);
      expect(combined()).toBe(false);

      s1.set(true);
      expect(combined()).toBe(true);

      s1.set(false);
      s2.set(true);
      expect(combined()).toBe(true);

      s2.set(false);
      expect(combined()).toBe(false);
    });

    it('should handle single signal', () => {
      const s1 = signal(false);
      const combined = service.combine(s1);
      expect(combined()).toBe(false);

      s1.set(true);
      expect(combined()).toBe(true);
    });

    it('should handle multiple updates', () => {
      const states = service.createMultiple('a', 'b', 'c');
      const combined = service.combine(states['a'], states['b'], states['c']);

      states['a'].set(true);
      expect(combined()).toBe(true);

      states['b'].set(true);
      expect(combined()).toBe(true);

      states['c'].set(true);
      expect(combined()).toBe(true);

      states['a'].set(false);
      expect(combined()).toBe(true);

      states['b'].set(false);
      expect(combined()).toBe(true);

      states['c'].set(false);
      expect(combined()).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle typical loading flow', () => {
      const loading = service.create();
      expect(loading()).toBe(false);

      loading.set(true);
      expect(loading()).toBe(true);

      loading.set(false);
      expect(loading()).toBe(false);
    });

    it('should handle form with main and field-level loading', () => {
      const { main, fieldEmail, fieldPhone } = service.createMultiple('main', 'fieldEmail', 'fieldPhone');
      const anyFieldLoading = service.combine(fieldEmail, fieldPhone);

      expect(main()).toBe(false);
      expect(anyFieldLoading()).toBe(false);

      fieldEmail.set(true);
      expect(anyFieldLoading()).toBe(true);
      expect(main()).toBe(false);

      main.set(true);
      expect(anyFieldLoading()).toBe(true);
      expect(main()).toBe(true);
    });

    it('should handle batch operations with combine', () => {
      const { load, save, delete: del } = service.createMultiple('load', 'save', 'delete');
      const anyOperation = service.combine(load, save, del);

      load.set(true);
      expect(anyOperation()).toBe(true);

      load.set(false);
      save.set(true);
      expect(anyOperation()).toBe(true);

      save.set(false);
      del.set(true);
      expect(anyOperation()).toBe(true);

      del.set(false);
      expect(anyOperation()).toBe(false);
    });
  });
});
