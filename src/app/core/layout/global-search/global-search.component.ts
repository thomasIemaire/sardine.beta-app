import {
    Component,
    computed,
    DestroyRef,
    ElementRef,
    HostListener,
    inject,
    OnInit,
    signal,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of, combineLatest } from 'rxjs';
import { GlobalSearchService } from './global-search.service';
import { AgentService } from '../../services/agent.service';
import { FlowService } from '../../services/flow.service';
import { ContextSwitcherService } from '../context-switcher/context-switcher.service';

export interface SearchResult {
    id: string;
    label: string;
    description: string;
    type: 'agent' | 'flow';
    icon: string;
    route: string[];
    queryParams?: Record<string, string>;
}

@Component({
    selector: 'app-global-search',
    template: `
        <div class="gs-backdrop" (click)="close()"></div>

        <div class="gs-panel" role="dialog" aria-modal="true">
            <div class="gs-input-row">
                <i class="fa-regular fa-magnifying-glass gs-icon"></i>
                <input
                    #searchInput
                    class="gs-input"
                    type="text"
                    placeholder="Rechercher agents, flows…"
                    autocomplete="off"
                    [value]="query()"
                    (input)="onInput($event)"
                    (keydown)="onKeydown($event)"
                />
                <span class="gs-hint">ESC</span>
            </div>

            @if (loading()) {
                <div class="gs-loading">
                    <i class="fa-regular fa-spinner fa-spin"></i>
                </div>
            } @else if (query().length >= 2) {
                @if (results().length === 0) {
                    <div class="gs-empty">Aucun résultat pour « {{ query() }} »</div>
                } @else {
                    <ul class="gs-results" #resultsList>
                        @for (group of groupedResults(); track group.type) {
                            <li class="gs-group-label">{{ group.label }}</li>
                            @for (r of group.items; track r.id) {
                                <li
                                    class="gs-result"
                                    [class.is-active]="activeIndex() === r.__index"
                                    (click)="navigate(r)"
                                    (mouseenter)="activeIndex.set(r.__index)">
                                    <i [class]="'gs-result__icon ' + r.icon"></i>
                                    <div class="gs-result__body">
                                        <span class="gs-result__label">{{ r.label }}</span>
                                        @if (r.description) {
                                            <span class="gs-result__desc">{{ r.description }}</span>
                                        }
                                    </div>
                                    <i class="fa-regular fa-arrow-right gs-result__arrow"></i>
                                </li>
                            }
                        }
                    </ul>
                }
            } @else {
                <div class="gs-empty gs-empty--hint">Tapez au moins 2 caractères pour rechercher</div>
            }
        </div>
    `,
    styles: `
        :host {
            position: fixed;
            inset: 0;
            z-index: 300;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding-top: 8vh;
            animation: gs-fade-in 0.1s ease both;
        }

        @keyframes gs-fade-in {
            from { opacity: 0; }
            to   { opacity: 1; }
        }

        .gs-backdrop {
            position: absolute;
            inset: 0;
            background: color-mix(in srgb, var(--background-color-0) 60%, transparent);
            backdrop-filter: blur(4px);
        }

        .gs-panel {
            position: relative;
            z-index: 1;
            width: 100%;
            max-width: 560px;
            background: var(--background-color-0);
            border: 1px solid var(--surface-border);
            border-radius: var(--radius-l);
            box-shadow: 0 20px 60px color-mix(in srgb, #000 20%, transparent);
            overflow: hidden;
            animation: gs-slide-down 0.15s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes gs-slide-down {
            from { opacity: 0; transform: translateY(-8px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .gs-input-row {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.875rem 1rem;
            border-bottom: 1px solid var(--surface-border);
        }

        .gs-icon {
            font-size: 0.9375rem;
            color: var(--p-text-muted-color);
            flex-shrink: 0;
        }

        .gs-input {
            flex: 1;
            border: none;
            outline: none;
            background: transparent;
            font-family: inherit;
            font-size: 0.9375rem;
            font-weight: 500;
            color: var(--p-text-color);

            &::placeholder { color: var(--p-text-muted-color); }
        }

        .gs-hint {
            font-size: 0.625rem;
            font-weight: 600;
            color: var(--p-text-muted-color);
            background: var(--background-color-100);
            border: 1px solid var(--surface-border);
            border-radius: 4px;
            padding: 0.125rem 0.375rem;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            flex-shrink: 0;
        }

        .gs-loading {
            padding: 1.5rem;
            text-align: center;
            color: var(--p-text-muted-color);
            font-size: 0.875rem;
        }

        .gs-empty {
            padding: 1.25rem 1rem;
            font-size: 0.8125rem;
            color: var(--p-text-muted-color);
            text-align: center;

            &--hint { color: var(--p-text-muted-color); }
        }

        .gs-results {
            list-style: none;
            margin: 0;
            padding: 0.375rem 0;
            max-height: 360px;
            overflow-y: auto;
        }

        .gs-group-label {
            font-size: 0.625rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--p-text-muted-color);
            padding: 0.625rem 1rem 0.25rem;
        }

        .gs-result {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.5rem 1rem;
            cursor: pointer;
            border-radius: 0;
            transition: background 0.1s ease;

            &.is-active { background: var(--background-color-100); }

            &__icon {
                font-size: 0.8125rem;
                color: var(--p-text-muted-color);
                width: 1rem;
                text-align: center;
                flex-shrink: 0;
            }

            &__body {
                display: flex;
                flex-direction: column;
                gap: 0.1rem;
                flex: 1;
                min-width: 0;
            }

            &__label {
                font-size: 0.8125rem;
                font-weight: 600;
                color: var(--p-text-color);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            &__desc {
                font-size: 0.6875rem;
                color: var(--p-text-muted-color);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            &__arrow {
                font-size: 0.6875rem;
                color: var(--p-text-muted-color);
                opacity: 0;
                transition: opacity 0.1s ease;
            }

            &.is-active &__arrow { opacity: 1; }
        }
    `,
})
export class GlobalSearchComponent implements OnInit {
    private readonly searchService = inject(GlobalSearchService);
    private readonly agentService = inject(AgentService);
    private readonly flowService = inject(FlowService);
    private readonly contextSwitcher = inject(ContextSwitcherService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

    readonly query = signal('');
    readonly loading = signal(false);
    readonly results = signal<(SearchResult & { __index: number })[]>([]);
    readonly activeIndex = signal(0);

    private readonly query$ = new Subject<string>();

    readonly groupedResults = computed(() => {
        const all = this.results();
        const agents = all.filter((r) => r.type === 'agent');
        const flows = all.filter((r) => r.type === 'flow');
        const groups = [];
        if (agents.length) groups.push({ type: 'agent', label: 'Agents', items: agents });
        if (flows.length) groups.push({ type: 'flow', label: 'Flows', items: flows });
        return groups;
    });

    ngOnInit(): void {
        this.query$
            .pipe(
                debounceTime(250),
                distinctUntilChanged(),
                switchMap((q) => {
                    if (q.length < 2) {
                        this.loading.set(false);
                        this.results.set([]);
                        return of(null);
                    }
                    const orgId = this.contextSwitcher.selectedId();
                    if (!orgId) return of(null);

                    this.loading.set(true);
                    return combineLatest([
                        this.agentService.getAgents(orgId, { page: 1, pageSize: 5, search: q }),
                        this.flowService.getFlows(orgId, { page: 1, pageSize: 5, search: q }),
                    ]);
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((res) => {
                if (!res) return;
                const [agentsPage, flowsPage] = res;
                let idx = 0;
                const merged: (SearchResult & { __index: number })[] = [
                    ...agentsPage.items.map((a) => ({
                        id: a.id,
                        label: a.name,
                        description: a.description,
                        type: 'agent' as const,
                        icon: 'fa-regular fa-microchip-ai',
                        route: ['/agents'],
                        queryParams: { select: a.id },
                        __index: idx++,
                    })),
                    ...flowsPage.items.map((f) => ({
                        id: f.id,
                        label: f.name,
                        description: f.description,
                        type: 'flow' as const,
                        icon: 'fa-light fa-chart-diagram',
                        route: ['/flows', f.id],
                        queryParams: { orgId: (f as any).organizationId },
                        __index: idx++,
                    })),
                ];
                this.results.set(merged);
                this.activeIndex.set(0);
                this.loading.set(false);
            });

        // Autofocus
        setTimeout(() => this.searchInput()?.nativeElement.focus());
    }

    onInput(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.query.set(value);
        this.query$.next(value);
    }

    onKeydown(event: KeyboardEvent): void {
        const total = this.results().length;
        if (total === 0) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.activeIndex.update((i) => Math.min(i + 1, total - 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.activeIndex.update((i) => Math.max(i - 1, 0));
        } else if (event.key === 'Enter') {
            const active = this.results().find((r) => r.__index === this.activeIndex());
            if (active) this.navigate(active);
        }
    }

    @HostListener('document:keydown.escape')
    close(): void {
        this.searchService.close();
    }

    navigate(result: SearchResult): void {
        this.searchService.close();
        this.router.navigate(result.route, result.queryParams ? { queryParams: result.queryParams } : {});
    }
}
