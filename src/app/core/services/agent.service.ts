import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import type { Agent } from '../../shared/components/agent-card/agent-card.component';

interface ApiAgent {
  id: string;
  name: string;
  description: string;
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

export interface AgentPage {
  items: Agent[];
  total: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class AgentService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = environment.apiUrl;

  getAgents(orgId: string, page: number, pageSize: number) {
    const params = new HttpParams()
      .set('page', page)
      .set('page_size', pageSize);

    return this.http
      .get<ApiPaginatedResponse<ApiAgent>>(`${this.base}/organizations/${orgId}/agents/`, { params })
      .pipe(map((res) => this.mapPage(res)));
  }

  getSharedAgents(orgId: string, page: number, pageSize: number) {
    const params = new HttpParams()
      .set('page', page)
      .set('page_size', pageSize);

    return this.http
      .get<ApiPaginatedResponse<ApiAgent>>(`${this.base}/organizations/${orgId}/agents/shared`, { params })
      .pipe(map((res) => this.mapPage(res)));
  }

  createAgent(orgId: string, name: string, description: string) {
    return this.http.post<ApiAgent>(`${this.base}/organizations/${orgId}/agents/`, { name, description, schema_data: {} });
  }

  deleteAgent(orgId: string, agentId: string) {
    return this.http.delete(`${this.base}/organizations/${orgId}/agents/${agentId}`);
  }

  private mapPage(res: ApiPaginatedResponse<ApiAgent>): AgentPage {
    return {
      items: res.items.map((a) => this.mapAgent(a)),
      total: res.total,
      totalPages: res.total_pages,
    };
  }

  private mapAgent(a: ApiAgent): Agent {
    const user = this.auth.currentUser();
    const isMine = user && a.created_by === user.id;
    return {
      id: a.id,
      name: a.name,
      description: a.description ?? '',
      percentage: 0,
      createdAt: new Date(a.created_at),
      creator: isMine
        ? { id: user.id, name: `${user.first_name} ${user.last_name}`, initials: `${user.first_name[0]}${user.last_name[0]}`.toUpperCase() }
        : { id: a.created_by, name: 'Autre', initials: a.created_by.slice(0, 2).toUpperCase() },
    };
  }
}
