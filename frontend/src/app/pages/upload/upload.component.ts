import { ChangeDetectionStrategy, Component, Input, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

interface UploadResult { success: boolean; message: string; }
interface OverlapInfo { overlap_min: string; overlap_max: string; overlap_count: number; }
interface FileInfo { total_rows: number; date_min: string; date_max: string; }
interface StreamEvent {
  error?: string;
  type?: string;
  file_info?: FileInfo;
  progress?: number;
  message?: string;
  done?: boolean;
  overlap_min?: string;
  overlap_max?: string;
  overlap_count?: number;
}

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './upload.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadComponent {
  private readonly auth = inject(AuthService);

  @Input() selectedCanal: 'VD' | 'VH' | null = null;
  @Input() autoUpload: boolean = true;
  @Input() successStyle: 'banner' | 'overlay' = 'banner';

  uploadType: 'ventes' | 'objectifs' = 'ventes';
  uploadCanal: 'VD' | 'VH' | null = null;
  selectedFile = signal<File | null>(null);

  dragOver        = signal(false);
  loading         = signal(false);
  progress        = signal(0);
  progressMessage = signal('');
  result          = signal<UploadResult | null>(null);
  overlap         = signal<OverlapInfo | null>(null);
  fileInfo        = signal<FileInfo | null>(null);
  private pendingFile: File | null = null;

  onDragOver(e: DragEvent)  { e.preventDefault(); this.dragOver.set(true); }
  onDragLeave()             { this.dragOver.set(false); }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragOver.set(false);
    const file = e.dataTransfer?.files[0];
    if (file) {
      if (this.autoUpload) {
        this.startUpload(file);
      } else {
        this.selectedFile.set(file);
      }
    }
  }

  onFileSelect(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      if (this.autoUpload) {
        this.startUpload(file);
      } else {
        this.selectedFile.set(file);
      }
    }
    (e.target as HTMLInputElement).value = '';
  }

  private startUpload(file: File, mode?: string) {
    this.pendingFile = file;
    this.resetUploadState();
    this.streamUpload(file, mode);
  }

  private resetUploadState() {
    this.loading.set(true);
    this.result.set(null);
    this.overlap.set(null);
    this.fileInfo.set(null);
    this.progress.set(0);
    this.progressMessage.set('');
  }

  private async streamUpload(file: File, mode?: string, distributorId?: number, routeCount?: number) {
    const formData = new FormData();
    formData.append('file', file);

    let url: string;
    if (this.uploadType === 'objectifs') {
      url = `/api/v1/objectifs/upload?canal=${this.uploadCanal}&route_count=${routeCount ?? 1}`;
      if (distributorId) {
        url += `&distributor_id=${distributorId}`;
      }
    } else {
      url = mode ? `/api/v1/ventes/upload?mode=${mode}` : '/api/v1/ventes/upload';
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.auth.token}` },
        body: formData,
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try { this.handleEvent(JSON.parse(line.slice(6))); } catch {}
        }
      }
    } catch {
      this.loading.set(false);
      this.result.set({ success: false, message: "Erreur de connexion" });
    }
  }

  private handleEvent(data: StreamEvent) {
    if (data.error) {
      this.loading.set(false);
      this.result.set({ success: false, message: data.error });
      return;
    }
    if (data.type === 'overlap' && data.overlap_min && data.overlap_max && data.overlap_count !== undefined) {
      this.loading.set(false);
      this.overlap.set({ overlap_min: data.overlap_min, overlap_max: data.overlap_max, overlap_count: data.overlap_count });
      return;
    }
    if (data.file_info) {
      this.fileInfo.set(data.file_info);
    }
    if (data.progress !== undefined) {
      this.progress.set(data.progress);
      this.progressMessage.set(data.message ?? '');
    }
    if (data.done) {
      this.loading.set(false);
      this.result.set({ success: true, message: data.message ?? '' });
    }
  }

  async previewObjectifsFile(canal: 'VD' | 'VH'): Promise<{ mois: number; annee: number; rowCount: number; headers: string[]; products: Record<string, unknown>[] } | null> {
    const file = this.selectedFile() || this.pendingFile;
    if (!file) return null;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/v1/objectifs/preview?canal=${canal}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.auth.token}` },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        this.result.set({ success: false, message: error || 'Erreur lors de la lecture du fichier' });
        return null;
      }

      const preview = await response.json();

      if (preview.error) {
        this.result.set({ success: false, message: preview.error });
        return null;
      }

      return {
        mois: preview.mois,
        annee: preview.annee,
        rowCount: preview.rowCount,
        headers: preview.headers || [],
        products: preview.products || [],
      };
    } catch {
      this.result.set({ success: false, message: 'Erreur de connexion lors de la lecture du fichier' });
      return null;
    }
  }

  uploadObjectives(canal: 'VD' | 'VH', distributorId?: number, routeCount?: number) {
    const file = this.selectedFile() || this.pendingFile;
    if (file) {
      this.uploadType = 'objectifs';
      this.uploadCanal = canal;
      this.pendingFile = file;
      this.resetUploadState();
      this.streamUpload(file, undefined, distributorId, routeCount);
    }
  }

  skip()    { if (this.pendingFile) this.startUpload(this.pendingFile, 'skip'); }
  replace() { if (this.pendingFile) this.startUpload(this.pendingFile, 'replace'); }
  cancel()  { this.overlap.set(null); this.pendingFile = null; }

  reset() {
    this.selectedFile.set(null);
    this.result.set(null);
    this.overlap.set(null);
    this.fileInfo.set(null);
    this.loading.set(false);
    this.progress.set(0);
    this.progressMessage.set('');
    this.pendingFile = null;
  }
}
