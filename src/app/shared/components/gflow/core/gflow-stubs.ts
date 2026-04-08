import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, map, of } from 'rxjs';
import { FlowService, FlowExecutionRead, NodeLogRead } from '../../../../core/services/flow.service';
import { FlowEventsBus } from '../../../../core/services/flow-events.bus';

// ---- Types exposés au gflow / exec-panel ----

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

// ---- Adaptateurs ----

function mapExecution(e: FlowExecutionRead): FlowExecutionResponse {
    let triggeredBy: FlowExecutionResponse['triggered_by'] = null;
    if (e.triggered_by && typeof e.triggered_by === 'object') {
        triggeredBy = e.triggered_by as { first_name: string; last_name: string };
    }
    return {
        id: e.id,
        flow_id: e.flow_id,
        status: e.status,
        trigger_type: e.trigger_type,
        triggered_by: triggeredBy,
        created_at: e.created_at,
        started_at: e.started_at ?? undefined,
        completed_at: e.completed_at ?? undefined,
        error: e.error ?? undefined,
        parent_execution_id: e.parent_execution_id ?? undefined,
        parent_flow_id: e.parent_flow_id ?? undefined,
    };
}

function mapNodeLog(l: NodeLogRead): ExecutionNodeLog {
    return {
        id: l.id,
        node_id: l.node_id,
        node_name: l.node_name,
        node_type: l.node_type,
        status: l.status,
        started_at: l.started_at,
        completed_at: l.completed_at ?? undefined,
        duration_ms: l.duration_ms ?? undefined,
        error: l.error ?? undefined,
        output_port: l.output_port,
        output_data: l.output_data ?? undefined,
        metadata: l.metadata ?? undefined,
    };
}

// ---- Services réels (le nom est conservé pour compat avec le composant) ----

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
    private readonly flowService = inject(FlowService);

    /** Liste minimale des flows accessibles (utilisée pour résoudre un parent_execution). */
    list(orgId: string, _params?: Record<string, unknown>): Observable<{ id: string; name: string; version: string; reference: string | null }[]> {
        return this.flowService.getFlows(orgId, { page: 1, pageSize: 200 }).pipe(
            map((page) => page.items.map((f) => ({
                id: f.id,
                name: f.name,
                version: '',
                reference: null,
            }))),
        );
    }

    /** Présence collaborative — non disponible côté API publique pour l'instant. */
    getPresence(_orgId: string, _flowId: string): Observable<PresenceUserResponse[]> {
        return of([]);
    }

    getExecutions(orgId: string, flowId: string): Observable<FlowExecutionResponse[]> {
        return this.flowService.listExecutions(orgId, flowId).pipe(
            map((execs) => execs.map(mapExecution)),
        );
    }

    getExecutionNodes(orgId: string, flowId: string, executionId: string): Observable<ExecutionNodeLog[]> {
        return this.flowService.getExecutionNodes(orgId, flowId, executionId).pipe(
            map((logs) => logs.map(mapNodeLog)),
        );
    }

    stopExecution(orgId: string, flowId: string, executionId: string): Observable<void> {
        return this.flowService.stopExecution(orgId, flowId, executionId);
    }

    /**
     * Le moteur attend une `value` parmi celles définies dans la config du
     * noeud `approval`. Le panel transmet `approve` / `reject` ; on les
     * normalise en `approved` / `rejected` qui sont les valeurs courantes.
     */
    respondToApproval(orgId: string, taskId: string, action: 'approve' | 'reject'): Observable<void> {
        const value = action === 'approve' ? 'approved' : 'rejected';
        return this.flowService.respondToApprovalTask(orgId, taskId, value).pipe(map(() => undefined));
    }

    getExecution(orgId: string, flowId: string, executionId: string): Observable<FlowExecutionResponse> {
        return this.flowService.getExecution(orgId, flowId, executionId).pipe(map(mapExecution));
    }

    /** Versioning n'est pas couvert par le PDF Flow Engine — stub vide. */
    getVersions(_orgId: string, _flowId: string): Observable<FlowVersionResponse[]> {
        return of([]);
    }
}

/**
 * Façade WebSocket pour le gflow. Le vrai WebSocket est tenu par
 * `NotificationService` qui republie les évènements `execution.*` sur le
 * `FlowEventsBus`. On ré-expose ici un `on(event)` minimaliste pour ne pas
 * imposer de modifications au code consommateur.
 */
@Injectable({ providedIn: 'root' })
export class WebSocketService {
    private readonly bus = inject(FlowEventsBus);

    on(event: string): Observable<any> {
        // La présence collaborative n'est pas couverte côté API publique.
        if (event.startsWith('presence.')) return EMPTY;
        return this.bus.on(event);
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
