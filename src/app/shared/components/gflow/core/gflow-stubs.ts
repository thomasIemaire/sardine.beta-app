import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

// ---- Stub types ----

export interface ExecutionNodeLog {
    id: string;
    node_id: string;
    node_name: string;
    node_type: string;
    status: 'running' | 'completed' | 'failed' | 'waiting' | 'skipped';
    started_at: string;
    completed_at?: string;
    duration_ms?: number;
    error?: string;
    output_port: number | null;
    output_data?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

export interface PresenceUserResponse {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string | null;
}

export interface FlowExecutionResponse {
    id: string;
    flow_id: string;
    status: 'running' | 'completed' | 'failed' | 'cancelled' | 'pending' | 'waiting';
    trigger_type: string;
    triggered_by?: { first_name: string; last_name: string } | null;
    created_at: string;
    started_at?: string;
    completed_at?: string;
    error?: string;
    parent_execution_id?: string;
    parent_flow_id?: string;
}

export interface FlowVersionResponse {
    id: string;
    version: string;
    created_at: string;
    description?: string;
    created_by?: { first_name: string; last_name: string } | null;
}

export interface FolderResponse {
    id: string;
    name: string;
    path: string;
}

// ---- Stub services ----

@Injectable({ providedIn: 'root' })
export class AgentsService {
    list(_orgId: string): Observable<{ id: string; name: string; version: string; reference: string }[]> {
        return of([]);
    }
}

@Injectable({ providedIn: 'root' })
export class UserService {
    getCurrentOrgId(): string | null {
        return null;
    }
}

@Injectable({ providedIn: 'root' })
export class FlowsService {
    list(_orgId: string, _params?: Record<string, unknown>): Observable<{ id: string; name: string; version: string; reference: string | null }[]> {
        return of([]);
    }
    getPresence(_orgId: string, _flowId: string): Observable<PresenceUserResponse[]> {
        return of([]);
    }
    getExecutions(_orgId: string, _flowId: string): Observable<FlowExecutionResponse[]> {
        return of([]);
    }
    getExecutionNodes(_orgId: string, _flowId: string, _executionId: string): Observable<ExecutionNodeLog[]> {
        return of([]);
    }
    stopExecution(_orgId: string, _flowId: string, _executionId: string): Observable<void> {
        return of(undefined);
    }
    respondToApproval(_orgId: string, _taskId: string, _action: 'approve' | 'reject'): Observable<void> {
        return of(undefined);
    }
    getExecution(_orgId: string, _flowId: string, _executionId: string): Observable<FlowExecutionResponse> {
        return of({} as FlowExecutionResponse);
    }
    getVersions(_orgId: string, _flowId: string): Observable<FlowVersionResponse[]> {
        return of([]);
    }
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {
    on(_event: string): Observable<any> {
        return of();
    }
}

@Injectable({ providedIn: 'root' })
export class FoldersService {
    listRoot(_orgId: string): Observable<FolderResponse[]> {
        return of([]);
    }
    getContents(_orgId: string, _folderId: string): Observable<{ subfolders: FolderResponse[] }> {
        return of({ subfolders: [] });
    }
}
