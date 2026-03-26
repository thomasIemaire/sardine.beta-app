import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { GflowComponent, FlowSavePayload } from '../../shared/components/gflow/gflow';

@Component({
    selector: 'app-flow-editor',
    imports: [GflowComponent, ToastModule],
    providers: [MessageService],
    template: `
        <p-toast />
        <app-gflow
            [flowId]="flowId"
            [orgId]="orgId"
            [navigateBack]="'/flows'"
            (saveFlow)="onSaveFlow($event)"
            (close)="onClose()" />
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
            from {
                opacity: 0;
                transform: scale(0.97) translateY(12px);
            }
            to {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }
    `]
})
export class FlowEditorPage implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    flowId: string | null = null;
    orgId: string | null = null;

    ngOnInit(): void {
        this.flowId = this.route.snapshot.paramMap.get('id');
    }

    onSaveFlow(_payload: FlowSavePayload): void {
        // No-op stub — real implementation would call an API
    }

    onClose(): void {
        this.router.navigate(['/flows']);
    }
}
