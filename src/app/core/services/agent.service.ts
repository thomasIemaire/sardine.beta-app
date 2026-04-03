import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { ContextSwitcherService } from '../layout/context-switcher/context-switcher.service';
import type { Agent } from '../../shared/components/agent-card/agent-card.component';

interface ApiAgent {
  id: string;
  name: string;
  description: string;
  organization_id: string;
  active_version_id: string | null;
  active_version_schema: Record<string, unknown> | null;
  forked_from_id: string | null;
  forked_from_version_id: string | null;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export interface ApiAgentVersion {
  id: string;
  agent_id: string;
  version_number: number;
  schema_data: Record<string, unknown>;
  parent_version_id: string | null;
  created_by: string;
  created_at: string;
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
  private readonly contextSwitcher = inject(ContextSwitcherService);
  private readonly base = environment.apiUrl;

  getAgents(orgId: string, page: number, pageSize: number) {
    const params = new HttpParams()
      .set('page', page)
      .set('page_size', pageSize);

    return this.http
      .get<ApiPaginatedResponse<ApiAgent>>(`${this.base}/organizations/${orgId}/agents/`, { params })
      .pipe(map((res) => this.mapPage(res)));
  }

  getSharedAgents(orgId: string) {
    return this.http
      .get<ApiAgent[]>(`${this.base}/organizations/${orgId}/agents/shared`)
      .pipe(map((items) => ({
        items: items.map((a) => this.mapAgent(a)),
        total: items.length,
        totalPages: 1,
      } as AgentPage)));
  }

  createAgent(orgId: string, name: string, description: string) {
    return this.http
      .post<ApiAgent>(`${this.base}/organizations/${orgId}/agents/`, { name, description, schema_data: {} })
      .pipe(map((a) => this.mapAgent(a)));
  }

  deleteAgent(orgId: string, agentId: string) {
    return this.http.delete(`${this.base}/organizations/${orgId}/agents/${agentId}`);
  }

  updateAgent(orgId: string, agentId: string, name: string, description: string) {
    return this.http
      .patch<ApiAgent>(`${this.base}/organizations/${orgId}/agents/${agentId}`, { name, description })
      .pipe(map((a) => this.mapAgent(a)));
  }

  saveAgentVersion(orgId: string, agentId: string, schemaData: Record<string, unknown>) {
    return this.http.post(
      `${this.base}/organizations/${orgId}/agents/${agentId}/versions`,
      { schema_data: schemaData },
    );
  }

  forkAgent(orgId: string, agentId: string) {
    return this.http
      .post<ApiAgent>(`${this.base}/organizations/${orgId}/agents/fork/${agentId}`, {})
      .pipe(map((a) => this.mapAgent(a)));
  }

  getAgent(orgId: string, agentId: string) {
    return this.http
      .get<ApiAgent>(`${this.base}/organizations/${orgId}/agents/${agentId}`)
      .pipe(map((a) => this.mapAgent(a)));
  }

  getAgentVersions(orgId: string, agentId: string) {
    return this.http
      .get<ApiAgentVersion[]>(`${this.base}/organizations/${orgId}/agents/${agentId}/versions`);
  }

  checkoutVersion(orgId: string, agentId: string, versionId: string) {
    return this.http.patch(
      `${this.base}/organizations/${orgId}/agents/${agentId}/active-version`,
      { version_id: versionId },
    );
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
    const selectedOrgId = this.contextSwitcher.selectedId();
    const isOwn = a.organization_id === selectedOrgId;

    let creator: Agent['creator'];
    if (isOwn) {
      const isMine = user && a.created_by === user.id;
      creator = isMine
        ? { id: user.id, name: `${user.first_name} ${user.last_name}`, initials: `${user.first_name[0]}${user.last_name[0]}`.toUpperCase() }
        : { id: a.created_by, name: 'Autre', initials: a.created_by.slice(0, 2).toUpperCase() };
    } else {
      const org = this.contextSwitcher.organizations().find((o) => o.id === a.organization_id);
      creator = org
        ? { id: org.id, name: org.name, initials: org.initials, shape: 'org' as const }
        : { id: a.organization_id, name: 'Org externe', initials: a.organization_id.slice(0, 2).toUpperCase(), shape: 'org' as const };
    }

    return {
      id: a.id,
      name: a.name,
      description: a.description ?? '',
      percentage: 0,
      isOwned: isOwn,
      forkedFromId: a.forked_from_id ?? null,
      schemaData: a.active_version_schema ?? null,
      activeVersionId: a.active_version_id ?? null,
      createdAt: new Date(a.created_at),
      creator,
    };
  }
}
