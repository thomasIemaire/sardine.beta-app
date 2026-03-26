import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';

export interface PresenceUser {
    id: string;
    name: string;
    avatarUrl?: string;
}

@Component({
    selector: 'app-presence-bar',
    imports: [CommonModule, TooltipModule],
    templateUrl: './presence-bar.html',
    styleUrls: ['./presence-bar.scss']
})
export class PresenceBarComponent {
    users = input<PresenceUser[]>([]);
    maxVisible = input(5);

    visibleUsers = computed(() => this.users().slice(0, this.maxVisible()));
    overflowCount = computed(() => Math.max(0, this.users().length - this.maxVisible()));

    getInitials(name: string): string {
        return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    }
}
