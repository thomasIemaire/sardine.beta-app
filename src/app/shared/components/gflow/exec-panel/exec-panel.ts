import { Component, DestroyRef, effect, inject, input, output, signal, computed } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, switchMap, merge, map, take } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { Pipe, PipeTransform } from '@angular/core';
import { FlowsService, WebSocketService, ExecutionNodeLog, FlowExecutionResponse } from '../core/gflow-stubs';
import { NODE_DEFINITION_MAP } from '../core/node-definitions';

@Pipe({ name: 'execStatusIcon', standalone: true })
export class ExecStatusIconPipe implements PipeTransform {
    transform(status: string): string {
        switch (status) {
            case 'completed': return 'fa-solid fa-circle-check';
            case 'running':   return 'fa-solid fa-spinner fa-spin';
            case 'failed':    return 'fa-solid fa-circle-xmark';
            case 'waiting':   return 'fa-solid fa-clock';
            case 'cancelled': return 'fa-solid fa-ban';
            case 'pending':   return 'fa-solid fa-hourglass-half';
            case 'skipped':   return 'fa-solid fa-forward';
            default:          return 'fa-solid fa-circle';
        }
    }
}

@Pipe({ name: 'execStatusLabel', standalone: true })
export class ExecStatusLabelPipe implements PipeTransform {
    transform(status: string): string {
        switch (status) {
            case 'completed': return 'Terminé';
            case 'running':   return 'En cours';
            case 'failed':    return 'Échoué';
            case 'waiting':   return 'En attente';
            case 'cancelled': return 'Annulé';
            case 'pending':   return 'En attente';
            case 'skipped':   return 'Ignoré';
            default:          return status;
        }
    }
}

@Component({
    selector: 'app-exec-panel',
    imports: [ButtonModule, TooltipModule, MenuModule, FormsModule, JsonPipe, ExecStatusIconPipe, ExecStatusLabelPipe],
    templateUrl: './exec-panel.html',
    styleUrls: ['./exec-panel.scss']
})
export class ExecPanelComponent {
    private flowsService = inject(FlowsService);
    private ws = inject(WebSocketService);
    private router = inject(Router);
    private destroyRef = inject(DestroyRef);

    flowId = input.required<string>();
    orgId = input.required<string>();
    initialExecutionId = input<string | null>(null);
    nodeNameMap = input<Record<string, string>>({});

    close = output<void>();
    nodeLogsChange = output<ExecutionNodeLog[]>();

    executions = signal<FlowExecutionResponse[]>([]);
    selectedExec = signal<FlowExecutionResponse | null>(null);
    nodeLogs = signal<ExecutionNodeLog[]>([]);
    loading = signal(false);
    loadingDetail = signal(false);
    processingApproval = signal<string | null>(null);
    stoppingExecution = signal(false);
    view = signal<'list' | 'detail'>('list');
    searchQuery = signal('');
    private openDataSections = new Set<string>();

    filteredNodeLogs = computed(() => {
        const logs = this.nodeLogs();
        const q = this.searchQuery().toLowerCase().trim();
        if (!q) return logs;
        return logs.filter(log =>
            (this.getNodeName(log)).toLowerCase().includes(q) ||
            log.node_type.toLowerCase().includes(q) ||
            log.status.toLowerCase().includes(q) ||
            (log.error?.toLowerCase().includes(q))
        );
    });

    exportMenuItems: MenuItem[] = [
        { label: 'Exporter en JSON', icon: 'fa-solid fa-code', command: () => this.exportLogs('json') },
        { label: 'Exporter en CSV', icon: 'fa-solid fa-file-csv', command: () => this.exportLogs('csv') }
    ];

    constructor() {
        // Charger les exécutions quand le flowId change
        effect(() => {
            const flowId = this.flowId();
            const orgId = this.orgId();
            if (flowId && orgId) {
                this.loadExecutions(orgId, flowId);
            }
        });

        // Émettre les node logs vers le parent pour le highlighting des noeuds
        effect(() => {
            const logs = this.view() === 'detail' ? this.nodeLogs() : [];
            this.nodeLogsChange.emit(logs);
        });

        // Temps réel : à chaque changement d'état d'une exécution, on recharge
        // la liste depuis l'API. Le moteur n'émet pas d'évènement "snapshot"
        // complet sur le WS, donc on s'appuie sur les évènements terminaux
        // (started/completed/failed) pour rafraîchir.
        merge(
            this.ws.on('execution.started'),
            this.ws.on('execution.completed'),
            this.ws.on('execution.failed'),
        ).pipe(
            takeUntilDestroyed()
        ).subscribe(event => {
            if (!event?.execution_id) return;
            this.loadExecutions(this.orgId(), this.flowId());
            // Si on est en train de regarder cette exécution, on rafraîchit
            // aussi le détail (status + node logs).
            if (this.selectedExec()?.id === event.execution_id) {
                this.flowsService.getExecution(this.orgId(), this.flowId(), event.execution_id).pipe(
                    catchError(() => EMPTY),
                    takeUntilDestroyed(this.destroyRef)
                ).subscribe(exec => this.selectedExec.set(exec));
                this.refreshNodeLogs(event.execution_id);
            }
        });

        // Temps réel : mise à jour granulaire des node logs sur tout évènement
        // `execution.node.*` concernant l'exécution actuellement affichée.
        merge(
            this.ws.on('execution.node.started'),
            this.ws.on('execution.node.completed'),
            this.ws.on('execution.node.failed'),
            this.ws.on('execution.node.waiting'),
        ).pipe(
            takeUntilDestroyed()
        ).subscribe(event => {
            if (!event?.execution_id || this.selectedExec()?.id !== event.execution_id) return;
            this.refreshNodeLogs(event.execution_id);
        });
    }

    selectExecution(exec: FlowExecutionResponse): void {
        this.selectedExec.set(exec);
        this.view.set('detail');
        this.loadNodeLogs(exec.id);
    }

    backToList(): void {
        this.view.set('list');
        this.selectedExec.set(null);
        this.nodeLogs.set([]);
    }

    // ---- Actions ----

    stopExecution(): void {
        const exec = this.selectedExec();
        if (!exec || this.stoppingExecution()) return;
        this.stoppingExecution.set(true);
        this.flowsService.stopExecution(this.orgId(), this.flowId(), exec.id).pipe(
            catchError(() => { this.stoppingExecution.set(false); return EMPTY; }),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(() => {
            this.stoppingExecution.set(false);
        });
    }

    isRunning(exec: FlowExecutionResponse | null): boolean {
        return exec?.status === 'running' || exec?.status === 'pending' || exec?.status === 'waiting';
    }

    // ---- Formatage ----

    formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    getTriggerLabel(type: string): string {
        switch (type) {
            case 'manual':    return 'Manuel';
            case 'scheduled': return 'Planifié';
            case 'webhook':   return 'Webhook';
            case 'subflow':   return 'Sous-flow';
            default:          return type;
        }
    }

    getDuration(exec: FlowExecutionResponse): string | null {
        if (!exec.started_at || !exec.completed_at) return null;
        const ms = new Date(exec.completed_at).getTime() - new Date(exec.started_at).getTime();
        return this.formatDuration(ms);
    }

    formatDuration(ms: number): string {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${Math.round(ms / 1000)}s`;
        return `${Math.round(ms / 60000)} min`;
    }

    getNodeIcon(nodeType: string): string {
        return NODE_DEFINITION_MAP[nodeType as keyof typeof NODE_DEFINITION_MAP]?.icon?.icon || 'fa-solid fa-circle';
    }

    getNodeName(log: ExecutionNodeLog): string {
        return this.nodeNameMap()[log.node_id] || log.node_name || log.node_id;
    }

    // ---- Données de transit ----

    hasKeys(obj: Record<string, unknown>): boolean {
        return Object.keys(obj).length > 0;
    }

    toggleData(logId: string, type: 'input' | 'output'): void {
        const key = `${logId}_${type}`;
        if (this.openDataSections.has(key)) {
            this.openDataSections.delete(key);
        } else {
            this.openDataSections.add(key);
        }
    }

    isDataOpen(logId: string, type: 'input' | 'output'): boolean {
        return this.openDataSections.has(`${logId}_${type}`);
    }

    // ---- Ranger ----

    hasRangerFile(log: ExecutionNodeLog): boolean {
        return log.node_type === 'ranger' && log.status === 'completed' && !!log.metadata?.['file_id'];
    }

    openRangerFile(log: ExecutionNodeLog): void {
        const fileId = log.metadata?.['file_id'] as string;
        if (fileId) {
            this.router.navigate(['/documents/file', fileId]);
        }
    }

    // ---- Sous-flows ----

    isSubflowExec(exec: FlowExecutionResponse | null): boolean {
        return exec?.trigger_type === 'subflow';
    }

    hasChildExecution(log: ExecutionNodeLog): boolean {
        return log.node_type === 'flow' && !!log.metadata?.['child_execution_id'];
    }

    getChildFlowName(log: ExecutionNodeLog): string {
        return (log.metadata?.['child_flow_name'] as string) || 'Sous-flow';
    }

    getChildDepth(log: ExecutionNodeLog): number {
        return (log.metadata?.['depth'] as number) || 1;
    }

    openChildExecution(log: ExecutionNodeLog): void {
        const childExecId = log.metadata?.['child_execution_id'] as string;
        const childFlowId = log.metadata?.['child_flow_id'] as string;
        if (childExecId && childFlowId) {
            this.router.navigate(['/automation/flows'], {
                queryParams: { flowId: childFlowId, executionId: childExecId }
            });
        }
    }

    openParentExecution(): void {
        const exec = this.selectedExec();
        if (!exec?.parent_execution_id) return;
        const parentExecId = exec.parent_execution_id;

        // Si le backend fournit parent_flow_id, navigation directe
        if (exec.parent_flow_id) {
            this.router.navigate(['/automation/flows'], {
                queryParams: { flowId: exec.parent_flow_id, executionId: parentExecId }
            });
            return;
        }

        // Sinon, résoudre le flow parent en cherchant dans tous les flows
        this.flowsService.list(this.orgId()).pipe(
            switchMap(flows => merge(...flows.map(flow =>
                this.flowsService.getExecution(this.orgId(), flow.id, parentExecId).pipe(
                    map(() => flow.id),
                    catchError(() => EMPTY)
                )
            )).pipe(take(1))),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(flowId => {
            this.router.navigate(['/automation/flows'], {
                queryParams: { flowId, executionId: parentExecId }
            });
        });
    }

    // ---- Approbations ----

    onApprove(log: ExecutionNodeLog): void {
        this.respondToApproval(log, 'approve');
    }

    onReject(log: ExecutionNodeLog): void {
        this.respondToApproval(log, 'reject');
    }

    private respondToApproval(log: ExecutionNodeLog, action: 'approve' | 'reject'): void {
        const approvalTaskId = log.metadata?.['approval_task_id'] as string | undefined;
        if (!approvalTaskId || this.processingApproval()) return;

        this.processingApproval.set(log.id);

        this.flowsService.respondToApproval(this.orgId(), approvalTaskId, action).pipe(
            catchError(() => { this.processingApproval.set(null); return EMPTY; }),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(() => {
            this.processingApproval.set(null);
            // Mettre à jour le log local en attendant le refresh WS
            this.nodeLogs.update(logs => logs.map(l =>
                l.id === log.id
                    ? { ...l, status: 'completed' as const, metadata: { ...l.metadata, option_value: action === 'approve' ? 'approved' : 'rejected' } }
                    : l
            ));
        });
    }

    // ---- Export ----

    exportLogs(format: 'json' | 'csv'): void {
        const logs = this.nodeLogs();
        const exec = this.selectedExec();
        if (!logs.length || !exec) return;

        let content: string;
        let mimeType: string;

        if (format === 'json') {
            content = JSON.stringify(logs, null, 2);
            mimeType = 'application/json';
        } else {
            const headers = ['id', 'node_name', 'node_type', 'status', 'started_at', 'completed_at', 'duration_ms', 'error'];
            const rows = logs.map(log => [
                log.id,
                this.getNodeName(log),
                log.node_type,
                log.status,
                log.started_at,
                log.completed_at ?? '',
                log.duration_ms?.toString() ?? '',
                (log.error ?? '').replace(/"/g, '""')
            ].map(v => `"${v}"`).join(','));
            content = [headers.join(','), ...rows].join('\n');
            mimeType = 'text/csv';
        }

        const date = new Date().toISOString().slice(0, 10);
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `execution-${exec.id.slice(0, 8)}-${date}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ---- Chargement ----

    private loadExecutions(orgId: string, flowId: string): void {
        this.loading.set(true);
        this.flowsService.getExecutions(orgId, flowId).pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: (execs) => {
                const sorted = [...execs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                this.executions.set(sorted);
                this.loading.set(false);

                // Auto-sélection si un executionId initial est fourni
                const targetId = this.initialExecutionId();
                if (targetId) {
                    const target = sorted.find(e => e.id === targetId);
                    if (target) {
                        this.selectExecution(target);
                    }
                }
            },
            error: () => this.loading.set(false)
        });
    }

    private loadNodeLogs(executionId: string): void {
        this.loadingDetail.set(true);
        this.nodeLogs.set([]);
        this.flowsService.getExecutionNodes(this.orgId(), this.flowId(), executionId).pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: (logs) => {
                this.nodeLogs.set(logs);
                this.loadingDetail.set(false);
            },
            error: () => this.loadingDetail.set(false)
        });
    }

    /** Refresh silencieux des node logs (pas de spinner, pas de reset) */
    private refreshNodeLogs(executionId: string): void {
        this.flowsService.getExecutionNodes(this.orgId(), this.flowId(), executionId).pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(logs => this.nodeLogs.set(logs));
    }
}
