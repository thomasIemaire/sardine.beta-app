import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FolderTeamPermission {
  team_id: string;
  team_name: string;
  is_root: boolean;
  can_read: boolean;
  can_write: boolean;
}

export interface FolderMemberPermission {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  team_id: string;
  team_name: string;
  can_read: boolean;
  can_write: boolean;
}

export interface FolderBreakdown {
  teams: FolderTeamPermission[];
  members: FolderMemberPermission[];
}

export interface CascadeImpact {
  affected_folders: { id: string; name: string }[];
  total_affected: number;
}

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getFolderBreakdown(orgId: string, folderId: string): Observable<FolderBreakdown> {
    return this.http.get<FolderBreakdown>(
      `${this.base}/organizations/${orgId}/permissions/folders/${folderId}/breakdown`
    );
  }

  setTeamPermission(
    orgId: string,
    teamId: string,
    folderId: string,
    canRead: boolean,
    canWrite: boolean,
    propagate = false,
  ): Observable<FolderTeamPermission> {
    return this.http.put<FolderTeamPermission>(
      `${this.base}/organizations/${orgId}/permissions/teams`,
      { team_id: teamId, folder_id: folderId, can_read: canRead, can_write: canWrite, propagate }
    );
  }

  removeTeamPermission(orgId: string, teamId: string, folderId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/organizations/${orgId}/permissions/teams/${teamId}/folders/${folderId}`
    );
  }

  setMemberPermission(
    orgId: string,
    userId: string,
    folderId: string,
    canRead: boolean,
    canWrite: boolean,
    propagate = false,
  ): Observable<FolderMemberPermission> {
    return this.http.put<FolderMemberPermission>(
      `${this.base}/organizations/${orgId}/permissions/members`,
      { user_id: userId, folder_id: folderId, can_read: canRead, can_write: canWrite, propagate }
    );
  }

  removeMemberPermission(orgId: string, userId: string, folderId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/organizations/${orgId}/permissions/members/${userId}/folders/${folderId}`
    );
  }

  getEffectiveRights(orgId: string, userId: string, folderId: string): Observable<{ can_read: boolean; can_write: boolean }> {
    return this.http.get<{ can_read: boolean; can_write: boolean }>(
      `${this.base}/organizations/${orgId}/permissions/effective/users/${userId}/folders/${folderId}`
    );
  }

  getCascadeImpact(orgId: string, teamId: string, folderId: string): Observable<CascadeImpact> {
    return this.http.get<CascadeImpact>(
      `${this.base}/organizations/${orgId}/permissions/teams/${teamId}/folders/${folderId}/cascade-impact`
    );
  }
}
