import { Injectable } from '@angular/core';

/**
 * Helper service for file upload operations
 * Consolidates repeated FormData construction and file handling
 */
@Injectable({
  providedIn: 'root',
})
export class FileUploadHelper {
  /**
   * Create FormData with file
   */
  createFormData(file: File): FormData {
    const formData = new FormData();
    formData.append('file', file);
    return formData;
  }

  /**
   * Create FormData with file and additional fields
   */
  createFormDataWithFields(
    file: File,
    fields?: Record<string, string | number | boolean>
  ): FormData {
    const formData = new FormData();
    formData.append('file', file);

    if (fields) {
      for (const [key, value] of Object.entries(fields)) {
        formData.append(key, String(value));
      }
    }

    return formData;
  }

  /**
   * Create FormData with multiple files
   */
  createFormDataWithFiles(
    files: File[] | FileList,
    fieldName = 'files'
  ): FormData {
    const formData = new FormData();
    const fileArray = Array.from(files);
    fileArray.forEach((file) => {
      formData.append(fieldName, file);
    });
    return formData;
  }

  /**
   * Validate file before upload
   */
  validateFile(
    file: File,
    maxSizeMB?: number,
    allowedTypes?: string[]
  ): { valid: boolean; error?: string } {
    if (maxSizeMB) {
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        return {
          valid: false,
          error: `File size must be less than ${maxSizeMB}MB`,
        };
      }
    }

    if (allowedTypes && allowedTypes.length > 0) {
      if (!allowedTypes.includes(file.type)) {
        return {
          valid: false,
          error: `File type ${file.type} not allowed`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Get file extension
   */
  getExtension(filename: string): string {
    return filename.split('.').pop() || '';
  }

  /**
   * Get file size in human-readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
