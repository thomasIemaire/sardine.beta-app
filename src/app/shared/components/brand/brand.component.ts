import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
    selector: 'app-brand',
    imports: [CommonModule, FormsModule],
    template: `
    <div class="brand__container">
        <div class="brand__wrapper" [ngClass]="size">
            <span class="brand__left-part">sen</span>
            <span class="brand__right-part">doc</span>
        </div>
    </div>
    `,
    styleUrls: ['./brand.component.scss']
})
export class BrandComponent {
    @Input() size: 'small' | 'large' = 'small';
}