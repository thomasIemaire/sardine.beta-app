import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import type { Flow, FlowStatus } from '../../shared/components/flow-card/flow-card.component';

type ApiFlowStatus = 'active' | 'error' | 'pending';

interface ApiFlow {
  id: string;
  name: string;
  description: string;
  status: ApiFlowStatus;
  organization_id: string;
  active_version_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ApiPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface FlowPage {
  items: Flow[];
  total: number;
  totalPages: number;
}

function mapStatus(s: ApiFlowStatus): FlowStatus {
  if (s === 'active') return 'success';
  if (s === 'error') return 'danger';
  return 'warn';
}

@Injectable({ providedIn: 'root' })
export class FlowService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = environment.apiUrl;

  getFlows(orgId: string, page: number, pageSize: number) {
    const params = new HttpParams()
      .set('page', page)
      .set('page_size', pageSize);

    return this.http
      .get<ApiPaginatedResponse<ApiFlow>>(`${this.base}/organizations/${orgId}/flows/`, { params })
      .pipe(map((res) => this.mapPage(res)));
  }

  getSharedFlows(orgId: string, page: number, pageSize: number) {
    const params = new HttpParams()
      .set('page', page)
      .set('page_size', pageSize);

    return this.http
      .get<ApiPaginatedResponse<ApiFlow>>(`${this.base}/organizations/${orgId}/flows/shared`, { params })
      .pipe(map((res) => this.mapPage(res)));
  }

  createFlow(orgId: string, name: string, description: string) {
    return this.http.post<ApiFlow>(`${this.base}/organizations/${orgId}/flows/`, { name, description, flow_data: {} });
  }

  deleteFlow(orgId: string, flowId: string) {
    return this.http.delete(`${this.base}/organizations/${orgId}/flows/${flowId}`);
  }

  private mapPage(res: ApiPaginatedResponse<ApiFlow>): FlowPage {
    return {
      items: res.items.map((f) => this.mapFlow(f)),
      total: res.total,
      totalPages: res.total_pages,
    };
  }

  private mapFlow(f: ApiFlow): Flow {
    const user = this.auth.currentUser();
    const isMine = user && f.created_by === user.id;
    return {
      id: f.id,
      name: f.name,
      description: f.description ?? '',
      status: mapStatus(f.status),
      createdAt: new Date(f.created_at),
      creator: isMine
        ? { id: user.id, name: `${user.first_name} ${user.last_name}`, initials: `${user.first_name[0]}${user.last_name[0]}`.toUpperCase() }
        : { id: f.created_by, name: 'Autre', initials: f.created_by.slice(0, 2).toUpperCase() },
    };
  }
}
