import { Component, OnInit, OnDestroy, inject, signal, computed, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminService, LogEntry } from '../../core/services/admin.service';
import { FormatService } from '../../core/services/format.service';
import { IntervalManager } from '../../core/services/interval.manager';
import { NotificationService } from '../../core/services/notification.service';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [DecimalPipe, PageLayoutComponent, LoadingStateComponent],
  templateUrl: './logs.component.html',
  styleUrl: './logs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogsComponent implements OnInit, OnDestroy {
  private readonly svc             = inject(AdminService);
  private readonly format          = inject(FormatService);
  private readonly notify          = inject(NotificationService);
  private readonly destroyRef      = inject(DestroyRef);
  private readonly intervalManager = inject(IntervalManager);

  readonly loading       = signal(true);
  readonly error         = signal<string | null>(null);
  readonly entries       = signal<LogEntry[]>([]);
  readonly stats         = signal<{ file_size_human: string; total_lines: number } | null>(null);
  readonly selectedLevel = signal<string | null>(null);
  readonly selectedLines = signal(100);
  readonly autoRefresh   = signal(false);

  readonly filteredEntries = computed(() => {
    const lvl = this.selectedLevel();
    return lvl ? this.entries().filter(e => e.level === lvl) : this.entries();
  });

  readonly errorCount = computed(() => this.entries().filter(e => e.level === 'ERROR').length);
  readonly warnCount  = computed(() => this.entries().filter(e => e.level === 'WARNING').length);

  readonly levelOptions = [
    { label: 'Tous',    value: null },
    { label: 'INFO',    value: 'INFO' },
    { label: 'WARNING', value: 'WARNING' },
    { label: 'ERROR',   value: 'ERROR' },
  ];

  readonly linesOptions = [50, 100, 200, 500];

  ngOnInit(): void  { this.load(); }
  ngOnDestroy(): void { this.stopRefresh(); }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.svc.getLogs(this.selectedLines(), this.selectedLevel() ?? undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: r => {
          this.entries.set(r.entries);
          this.stats.set(r.stats);
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          const msg = err?.error?.detail ?? 'Impossible de charger les logs';
          this.error.set(msg);
          this.notify.error(msg);
        },
      });
  }

  toggleAutoRefresh(): void {
    this.autoRefresh() ? this.stopRefresh() : this.startRefresh();
  }

  private startRefresh(): void {
    this.autoRefresh.set(true);
    this.intervalManager.setInterval('logs-refresh', () => this.load(), 15000);
  }

  private stopRefresh(): void {
    this.autoRefresh.set(false);
    this.intervalManager.clearInterval('logs-refresh');
  }

  scrollTo(pos: 'top' | 'bottom'): void {
    const el = document.querySelector('.logs-body');
    if (el) el.scrollTop = pos === 'top' ? 0 : el.scrollHeight;
  }

  levelClass(level: string): string {
    return this.format.getStatusClass(level, 'log-level');
  }
}
