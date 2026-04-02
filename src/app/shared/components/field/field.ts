import { Component, computed, input } from "@angular/core";

export type FieldHint = 'required' | 'recommended' | 'optional' | null;

@Component({
    selector: "app-field",
    template: `
        <div class="field" [class.has-error]="error()">
            @if (label()) {
                <div class="field__header">
                    <label class="field__label">
                        {{ label() }}
                        @if (hint() === 'required') {
                            <span class="field__required">*</span>
                        }
                    </label>
                    @if (hintLabel()) {
                        <span class="field__hint">{{ hintLabel() }}</span>
                    }
                </div>
            }
            <div class="field__content">
                <ng-content />
            </div>
            @if (error()) {
                <span class="field__error">{{ error() }}</span>
            }
        </div>
    `,
    styles: [`
        .field {
            display: flex;
            flex-direction: column;
            gap: .125rem;

            &__header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 0.5rem;
            }

            &__label {
                font-size: 0.75rem;
                font-weight: 500;
                color: var(--p-text-color);
            }

            &__required {
                color: var(--p-red-500);
                margin-left: 0.25rem;
            }

            &__hint {
                font-size: 0.625rem;
                font-weight: 400;
                color: var(--p-text-muted-color);
            }

            &__content {
                width: 100%;
            }

            &__error {
                font-size: 0.75rem;
                color: var(--p-red-500);
            }
        }
    `],
})
export class FieldComponent {
    label = input<string>('');
    required = input<boolean>(false);
    recommended = input<boolean>(false);
    optional = input<boolean>(false);
    error = input<string>('');

    hint = computed<FieldHint>(() => {
        if (this.required()) return 'required';
        if (this.recommended()) return 'recommended';
        if (this.optional()) return 'optional';
        return null;
    });

    hintLabel = computed(() => {
        const hint = this.hint();
        if (hint === 'recommended') return '(Recommandé)';
        if (hint === 'optional') return '(Optionnel)';
        return null;
    });
}
