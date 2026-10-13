/**
 * Design tokens extracted from the GeronTON Figma file. Every screen should
 * pull colors and font families from here instead of hardcoding values so the
 * app stays consistent with the design system. Text colors meet WCAG AA
 * (4.5:1) on the backgrounds they are used with.
 */
export const COLORS = {
  primary: "#1A65B5",
  green: "#077A72",
  heading: "#001413",
  text: "#191A1D",
  grey500: "#666666",
  grey400: "#767676",
  grey300: "#CCCCCC",
  dangerBg: "#FEF1F2",
  dangerBadgeBg: "#FFE5E0",
  danger: "#C4262F",
  warningBg: "#FFF3E0",
  warning: "#B33F00",
  successBg: "#E6F2F1",
  success: "#077A72",
  chipBg: "#EEF4FB",
  cardBorder: "#CCCCCC",
  /** Hairlines between rows inside a grouped section. */
  divider: "#E3E6EA",
  /** Pressed or selected background of a row. */
  surface: "#F6F8FA",
  white: "#FFFFFF",
};

export const FONTS = {
  regular: "NunitoSans_400Regular",
  semiBold: "NunitoSans_600SemiBold",
  extraBold: "NunitoSans_800ExtraBold",
};

/**
 * Spacing scale. Screens use `screen` as their side margin and pick every other
 * gap from this list, so the same distances repeat across the app.
 */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  screen: 20,
};

/**
 * The only two corner radii: `control` for buttons, inputs and chips, `group`
 * for a grouped section. Pills and avatars are fully round.
 */
export const RADIUS = {
  control: 8,
  group: 12,
};

/** Height of buttons and inputs; also the minimum comfortable touch target. */
export const CONTROL_HEIGHT = 52;

/**
 * Type scale. Body text is 16 so older caregivers can read it without zooming.
 */
export const TYPE = {
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 24,
    lineHeight: 30,
    color: COLORS.heading,
  },
  section: {
    fontFamily: FONTS.extraBold,
    fontSize: 17,
    lineHeight: 24,
    color: COLORS.heading,
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.text,
  },
  bodyStrong: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.heading,
  },
  label: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.heading,
  },
  caption: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.grey500,
  },
} as const;
