import { Component, computed, ElementRef, HostListener, inject, output, signal } from '@angular/core';
import { ContextSwitcherService, CtxOrganization } from '../context-switcher/context-switcher.service';
import { CreateOrgDialogComponent } from '../../../shared/components/create-org-dialog/create-org-dialog.component';

@Component({
    selector: 'app-sidebar-org-select',
    imports: [CreateOrgDialogComponent],
    template: `
        @if (selectedOrg(); as org) {
            @if (isOpen()) {
                <div class="org-panel">
                    <button class="org-row" (click)="addOrg()">
                        <div class="org-row__avatar org-row__avatar--icon"><i class="fa-solid fa-plus"></i></div>
                        <span class="org-row__name">Ajouter une organisation</span>
                    </button>

                    <div class="org-panel__separator"></div>

                    @for (o of contextSwitcher.organizations().slice(0, 4); track o.id) {
                        <button class="org-row" [class.is-active]="o.id === contextSwitcher.selectedId()" [class.is-locked]="o.locked" (click)="!o.locked && select(o)">
                            <div class="org-row__avatar">
                                @if (o.locked) { <i class="fa-regular fa-lock"></i> } @else { {{ o.initials }} }
                            </div>
                            <div class="org-row__info">
                                <span class="org-row__name">{{ o.name }}</span>
                                @if (o.subtitle) {
                                    <span class="org-row__subtitle">{{ o.subtitle }}</span>
                                }
                                @if (o.locked) {
                                    <span class="org-row__subtitle">Accès suspendu</span>
                                }
                            </div>
                            @if (o.id === contextSwitcher.selectedId()) {
                                <i class="fa-solid fa-check org-row__check"></i>
                            }
                        </button>
                    }

                    @if (contextSwitcher.organizations().length > 4) {
                        <button class="org-row org-row--more" (click)="viewAll()">
                            <span class="org-row__name">Voir plus</span>
                        </button>
                    }
                </div>
            }

            <div class="org-row org-row--trigger" [class.is-open]="isOpen()" (click)="toggle()">
                <div class="org-row__avatar">{{ org.initials }}</div>
                <span class="org-row__name">{{ org.name }}</span>
                <div class="org-row__chevron">
                    <i class="fa-solid fa-chevron-up"></i>
                    <i class="fa-solid fa-chevron-down"></i>
                </div>
            </div>
        } @else {
            <div class="org-row org-row--trigger org-row--loading">
                <div class="org-row__avatar org-row__avatar--icon"><i class="fa-regular fa-spinner fa-spin"></i></div>
                <span class="org-row__name">Chargement…</span>
            </div>
        }

        <app-create-org-dialog [(visible)]="showCreateDialog" />
    `,
    styles: `
        :host {
            display: block;
            overflow: hidden;
        }

        /* ── Shared row ──────────────────────────────────── */
        .org-row {
            position: relative;
            display: flex;
            align-items: center;
            gap: 0.875rem;
            width: 100%;
            padding: 0.875rem;
            border: none;
            background: none;
            cursor: pointer;
            text-align: left;
            transition: transform 0.1s ease-in-out;

            &::before {
                content: '';
                position: absolute;
                inset: 0;
                background: transparent;
                z-index: -1;
                transition: background 0.75s cubic-bezier(0.075, 0.82, 0.165, 1);
            }

            &:not(&--trigger):hover::before { animation: org-row-pulse 1.5s infinite; }

            &.is-active .org-row__name { font-weight: 700; }
            &--static { cursor: default; &:hover::before { animation: none; } }
            &--loading { cursor: default; &:hover::before { animation: none; } }
            &--more { justify-content: center; .org-row__name { flex: unset; font-size: 0.6125rem; font-weight: 500; color: var(--p-text-muted-color); } }
            &.is-locked { cursor: not-allowed; opacity: 0.55; }
            &--trigger {
                position: relative;
                z-index: 1;
                background: var(--background-color-0);
                border-top: solid 1px var(--surface-border);
                &:hover { background: var(--background-color-50); }
            }
            &--trigger.is-open { background: var(--background-color-50); }
        }

        @keyframes org-row-pulse {
            0%   { background: var(--background-color-100); }
            50%  { background: var(--background-color-200); }
            100% { background: var(--background-color-100); }
        }

        .org-row__avatar {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 1.75rem;
            height: 1.75rem;
            min-width: 1.75rem;
            border-radius: 0.375rem;
            background: var(--background-color-100);
            border: 1px solid var(--surface-border);
            font-size: 0.625rem;
            font-weight: 700;
            color: var(--p-text-color);
            text-transform: uppercase;

            &--icon { color: var(--p-text-muted-color); }
        }

        .org-row__name {
            flex: 1;
            font-size: .75rem;
            font-weight: 600;
            color: var(--p-text-color);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .org-row__info {
            display: flex;
            flex-direction: column;
            line-height: 1.3;
            flex: 1;
            overflow: hidden;
        }

        .org-row__subtitle {
            font-size: 0.6125rem;
            font-weight: 400;
            color: var(--p-text-muted-color);
        }

        .org-row__chevron {
            font-size: 0.5rem;
            color: var(--p-text-muted-color);
            display: flex;
            flex-direction: column;

            i { height: 0.375rem; }
        }

        .org-row__check {
            margin-left: auto;
            font-size: 0.6875rem;
            color: var(--p-primary-500);
        }

        /* ── Panel ───────────────────────────────────────── */
        .org-panel {
            position: relative;
            z-index: 0;
            background: var(--background-color-0);
            animation: slide-up 0.2s ease both;
        }

        @keyframes slide-up {
            from { opacity: 0; transform: translateY(100%); }
            to   { opacity: 1; transform: translateY(0); }
        }

        .org-panel__separator {
            height: 1px;
            background: var(--surface-border);
            margin: 0.25rem 0.875rem;
        }
    `,
})
export class SidebarOrgSelectComponent {
    readonly contextSwitcher = inject(ContextSwitcherService);

    readonly selectedOrg = computed<CtxOrganization | null>(() => {
        const orgs = this.contextSwitcher.organizations();
        const id = this.contextSwitcher.selectedId();
        return orgs.find((o) => o.id === id) ?? orgs[0] ?? null;
    });

    readonly isOpen = signal(false);
    readonly showCreateDialog = signal(false);
    readonly openChange = output<boolean>();

    constructor(private el: ElementRef) {}

    toggle(): void {
        const next = !this.isOpen();
        this.isOpen.set(next);
        this.openChange.emit(next);
    }

    select(org: CtxOrganization): void {
        this.contextSwitcher.select(org, false);
        this.isOpen.set(false);
        this.openChange.emit(false);
    }

    addOrg(): void {
        this.isOpen.set(false);
        this.openChange.emit(false);
        this.showCreateDialog.set(true);
    }
    viewAll(): void { this.isOpen.set(false); this.openChange.emit(false); this.contextSwitcher.open(); }

    @HostListener('document:click', ['$event'])
    onOutsideClick(event: MouseEvent): void {
        if (this.isOpen() && !this.el.nativeElement.contains(event.target)) {
            this.isOpen.set(false);
            this.openChange.emit(false);
        }
    }
}
