import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    Component,
    ComponentRef,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    Output,
    SimpleChanges,
    Type,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-config-base',
    imports: [CommonModule, ButtonModule],
    template: `
    <div class="config-base">
      <header class="config-base__header">
        <h3 class="config-base__title">{{ title }}</h3>
        <div class="config-base__actions">
            @if (docFragment) {
                <p-button
                    label="Documentation"
                    icon="fa-solid fa-book"
                    severity="secondary"
                    text
                    rounded
                    size="small"
                    (onClick)="onDocClick()" />
            }
            @if (canDelete) {
                <p-button
                    icon="fa-jelly-fill fa-solid fa-trash"
                    severity="danger"
                    text
                    rounded
                    size="small"
                    (onClick)="onDeleteClick()" />
            }
        </div>
      </header>

      <section class="config-base__body">
        <ng-content select="[slot=before]"></ng-content>
        <ng-container #componentHost></ng-container>
        <ng-content></ng-content>
      </section>

      @if (canSave) {
      <footer class="config-base__footer">
        <p-button
          [label]="cancelLabel"
          severity="secondary"
          size="small"
          rounded
          (click)="onCancelClick()" />

        <p-button
          [label]="saveLabel"
          icon="fa-solid fa-check"
          size="small"
          rounded
          (click)="onSaveClick()" />
      </footer>
      }
    </div>
  `,
    styles: [`
    .config-base { display: flex; flex-direction: column; height: 100%; gap: 1rem; }
    .config-base__header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--surface-300); padding-bottom: .5rem; min-height: 2.5rem; }
    .config-base__title { margin: 0; font-size: 1.1rem; font-weight: 600; }
    .config-base__actions { display: flex; align-items: center; gap: .25rem; }
    .config-base__body { flex: 1 1 auto; overflow: auto; display: flex; flex-direction: column; gap: .75rem; }
    .config-base__footer { display: flex; justify-content: flex-end; gap: .5rem; border-top: 1px solid var(--surface-300); padding-top: .5rem; }
  `],
})
export class ConfigBase implements AfterViewInit, OnChanges, OnDestroy {

    @Input() title = '';
    @Input() cancelLabel = 'Annuler';
    @Input() saveLabel = 'Sauvegarder';
    @Input() component: Type<unknown> | null = null;
    @Input() componentInputs: Record<string, unknown> | null = null;
    @Input() canDelete: boolean = true;
    @Input() canSave: boolean = true;
    @Input() docFragment: string | null = null;

    @Output() cancel = new EventEmitter<void>();
    @Output() save = new EventEmitter<void>();
    @Output() delete = new EventEmitter<void>();
    @Output() configChange = new EventEmitter<unknown>();
    @Output() docNavigate = new EventEmitter<string>();

    @ViewChild('componentHost', { read: ViewContainerRef }) componentHost!: ViewContainerRef;

    private innerRef: ComponentRef<unknown> | null = null;
    private configSub: Subscription | null = null;
    private viewReady = false;

    ngAfterViewInit(): void {
        this.viewReady = true;
        this.renderComponent();
        this.applyInputs();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!this.viewReady) {
            return;
        }

        if (changes['component']) {
            this.renderComponent();
        }

        else if (changes['componentInputs']) {
            this.applyInputs();
        }
    }

    ngOnDestroy(): void {
        this.destroyInner();
    }

    onCancelClick() { this.cancel.emit(); }
    onSaveClick() { this.save.emit(); }
    onDeleteClick() { this.delete.emit(); }
    onDocClick() {
        this.docNavigate.emit(this.docFragment || '');
    }

    private renderComponent() {
        this.destroyInner();

        if (!this.component || !this.componentHost) {
            return;
        }

        this.innerRef = this.componentHost.createComponent(this.component);
        this.bindOutputs();
        this.applyInputs();
    }

    private applyInputs() {
        if (!this.innerRef || !this.componentInputs) {
            return;
        }

        for (const [key, value] of Object.entries(this.componentInputs)) {
            if (this.innerRef.setInput) {
                this.innerRef.setInput(key, value);
            } else {
                (this.innerRef.instance as Record<string, unknown>)[key] = value;
            }
        }
    }

    private bindOutputs() {
        const instance: any = this.innerRef?.instance;
        const emitter = instance?.configChange;

        if (emitter?.subscribe) {
            this.configSub = emitter.subscribe((evt: unknown) => this.configChange.emit(evt));
        }
    }

    private destroyInner() {
        if (this.configSub) {
            this.configSub.unsubscribe();
            this.configSub = null;
        }

        if (this.innerRef) {
            this.innerRef.destroy();
            this.innerRef = null;
        }

        if (this.componentHost) {
            this.componentHost.clear();
        }
    }
}
