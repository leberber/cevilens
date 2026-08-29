import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

interface UploadResult { success: boolean; message: string; }
interface OverlapInfo { overlap_min: string; overlap_max: string; overlap_count: number; }
interface FileInfo { total_rows: number; date_min: string; date_max: string; }

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './upload.component.html',
})
export class UploadComponent {
  private auth = inject(AuthService);

  @Input() selectedCanal: 'VD' | 'VH' | null = null;

  uploadType: 'ventes' | 'objectifs' = 'ventes';
  uploadCanal: 'VD' | 'VH' | null = null;
  autoUpload: boolean = true;
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
    this.loading.set(true);
    this.result.set(null);
    this.overlap.set(null);
    this.fileInfo.set(null);
    this.progress.set(0);
    this.progressMessage.set('');
    this.streamUpload(file, mode);
  }

  private async streamUpload(file: File, mode?: string) {
    const formData = new FormData();
    formData.append('file', file);

    let url: string;
    if (this.uploadType === 'objectifs') {
      url = `/api/v1/objectifs/upload?canal=${this.uploadCanal}`;
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

  private handleEvent(data: any) {
    if (data.error) {
      this.loading.set(false);
      this.result.set({ success: false, message: data.error });
      return;
    }
    if (data.type === 'overlap') {
      this.loading.set(false);
      this.overlap.set(data);
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
      this.result.set({ success: true, message: data.message });
    }
  }

  uploadObjectives(canal: 'VD' | 'VH') {
    const file = this.selectedFile() || this.pendingFile;
    if (file) {
      this.uploadType = 'objectifs';
      this.uploadCanal = canal;
      this.pendingFile = file;
      this.loading.set(true);
      this.result.set(null);
      this.overlap.set(null);
      this.fileInfo.set(null);
      this.progress.set(0);
      this.progressMessage.set('');
      this.streamUpload(file);
    }
  }

  skip()    { if (this.pendingFile) this.startUpload(this.pendingFile, 'skip'); }
  replace() { if (this.pendingFile) this.startUpload(this.pendingFile, 'replace'); }
  cancel()  { this.overlap.set(null); this.pendingFile = null; }
}
