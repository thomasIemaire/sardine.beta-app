import { Component, forwardRef, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { SelectModule } from 'primeng/select';

export interface SelectOption {
    label: string;
    value: string;
}

@Component({
    selector: 'app-select-field',
    imports: [FormsModule, SelectModule],
    template: `
        <p-select
            [options]="options()"
            [optionLabel]="optionLabel()"
            [optionValue]="optionValue()"
            [placeholder]="placeholder()"
            [disabled]="disabled() || cvaDisabled"
            [ngModel]="value"
            (onChange)="onSelectionChange($event)"
            (onBlur)="onBlur()"
            class="field__select"
            size="small"
            appendTo="body"
        />
    `,
    styles: [`
        .field__select { width: 100%; }
    `],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => SelectFieldComponent),
            multi: true,
        },
    ],
})
export class SelectFieldComponent implements ControlValueAccessor {
    placeholder = input<string>('Sélectionner');
    options = input<SelectOption[]>([]);
    optionLabel = input<string>('label');
    optionValue = input<string>('value');
    disabled = input<boolean>(false);

    selectionChange = output<string>();

    value: string = '';
    cvaDisabled = false;

    private onChange: (value: string) => void = () => {};
    private onTouched: () => void = () => {};

    writeValue(value: string): void {
        this.value = value || '';
    }

    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.cvaDisabled = isDisabled;
    }

    onSelectionChange(event: { value: string }): void {
        this.value = event.value;
        this.onChange(this.value);
        this.selectionChange.emit(this.value);
    }

    onBlur(): void {
        this.onTouched();
    }
}
