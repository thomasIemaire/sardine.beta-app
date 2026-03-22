export interface SidebarMenuItem {
  label: string;
  icon?: string;
  link: string;
  badge?: number;
  exact?: boolean;
}

export interface SidebarMenu {
  title?: string;
  items: SidebarMenuItem[];
}
