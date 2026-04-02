import { Injectable, computed, inject, signal } from '@angular/core';
import { OrganizationService, ApiOrganization } from '../../services/organization.service';
import { AuthService } from '../../services/auth.service';

export interface CtxOrganization {
  id: string;
  name: string;
  subtitle?: string;
  initials: string;
  isPersonal: boolean;
  locked: boolean;
}

const STORAGE_KEY = 'defaultOrgId';

function toInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

@Injectable({ providedIn: 'root' })
export class ContextSwitcherService {
  private readonly orgService = inject(OrganizationService);
  private readonly auth = inject(AuthService);

  readonly organizations = signal<CtxOrganization[]>([]);
  private readonly rawOrganizations = signal<ApiOrganization[]>([]);
  readonly selectedOrganization = computed<ApiOrganization | null>(() => {
    const id = this.selectedId();
    return this.rawOrganizations().find((o) => o.id === id) ?? null;
  });

  private readonly storedDefault = localStorage.getItem(STORAGE_KEY);

  readonly defaultOrgId = signal<string | null>(this.storedDefault);
  readonly selectedId = signal<string | null>(this.storedDefault);
  readonly visible = signal(false);
  readonly isManualOpen = signal(false);

  loadOrganizations(): void {
    this.orgService.getMyOrganizations().subscribe((orgs) => {
      this.rawOrganizations.set(orgs);
      const user = this.auth.currentUser();
      const mapped: CtxOrganization[] = orgs.map((o) => {
        const isPersonal = o.is_private;
        const name = isPersonal && user
          ? `${user.first_name} ${user.last_name}`
          : o.name;
        return {
          id: o.id,
          name,
          subtitle: isPersonal ? 'Espace personnel' : undefined,
          initials: toInitials(name),
          isPersonal,
          locked: !o.is_active_member,
        };
      });

      this.organizations.set(mapped);

      // Auto-select if nothing stored or stored ID no longer valid (skip locked orgs)
      const currentValid = this.selectedId() && mapped.find((o) => o.id === this.selectedId() && !o.locked);
      if (!currentValid) {
        const first = mapped.find((o) => !o.locked);
        if (first) {
          this.selectedId.set(first.id);
          // Show switcher only if multiple orgs and no stored default
          if (!this.storedDefault && mapped.filter((o) => !o.locked).length > 1) this.visible.set(true);
        }
      }
    });
  }

  appendOrganization(org: ApiOrganization): void {
    this.rawOrganizations.update((list) => [...list, org]);
    this.organizations.update((list) => [
      ...list,
      {
        id: org.id,
        name: org.name,
        initials: toInitials(org.name),
        isPersonal: org.is_private,
        locked: !org.is_active_member,
      },
    ]);
  }

  select(org: CtxOrganization, saveAsDefault: boolean): void {
    if (org.locked) return;
    this.selectedId.set(org.id);
    if (saveAsDefault) {
      localStorage.setItem(STORAGE_KEY, org.id);
      this.defaultOrgId.set(org.id);
    }
  }

  open(): void { this.isManualOpen.set(true); this.visible.set(true); }
  close(): void { this.visible.set(false); this.isManualOpen.set(false); }

  setDefault(org: CtxOrganization): void {
    localStorage.setItem(STORAGE_KEY, org.id);
    this.defaultOrgId.set(org.id);
  }

  clearDefault(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.defaultOrgId.set(null);
  }

  defaultOrgName(): string | null {
    const id = this.defaultOrgId();
    return id ? (this.organizations().find((o) => o.id === id)?.name ?? null) : null;
  }
}
