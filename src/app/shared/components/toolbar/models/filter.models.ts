export type FilterType = 'select' | 'multiselect' | 'date';

export interface FilterOption {
  value: any;
  label: string;
}

export interface FilterDefinition {
  id: string;
  label: string;
  type: FilterType;
  options?: FilterOption[];
  dateRange?: boolean;
}

export interface ActiveFilter {
  definitionId: string;
  label: string;
  value: any;
}
