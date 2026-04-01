import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface ApiOrganization {
  id: string;
  name: string;
  is_private: boolean;
  status: number;
  status_label: string;
  contact_email: string | null;
  external_reference: string | null;
  distributor_org_id: string | null;
  parent_org_id: string | null;
  owner_id: string;
  created_at: string;
}

export interface ApiOrgMember {
  user_id: string;
  first_name: string;
  last_name: string;
  role: 1 | 2;
  role_label: string;
  status: 0 | 1;
  status_label: string;
  inherited: boolean;
  email: string | null;
}

export interface OrganizationUpdate {
  name?: string;
  contact_email?: string | null;
  external_reference?: string | null;
  status?: number;
}

export interface ApiKeyRead {
  id: string;
  name: string;
  prefix: string;
  status: number;        // 1 = active, 0 = revoked
  status_label: string;
  created_by: string;
  created_at: string;
}

export interface ApiKeyCreated extends ApiKeyRead {
  token: string;         // présent uniquement à la création
}

interface ApiPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  inviteMembers(orgId: string, members: { email: string; password: string }[]) {
    return this.http.post(`${this.base}/organizations/${orgId}/members/invite-bulk`, { members });
  }

  getOrgMembers(orgId: string) {
    return this.http.get<ApiOrgMember[]>(`${this.base}/organizations/${orgId}/members`);
  }

  getMyOrganizations() {
    return this.http.get<ApiOrganization[]>(`${this.base}/organizations/`);
  }

  getOwnedOrganizations() {
    return this.http.get<ApiOrganization[]>(`${this.base}/organizations/owned`);
  }

  getChildOrganizations(orgId: string) {
    return this.http.get<ApiOrganization[]>(`${this.base}/organizations/${orgId}/children`);
  }

  getDistributedOrganizations(orgId: string) {
    return this.http.get<ApiOrganization[]>(`${this.base}/organizations/${orgId}/distributed`);
  }

  createOrganization(data: {
    name: string;
    contact_email?: string | null;
    external_reference?: string | null;
    distributor_org_id?: string | null;
    parent_org_id?: string | null;
  }) {
    return this.http.post<ApiOrganization>(`${this.base}/organizations/`, data);
  }

  updateOrganization(orgId: string, data: OrganizationUpdate) {
    return this.http.patch<ApiOrganization>(`${this.base}/organizations/${orgId}`, data);
  }

  getApiKeys(orgId: string, page = 1, pageSize = 50) {
    return this.http.get<ApiPaginatedResponse<ApiKeyRead>>(
      `${this.base}/organizations/${orgId}/api-keys/`,
      { params: { page, page_size: pageSize } },
    );
  }

  createApiKey(orgId: string, name: string) {
    return this.http.post<ApiKeyCreated>(`${this.base}/organizations/${orgId}/api-keys/`, { name });
  }

  revokeApiKey(orgId: string, keyId: string) {
    return this.http.patch<ApiKeyRead>(`${this.base}/organizations/${orgId}/api-keys/${keyId}/revoke`, {});
  }

  deleteApiKey(orgId: string, keyId: string) {
    return this.http.delete(`${this.base}/organizations/${orgId}/api-keys/${keyId}`);
  }
}
