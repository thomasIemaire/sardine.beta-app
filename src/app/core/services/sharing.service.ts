import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface ApiShare {
  id: string;
  shared_with_org_id: string;
  shared_by: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class SharingService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getShares(orgId: string, type: 'agents' | 'flows', itemId: string) {
    return this.http.get<ApiShare[]>(`${this.base}/organizations/${orgId}/${type}/${itemId}/shares`);
  }

  addShares(orgId: string, type: 'agents' | 'flows', itemId: string, targetOrgIds: string[]) {
    return this.http.post<ApiShare[]>(
      `${this.base}/organizations/${orgId}/${type}/${itemId}/shares`,
      { target_org_ids: targetOrgIds },
    );
  }

  removeShare(orgId: string, type: 'agents' | 'flows', itemId: string, targetOrgId: string) {
    return this.http.delete(
      `${this.base}/organizations/${orgId}/${type}/${itemId}/shares/${targetOrgId}`,
    );
  }
}
