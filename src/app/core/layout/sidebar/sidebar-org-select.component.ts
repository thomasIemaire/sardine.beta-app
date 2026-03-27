import { Component, ElementRef, HostListener, output, signal } from '@angular/core';

interface Organization {
    id: string;
    name: string;
    subtitle?: string;
    initials: string;
}

@Component({
    selector: 'app-sidebar-org-select',
    template: `
        @if (isOpen()) {
            <div class="org-panel">
                <button class="org-row" (click)="addOrg()">
                    <div class="org-row__avatar org-row__avatar--icon"><i class="fa-solid fa-plus"></i></div>
                    <span class="org-row__name">Ajouter une organisation</span>
                </button>

                <div class="org-row org-row--static">
                    <div class="org-row__avatar org-row__avatar--icon"><i class="fa-regular fa-user"></i></div>
                    <span class="org-row__name">{{ currentUser }}</span>
                </div>

                <div class="org-panel__separator"></div>

                @for (org of orgs; track org.id) {
                    <button class="org-row" [class.is-active]="org.id === currentOrg().id" (click)="select(org)">
                        <div class="org-row__avatar">{{ org.initials }}</div>
                        <div class="org-row__info">
                            <span class="org-row__name">{{ org.name }}</span>
                            @if (org.subtitle) {
                                <span class="org-row__subtitle">{{ org.subtitle }}</span>
                            }
                        </div>
                        @if (org.id === currentOrg().id) {
                            <i class="fa-solid fa-check org-row__check"></i>
                        }
                    </button>
                }

                <button class="org-row org-row--more" (click)="viewAll()">
                    <span class="org-row__name">Voir plus</span>
                </button>
            </div>
        }

        <div class="org-row org-row--trigger" [class.is-open]="isOpen()" (click)="toggle()">
            <div class="org-row__avatar">{{ currentOrg().initials }}</div>
            <span class="org-row__name">{{ currentOrg().name }}</span>
            <div class="org-row__chevron">
                <i class="fa-solid fa-chevron-up"></i>
                <i class="fa-solid fa-chevron-down"></i>
            </div>
        </div>
    `,
    styles: `
        :host {
            display: block;
            overflow: hidden;
        }

        /* ── Shared row ──────────────────────────────────── */
        .org-row {
            display: flex;
            align-items: center;
            gap: 0.875rem;
            width: 100%;
            padding: 0.875rem;
            border: none;
            background: none;
            cursor: pointer;
            text-align: left;
            transition: background 0.15s;

            &:hover { background: var(--background-color-50); }
            &.is-active .org-row__name { font-weight: 700; }
            &--static { cursor: default; &:hover { background: none; } }
            &--more { justify-content: center; .org-row__name { flex: unset; font-size: 0.6125rem; font-weight: 500; color: var(--p-text-muted-color); } }
            &--trigger {
                position: relative;
                z-index: 1;
                background: var(--background-color-0);
                border-top: solid 1px var(--surface-border);
            }
            &--trigger.is-open { background: var(--background-color-50); }
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
    readonly currentUser = 'Thomas Lemaire';

    readonly orgs: Organization[] = [
        { id: '1', name: 'Sendoc', initials: 'SD' },
        { id: '2', name: 'Terre du sud', subtitle: 'Client Sendoc', initials: 'TS' },
        { id: '3', name: "T'Rhéa", subtitle: 'Client Sendoc', initials: 'TR' },
    ];

    readonly currentOrg = signal<Organization>(this.orgs[0]);
    readonly isOpen = signal(false);
    readonly openChange = output<boolean>();

    constructor(private el: ElementRef) {}

    toggle(): void {
        const next = !this.isOpen();
        this.isOpen.set(next);
        this.openChange.emit(next);
    }

    select(org: Organization): void {
        this.currentOrg.set(org);
        this.isOpen.set(false);
        this.openChange.emit(false);
    }

    addOrg(): void { this.isOpen.set(false); this.openChange.emit(false); }
    viewAll(): void { this.isOpen.set(false); this.openChange.emit(false); }

    @HostListener('document:click', ['$event'])
    onOutsideClick(event: MouseEvent): void {
        if (this.isOpen() && !this.el.nativeElement.contains(event.target)) {
            this.isOpen.set(false);
            this.openChange.emit(false);
        }
    }
}
