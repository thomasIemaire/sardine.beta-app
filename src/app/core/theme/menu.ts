export const menu = {
  root: {
    background: '{content.background}',
    borderColor: '{content.border.color}',
    color: '{content.color}',
    borderRadius: '{content.border.radius}',
    shadow: '{overlay.navigation.shadow}',
    transitionDuration: '{transition.duration}',
  },
  list: {
    padding: '0rem',
    gap: '{navigation.list.gap}',
  },
  item: {
    focusBackground: '{navigation.item.focus.background}',
    color: '{navigation.item.color}',
    focusColor: '{navigation.item.focus.color}',
    padding: '.375rem 0.625rem',
    borderRadius: '{navigation.item.border.radius}',
    gap: '{navigation.item.gap}',
    icon: {
      color: '{navigation.item.icon.color}',
      focusColor: '{navigation.item.icon.focus.color}',
    },
  },
  submenuLabel: {
    padding: '{navigation.submenu.label.padding}',
    fontWeight: '{navigation.submenu.label.font.weight}',
    background: '{navigation.submenu.label.background}',
    color: '{navigation.submenu.label.color}',
  },
  separator: {
    borderColor: '{content.border.color}',
  },
};
