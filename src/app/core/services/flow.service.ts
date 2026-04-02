import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import type { Flow, FlowStatus } from '../../shared/components/flow-card/flow-card.component';
import type { SerializedFlowData, SerializedLink } from '../../shared/components/gflow/core/gflow.types';

type ApiFlowStatus = 'active' | 'error' | 'pending';

/** Shape stored in the API (edges instead of links, zoom instead of scale) */
interface ApiFlowData {
  nodes: SerializedFlowData['nodes'];
  edges: SerializedLink[];
  viewport?: { x: number; y: number; zoom: number };
}

interface ApiFlow {
  id: string;
  name: string;
  description: string;
  status: ApiFlowStatus;
  status_label: string;
  organization_id: string;
  active_version_id: string | null;
  active_version_data: ApiFlowData | null;
  forked_from_id: string | null;
  forked_from_version_id: string | null;
  created_by: string;
  created_at: string;
}

export type FlowDataPartial = Omit<SerializedFlowData, 'viewport'> & { viewport?: SerializedFlowData['viewport'] };

export interface FlowDetail extends Flow {
  flowData: FlowDataPartial | null;
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

  getFlow(orgId: string, flowId: string) {
    return this.http
      .get<ApiFlow>(`${this.base}/organizations/${orgId}/flows/${flowId}`)
      .pipe(map((f) => ({
        ...this.mapFlow(f),
        flowData: f.active_version_data ? this.mapApiFlowData(f.active_version_data) : null,
      } as FlowDetail)));
  }

  saveFlowVersion(orgId: string, flowId: string, data: SerializedFlowData) {
    const flow_data: ApiFlowData = {
      nodes: data.nodes,
      edges: data.links,
      viewport: data.viewport ? { x: data.viewport.x, y: data.viewport.y, zoom: data.viewport.scale } : undefined,
    };
    return this.http.post<ApiFlow>(`${this.base}/organizations/${orgId}/flows/${flowId}/versions`, { flow_data });
  }

  private mapApiFlowData(d: ApiFlowData): Omit<SerializedFlowData, 'viewport'> & { viewport?: SerializedFlowData['viewport'] } {
    return {
      nodes: d.nodes ?? [],
      links: d.edges ?? [],
      viewport: d.viewport ? { x: d.viewport.x, y: d.viewport.y, scale: d.viewport.zoom } : undefined,
    };
  }

  getFlows(orgId: string, page: number, pageSize: number) {
    const params = new HttpParams()
      .set('page', page)
      .set('page_size', pageSize);

    return this.http
      .get<ApiPaginatedResponse<ApiFlow>>(`${this.base}/organizations/${orgId}/flows/`, { params })
      .pipe(map((res) => this.mapPage(res)));
  }

  getSharedFlows(orgId: string) {
    return this.http
      .get<ApiFlow[]>(`${this.base}/organizations/${orgId}/flows/shared`)
      .pipe(map((items) => ({
        items: items.map((f) => this.mapFlow(f)),
        total: items.length,
        totalPages: 1,
      } as FlowPage)));
  }

  createFlow(orgId: string, name: string, description: string) {
    return this.http
      .post<ApiFlow>(`${this.base}/organizations/${orgId}/flows/`, { name, description })
      .pipe(map((f) => this.mapFlow(f)));
  }

  deleteFlow(orgId: string, flowId: string) {
    return this.http.delete(`${this.base}/organizations/${orgId}/flows/${flowId}`);
  }

  forkFlow(orgId: string, flowId: string) {
    return this.http
      .post<ApiFlow>(`${this.base}/organizations/${orgId}/flows/fork/${flowId}`, {})
      .pipe(map((f) => this.mapFlow(f)));
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
      forkedFromId: f.forked_from_id,
      createdAt: new Date(f.created_at),
      creator: isMine
        ? { id: user.id, name: `${user.first_name} ${user.last_name}`, initials: `${user.first_name[0]}${user.last_name[0]}`.toUpperCase() }
        : { id: f.created_by, name: 'Autre', initials: f.created_by.slice(0, 2).toUpperCase() },
    };
  }
}
