import { Component, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { FlowsService, UserService, FlowVersionResponse } from '../core/gflow-stubs';

@Component({
    selector: 'app-version-panel',
    imports: [CommonModule, ButtonModule],
    templateUrl: './version-panel.html',
    styleUrls: ['./version-panel.scss']
})
export class VersionPanelComponent implements OnInit {
    private flowsService = inject(FlowsService);
    private userService = inject(UserService);
    private destroyRef = inject(DestroyRef);

    flowId = input.required<string>();
    close = output<void>();
    restore = output<string>();

    versions = signal<FlowVersionResponse[]>([]);
    loading = signal(false);

    ngOnInit(): void {
        this.loadVersions();
    }

    loadVersions(): void {
        const orgId = this.userService.getCurrentOrgId();
        if (!orgId) return;

        this.loading.set(true);
        this.flowsService.getVersions(orgId, this.flowId()).pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: versions => {
                this.versions.set(versions);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    getAuthorName(version: FlowVersionResponse): string {
        if (!version.created_by) return 'Système';
        return `${version.created_by.first_name} ${version.created_by.last_name}`.trim();
    }

    onRestore(versionId: string): void {
        this.restore.emit(versionId);
    }
}
