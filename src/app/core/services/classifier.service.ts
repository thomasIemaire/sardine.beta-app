import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface ClassifierVersion {
    model: string;
    version: string;
    classes: string[];
    published_at?: string;
}

@Injectable({ providedIn: 'root' })
export class ClassifierService {
    private readonly http = inject(HttpClient);
    private readonly base = environment.apiUrl;

    getVersions() {
        return this.http.get<ClassifierVersion[]>(`${this.base}/classifiers/versions`);
    }
}
