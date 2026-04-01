import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface ApiTeam {
  id: string;
  name: string;
  is_root: boolean;
  organization_id: string;
  created_at: string;
}

export interface ApiTeamNode {
  id: string;
  name: string;
  is_root: boolean;
  is_member: boolean;
  children: ApiTeamNode[];
}

export interface ApiTeamMember {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  role: 1 | 2;
  role_label: string;
  status: 0 | 1;
  status_label: string;
  inherited: boolean;
}

@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getTeamTree(orgId: string) {
    return this.http.get<ApiTeamNode[]>(`${this.base}/organizations/${orgId}/teams/tree`);
  }

  createTeam(orgId: string, name: string) {
    return this.http.post<ApiTeam>(`${this.base}/organizations/${orgId}/teams/`, { name });
  }

  createSubTeam(orgId: string, parentTeamId: string, name: string) {
    return this.http.post<ApiTeam>(`${this.base}/organizations/${orgId}/teams/sub-teams`, { name, parent_team_ids: [parentTeamId] });
  }

  updateTeam(orgId: string, teamId: string, name: string) {
    return this.http.patch<ApiTeam>(`${this.base}/organizations/${orgId}/teams/${teamId}`, { name });
  }

  deleteTeam(orgId: string, teamId: string) {
    return this.http.delete(`${this.base}/organizations/${orgId}/teams/${teamId}`);
  }

  getMembers(orgId: string, teamId: string) {
    return this.http.get<ApiTeamMember[]>(`${this.base}/organizations/${orgId}/teams/${teamId}/members`);
  }

  addMember(orgId: string, teamId: string, userId: string) {
    return this.http.post(`${this.base}/organizations/${orgId}/teams/${teamId}/members`, { user_id: userId });
  }

  changeMemberRole(orgId: string, teamId: string, userId: string, role: 1 | 2) {
    return this.http.patch(`${this.base}/organizations/${orgId}/teams/${teamId}/members/${userId}/role`, { role });
  }

  changeMemberStatus(orgId: string, teamId: string, userId: string, status: 0 | 1) {
    return this.http.patch(`${this.base}/organizations/${orgId}/teams/${teamId}/members/${userId}/status`, { status });
  }
}
