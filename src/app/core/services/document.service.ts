import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpRequest, HttpEventType, HttpParams } from '@angular/common/http';
import { Observable, filter, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface ApiFolder {
  id: string;
  name: string;
  organization_id: string;
  /**
   * Arborescence réelle en base. Ne pas l'utiliser pour reconstruire
   * la navigation côté front : un dossier accessible peut avoir un
   * parent_id qui pointe sur un dossier invisible pour l'utilisateur.
   * Utiliser /contents et /breadcrumb à la place.
   */
  parent_id: string | null;
  created_at: string;
}

export interface ApiFile {
  id: string;
  name: string;
  folder_id: string;
  organization_id: string;
  current_version: number;
  mime_type: string;
  size: number;
  uploaded_by: string;
  created_at: string;
  updated_at?: string;
}

export interface ApiTrashFolder {
  id: string;
  name: string;
  deleted_at: string;
  expires_at: string;
}

export interface ApiTrashFile {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  deleted_at: string;
  expires_at: string;
}

export interface ApiBulkDeleteResult {
  files_deleted: number;
  folders_deleted: number;
  skipped: number;
  details: unknown[];
}

export interface ApiFileVersion {
  id: string;
  file_id: string;
  version_number: number;
  original_name: string;
  mime_type: string;
  size: number;
  uploaded_by: string;
  created_at: string;
}

export interface ApiFilePage {
  items: ApiFile[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UploadProgress {
  progress: number;
  done: boolean;
  result?: ApiFile;
  error?: string;
}

export type DocFileType = 'folder' | 'pdf' | 'docx' | 'xlsx' | 'png' | 'jpg' | 'txt' | 'csv' | 'file';

export function fileTypeFromMime(mimeType: string, name: string): DocFileType {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType?.includes('word')) return 'docx';
  if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return 'xlsx';
  if (mimeType === 'image/png') return 'png';
  if (mimeType?.includes('jpeg') || mimeType?.includes('jpg')) return 'jpg';
  if (mimeType === 'text/plain') return 'txt';
  if (mimeType === 'text/csv' || mimeType === 'application/csv') return 'csv';
  const ext = name?.split('.').pop()?.toLowerCase() ?? '';
  if (['pdf', 'docx', 'xlsx', 'png', 'jpg', 'txt', 'csv'].includes(ext)) return ext as DocFileType;
  return 'file';
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} Go`;
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = environment.apiUrl;

  // ── Folders ──────────────────────────────────────────────────────────────

  /**
   * Dossiers "top-level" accessibles à l'utilisateur.
   * Remplace l'ancien /folders/root + /contents au démarrage.
   * Pour un membre standard, ces dossiers peuvent être nichés profondément
   * dans l'arborescence réelle (leur parent_id n'est alors pas fiable).
   */
  getAccessibleFolders(orgId: string): Observable<ApiFolder[]> {
    return this.http.get<ApiFolder[]>(`${this.base}/organizations/${orgId}/folders/accessible`);
  }

  getFolderContents(orgId: string, folderId: string): Observable<ApiFolder[]> {
    return this.http.get<ApiFolder[]>(`${this.base}/organizations/${orgId}/folders/${folderId}/contents`);
  }

  getBreadcrumb(orgId: string, folderId: string): Observable<{ id: string; name: string }[]> {
    return this.http.get<{ id: string; name: string }[]>(`${this.base}/organizations/${orgId}/folders/${folderId}/breadcrumb`);
  }

  /** parent_id null = dossier de premier niveau. */
  createFolder(orgId: string, name: string, parentId: string | null): Observable<ApiFolder> {
    return this.http.post<ApiFolder>(`${this.base}/organizations/${orgId}/folders/`, { name, parent_id: parentId });
  }

  renameFolder(orgId: string, folderId: string, name: string): Observable<ApiFolder> {
    return this.http.patch<ApiFolder>(`${this.base}/organizations/${orgId}/folders/${folderId}/rename`, { name });
  }

  /** target_parent_id null = remonter au top niveau. */
  moveFolder(orgId: string, folderId: string, targetParentId: string | null): Observable<void> {
    return this.http.patch<void>(`${this.base}/organizations/${orgId}/folders/${folderId}/move`, { target_parent_id: targetParentId });
  }

  deleteFolder(orgId: string, folderId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/organizations/${orgId}/folders/${folderId}`);
  }

  getTrashFolders(orgId: string): Observable<ApiTrashFolder[]> {
    return this.http.get<ApiTrashFolder[]>(`${this.base}/organizations/${orgId}/folders/trash`);
  }

  restoreFolder(orgId: string, folderId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/organizations/${orgId}/folders/${folderId}/restore`, {});
  }

  emptyTrash(orgId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/organizations/${orgId}/folders/trash/empty`);
  }

  // ── Files ─────────────────────────────────────────────────────────────────

  getFiles(orgId: string, folderId: string, params?: { page?: number; pageSize?: number; search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }): Observable<ApiFilePage> {
    let httpParams = new HttpParams()
      .set('page', params?.page ?? 1)
      .set('page_size', params?.pageSize ?? 100);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.sortBy) httpParams = httpParams.set('sort_by', params.sortBy);
    if (params?.sortOrder) httpParams = httpParams.set('sort_order', params.sortOrder);
    return this.http.get<ApiFilePage>(`${this.base}/organizations/${orgId}/files/folders/${folderId}`, { params: httpParams });
  }

  uploadFile(orgId: string, folderId: string, file: File): Observable<UploadProgress> {
    const formData = new FormData();
    formData.append('file', file);
    const req = new HttpRequest(
      'POST',
      `${this.base}/organizations/${orgId}/files/folders/${folderId}/upload`,
      formData,
      { reportProgress: true }
    );
    return this.http.request<ApiFile>(req).pipe(
      filter(e => e.type === HttpEventType.UploadProgress || e.type === HttpEventType.Response),
      map(e => {
        if (e.type === HttpEventType.UploadProgress) {
          const progress = e.total ? Math.round(100 * e.loaded / e.total) : 0;
          return { progress, done: false };
        }
        return { progress: 100, done: true, result: (e as any).body as ApiFile };
      })
    );
  }

  uploadFiles(orgId: string, folderId: string, files: File[]): Observable<{ success: ApiFile[]; errors: { filename: string; error: string }[] }> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    return this.http.post<{ success: ApiFile[]; errors: { filename: string; error: string }[] }>(
      `${this.base}/organizations/${orgId}/files/folders/${folderId}/upload-multiple`,
      formData
    );
  }

  renameFile(orgId: string, fileId: string, name: string): Observable<ApiFile> {
    return this.http.patch<ApiFile>(`${this.base}/organizations/${orgId}/files/${fileId}/rename`, { name });
  }

  moveFile(orgId: string, fileId: string, targetFolderId: string): Observable<ApiFile> {
    return this.http.patch<ApiFile>(`${this.base}/organizations/${orgId}/files/${fileId}/move`, { target_folder_id: targetFolderId });
  }

  /** Récupère le fichier comme blob (pour prévisualisation inline via URL.createObjectURL). */
  getFileBlob(orgId: string, fileId: string): Observable<Blob> {
    return this.http.get(`${this.base}/organizations/${orgId}/files/${fileId}/download`, { responseType: 'blob' });
  }

  downloadFile(orgId: string, fileId: string, filename: string): void {
    const token = this.auth.getAccessToken();
    this.http.get(`${this.base}/organizations/${orgId}/files/${fileId}/download`, { responseType: 'blob' })
      .subscribe(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
  }

  deleteFile(orgId: string, fileId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/organizations/${orgId}/files/${fileId}`);
  }

  bulkDelete(orgId: string, fileIds: string[], folderIds: string[]): Observable<ApiBulkDeleteResult> {
    return this.http.post<ApiBulkDeleteResult>(`${this.base}/organizations/${orgId}/files/bulk-delete`, {
      file_ids: fileIds,
      folder_ids: folderIds,
    });
  }

  getTrashFiles(orgId: string): Observable<ApiTrashFile[]> {
    return this.http.get<ApiTrashFile[]>(`${this.base}/organizations/${orgId}/files/trash/list`);
  }

  restoreFile(orgId: string, fileId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/organizations/${orgId}/files/${fileId}/restore`, {});
  }

  getFileVersions(orgId: string, fileId: string): Observable<ApiFileVersion[]> {
    return this.http.get<ApiFileVersion[]>(`${this.base}/organizations/${orgId}/files/${fileId}/versions`);
  }
}
