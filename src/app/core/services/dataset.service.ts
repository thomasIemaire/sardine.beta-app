import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── API types ─────────────────────────────────────────────────────────────────

export type DatasetStatus = 'draft' | 'in_progress' | 'ready';

export type ApiDocumentType = 'invoice' | 'invoice_continuation' | 'payslip' | null;

export type ApiZoneType = 'text' | 'image' | 'table';

export interface ApiZone {
  id: string;
  type: ApiZoneType;
  /** Percentage 0–100, origin top-left */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ApiPage {
  id: string;
  file_id: string;
  original_filename: string;
  page_number: number;
  processed: boolean;
  document_type: ApiDocumentType;
  zone_count?: number;
  zones?: ApiZone[];
}

export interface ApiFile {
  id: string;
  original_filename: string;
}

export interface ApiDataset {
  id: string;
  name: string;
  status: DatasetStatus;
  page_count?: number;
  processed_count?: number;
  file_count?: number;
  files?: ApiFile[];
  pages?: ApiPage[];
  created_at: string;
  updated_at: string;
}

export interface ApiImportResult {
  original_filename: string;
  pages_created: number;
  dataset_status: DatasetStatus;
}

export interface ApiPagesResponse {
  total: number;
  page: number;
  limit: number;
  data: ApiPage[];
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class DatasetService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  private url(orgId: string, ...segments: string[]): string {
    const parts = [this.base, 'organizations', orgId, 'datasets', ...segments].filter(Boolean);
    return parts.join('/');
  }

  // ── Datasets ────────────────────────────────────────────────────────────────

  createDataset(orgId: string, name: string): Observable<ApiDataset> {
    return this.http.post<ApiDataset>(this.url(orgId), { name });
  }

  listDatasets(orgId: string): Observable<ApiDataset[]> {
    return this.http.get<ApiDataset[]>(this.url(orgId));
  }

  getDataset(orgId: string, datasetId: string): Observable<ApiDataset> {
    return this.http.get<ApiDataset>(this.url(orgId, datasetId));
  }

  renameDataset(orgId: string, datasetId: string, name: string): Observable<ApiDataset> {
    return this.http.patch<ApiDataset>(this.url(orgId, datasetId), { name });
  }

  deleteDataset(orgId: string, datasetId: string): Observable<void> {
    return this.http.delete<void>(this.url(orgId, datasetId));
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  importFile(orgId: string, datasetId: string, file: File): Observable<ApiImportResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ApiImportResult>(this.url(orgId, datasetId, 'import'), form);
  }

  // ── Pages ───────────────────────────────────────────────────────────────────

  listPages(
    orgId: string,
    datasetId: string,
    params?: { processed?: boolean; filename?: string; page?: number; limit?: number },
  ): Observable<ApiPagesResponse> {
    let httpParams = new HttpParams();
    if (params?.processed !== undefined) httpParams = httpParams.set('processed', String(params.processed));
    if (params?.filename)                httpParams = httpParams.set('filename', params.filename);
    if (params?.page !== undefined)      httpParams = httpParams.set('page', String(params.page));
    if (params?.limit !== undefined)     httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<ApiPagesResponse>(this.url(orgId, datasetId, 'pages'), { params: httpParams });
  }

  getPage(orgId: string, datasetId: string, pageId: string): Observable<ApiPage> {
    return this.http.get<ApiPage>(this.url(orgId, datasetId, 'pages', pageId));
  }

  /** Fetch the raw PDF binary for a single page */
  getPageBinary(orgId: string, datasetId: string, pageId: string): Observable<ArrayBuffer> {
    return this.http.get(this.url(orgId, datasetId, 'pages', pageId, 'binary'), {
      responseType: 'arraybuffer',
    });
  }

  /** Mark a page as processed and/or set its document type */
  updatePage(
    orgId: string,
    datasetId: string,
    pageId: string,
    body: { processed?: boolean; document_type?: ApiDocumentType },
  ): Observable<ApiPage> {
    return this.http.patch<ApiPage>(this.url(orgId, datasetId, 'pages', pageId), body);
  }

  // ── Zones ───────────────────────────────────────────────────────────────────

  /** Full replacement — send the complete zone list ([] to clear) */
  saveZones(
    orgId: string,
    datasetId: string,
    pageId: string,
    zones: Omit<ApiZone, 'id'>[],
  ): Observable<{ zones: ApiZone[] }> {
    return this.http.put<{ zones: ApiZone[] }>(
      this.url(orgId, datasetId, 'pages', pageId, 'zones'),
      { zones },
    );
  }

  // ── Export ──────────────────────────────────────────────────────────────────

  exportDataset(orgId: string, datasetId: string, format: 'jsonl' | 'json' = 'jsonl'): Observable<Blob> {
    return this.http.get(this.url(orgId, datasetId, 'export'), {
      params: new HttpParams().set('format', format),
      responseType: 'blob',
    });
  }
}
