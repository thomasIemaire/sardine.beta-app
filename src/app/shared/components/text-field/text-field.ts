import { Component, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

@Component({
    selector: 'app-text-field',
    imports: [InputTextModule],
    template: `
        <input
            [type]="type()"
            pInputText
            [value]="value"
            [placeholder]="placeholder()"
            [disabled]="disabled() || cvaDisabled"
            (input)="onInput($event)"
            (blur)="onBlur()"
            pSize="small"
            class="field__input"
        />
    `,
    styles: [`
        .field__input { width: 100%; }
    `],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => TextFieldComponent),
            multi: true,
        },
    ],
})
export class TextFieldComponent implements ControlValueAccessor {
    placeholder = input<string>('');
    type = input<string>('text');
    disabled = input<boolean>(false);

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

    onInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.value = target.value;
        this.onChange(this.value);
    }

    onBlur(): void {
        this.onTouched();
    }
}
