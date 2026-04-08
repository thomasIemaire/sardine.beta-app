import { Component, inject, OnInit, AfterViewInit, viewChild, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { GflowComponent, FlowSavePayload } from '../../shared/components/gflow/gflow';
import { FlowService } from '../../core/services/flow.service';
import { ContextSwitcherService } from '../../core/layout/context-switcher/context-switcher.service';
import { ExecuteFlowDialogComponent, ExecuteFlowPayload } from './execute-flow-dialog.component';

@Component({
    selector: 'app-flow-editor',
    imports: [GflowComponent, ToastModule, ExecuteFlowDialogComponent],
    providers: [MessageService],
    template: `
        <p-toast />

        @if (loading()) {
            <div class="flow-loader">
                <div class="flow-loader__canvas">
                    <svg class="flow-loader__dots" preserveAspectRatio="none">
                        <defs>
                            <pattern id="loader-dots" patternUnits="userSpaceOnUse" width="24" height="24">
                                <circle cx="12" cy="12" r="1.2" fill="var(--background-color-300)" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#loader-dots)" />
                    </svg>

                    <div class="flow-loader__scene">
                        <div class="flow-loader__node flow-loader__node--start"></div>
                        <svg class="flow-loader__wire" viewBox="0 0 120 2" preserveAspectRatio="none">
                            <line x1="0" y1="1" x2="120" y2="1" stroke="var(--background-color-300)" stroke-width="2" stroke-linecap="round" />
                        </svg>
                        <div class="flow-loader__node"></div>
                        <svg class="flow-loader__wire" viewBox="0 0 120 2" preserveAspectRatio="none">
                            <line x1="0" y1="1" x2="120" y2="1" stroke="var(--background-color-300)" stroke-width="2" stroke-linecap="round" />
                        </svg>
                        <div class="flow-loader__node flow-loader__node--end"></div>
                    </div>
                </div>
            </div>
        }

        <app-gflow
            #gflow
            [flowId]="flowId"
            [orgId]="orgId"
            [readonly]="isReadonly()"
            [navigateBack]="'/flows'"
            (saveFlow)="onSaveFlow($event)"
            (executeFlow)="onExecuteFlow()"
            (close)="onClose()" />

        <app-execute-flow-dialog
            [(visible)]="showExecuteDialog"
            (execute)="onExecuteConfirmed($event)" />
    `,
    styles: [`
        :host {
            display: flex;
            flex-direction: column;
            height: 100%;
            overflow: hidden;
            animation: gflow-enter 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes gflow-enter {
            from { opacity: 0; transform: scale(0.97) translateY(12px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .flow-loader {
            position: absolute;
            inset: 0;
            z-index: 500;
            background: var(--background-color-200);
            display: flex;
            align-items: center;
            justify-content: center;
            animation: loader-in 0.15s ease both;
        }

        @keyframes loader-in {
            from { opacity: 0; }
            to   { opacity: 1; }
        }

        .flow-loader__canvas {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .flow-loader__dots {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            opacity: 0.6;
        }

        .flow-loader__scene {
            position: relative;
            display: flex;
            align-items: center;
            gap: 0;
            animation: scene-pulse 1.6s ease-in-out infinite;
        }

        @keyframes scene-pulse {
            0%, 100% { opacity: 0.35; }
            50%       { opacity: 0.75; }
        }

        .flow-loader__node {
            width: 48px;
            height: 32px;
            border-radius: 10px;
            background: var(--background-color-100);
            border: 1.5px solid var(--surface-border);
            flex-shrink: 0;

            &--start { border-color: var(--p-green-300); background: color-mix(in srgb, var(--p-green-300) 12%, var(--background-color-100)); }
            &--end   { border-color: var(--p-red-300);   background: color-mix(in srgb, var(--p-red-300)   12%, var(--background-color-100)); }
        }

        .flow-loader__wire {
            width: 80px;
            height: 2px;
            flex-shrink: 0;
        }
    `]
})
export class FlowEditorPage implements OnInit, AfterViewInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly flowService = inject(FlowService);
    private readonly contextSwitcher = inject(ContextSwitcherService);
    private readonly messageService = inject(MessageService);

    private readonly gflowRef = viewChild<GflowComponent>('gflow');

    readonly loading = signal(true);
    readonly isReadonly = signal(false);
    readonly showExecuteDialog = signal(false);
    readonly executing = signal(false);
    flowId: string | null = null;
    orgId: string | null = null;

    ngOnInit(): void {
        this.flowId = this.route.snapshot.paramMap.get('id');
        this.orgId = this.route.snapshot.queryParamMap.get('orgId') ?? this.contextSwitcher.selectedId();
    }

    ngAfterViewInit(): void {
        const { flowId, orgId } = this;
        if (!flowId || !orgId) {
            this.loading.set(false);
            return;
        }

        this.flowService.getFlow(orgId, flowId).subscribe({
            next: (flow) => {
                this.isReadonly.set(!flow.isOwned);
                this.gflowRef()?.loadFlow({
                    id: flow.id,
                    title: flow.name,
                    description: flow.description,
                    nodes: flow.flowData?.nodes,
                    links: flow.flowData?.links,
                    viewport: flow.flowData?.viewport,
                });
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger le flow.' });
            },
        });
    }

    onExecuteFlow(): void {
        if (!this.flowId || !this.orgId) return;
        // L'exécution requiert au moins un document : on passe par la dialog.
        this.showExecuteDialog.set(true);
    }

    async onExecuteConfirmed(payload: ExecuteFlowPayload): Promise<void> {
        const { flowId, orgId } = this;
        if (!flowId || !orgId || this.executing()) return;
        if (!payload.files.length) return;

        this.executing.set(true);
        try {
            const files = await Promise.all(payload.files.map((f) => this.fileToInputEntry(f)));
            const inputData = { files };

            this.flowService.executeFlow(orgId, flowId, inputData).subscribe({
                next: (exec) => {
                    this.executing.set(false);
                    this.messageService.add({
                        severity: 'info',
                        summary: 'Exécution lancée',
                        detail: `Le flow a démarré (id ${exec.id.slice(0, 8)}).`,
                    });
                    this.gflowRef()?.openExecPanelWithExecution(exec.id);
                },
                error: () => {
                    this.executing.set(false);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Erreur',
                        detail: "Impossible de lancer l'exécution.",
                    });
                },
            });
        } catch {
            this.executing.set(false);
            this.messageService.add({
                severity: 'error',
                summary: 'Erreur',
                detail: "Impossible de lire les fichiers sélectionnés.",
            });
        }
    }

    /**
     * Convertit un File en entrée `input_data.files` attendue par le moteur.
     * Le noeud `start` extrait automatiquement le 1er fichier et le met dans
     * `context.data.fileBase64` (+ fileName, fileMimeType, fileSize).
     */
    private fileToInputEntry(file: File): Promise<{ base64: string; name: string; mime_type: string; size: number }> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(reader.error);
            reader.onload = () => {
                const result = reader.result as string;
                // data:<mime>;base64,<payload> → on ne garde que la partie base64.
                const base64 = result.includes(',') ? result.split(',', 2)[1] : result;
                resolve({
                    base64,
                    name: file.name,
                    mime_type: file.type || 'application/octet-stream',
                    size: file.size,
                });
            };
            reader.readAsDataURL(file);
        });
    }

    onSaveFlow(payload: FlowSavePayload): void {
        const { flowId, orgId } = this;
        if (!flowId || !orgId) return;

        this.flowService.saveFlowVersion(orgId, flowId, payload.data).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Sauvegardé', detail: 'Le flow a été sauvegardé.' });
            },
            error: () => {
                this.gflowRef()?.isDirty.set(true);
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'La sauvegarde a échoué.' });
            },
        });
    }

    onClose(): void {
        this.router.navigate(['/flows']);
    }
}
