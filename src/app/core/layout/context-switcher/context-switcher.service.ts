import { Injectable, signal } from '@angular/core';

export interface CtxOrganization {
  id: string;
  name: string;
  subtitle?: string;
  initials: string;
}

const STORAGE_KEY = 'defaultOrgId';

@Injectable({ providedIn: 'root' })
export class ContextSwitcherService {
  readonly organizations = signal<CtxOrganization[]>([
    { id: '1', name: 'Sendoc', initials: 'SD' },
    { id: '2', name: 'Terre du sud', subtitle: 'Client Sendoc', initials: 'TS' },
    { id: '3', name: "T'Rhéa", subtitle: 'Client Sendoc', initials: 'TR' },
    { id: '4', name: 'Agri Conseil', subtitle: 'Partenaire', initials: 'AC' },
    { id: '5', name: 'BioFerme', subtitle: 'Client Sendoc', initials: 'BF' },
  ]);

  private readonly storedDefault = localStorage.getItem(STORAGE_KEY);

  readonly defaultOrgId = signal<string | null>(this.storedDefault);
  readonly selectedId = signal<string>(this.storedDefault ?? this.organizations()[0].id);
  readonly visible = signal(!this.storedDefault);
  readonly isManualOpen = signal(false);

  open(): void { this.isManualOpen.set(true); this.visible.set(true); }
  close(): void { this.visible.set(false); this.isManualOpen.set(false); }

  select(org: CtxOrganization, saveAsDefault: boolean): void {
    this.selectedId.set(org.id);
    if (saveAsDefault) {
      localStorage.setItem(STORAGE_KEY, org.id);
      this.defaultOrgId.set(org.id);
    }
  }

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
    return id ? (this.organizations().find(o => o.id === id)?.name ?? null) : null;
  }
}
