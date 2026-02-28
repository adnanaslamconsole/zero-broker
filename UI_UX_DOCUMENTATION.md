# ZeroBroker UI/UX Documentation

This document provides guidelines for the modern UI/UX implementation of the ZeroBroker platform, including component usage, design principles, and maintenance instructions.

## Design Principles

- **Modern & Minimalist**: Use clean lines, ample whitespace, and a focused color palette.
- **High Contrast & Readability**: Ensure text is easily readable against backgrounds, following WCAG 2.1 AA standards.
- **Interactive & Engaging**: Use smooth animations and transitions to provide feedback and guide the user.
- **Mobile-First**: All components are designed to be fully responsive and touch-friendly.
- **Accessibility**: Include ARIA labels, keyboard navigation support, and semantic HTML.

## Core Components

### 1. Header (`Header.tsx`)
- **Usage**: Main navigation component present on all pages.
- **Features**:
  - Transparent-to-blur backdrop on scroll.
  - Animated submenus using Framer Motion.
  - Mobile-responsive drawer navigation.
  - Accessibility: ARIA labels for all interactive elements.

### 2. Hero Section (`HeroSection.tsx`)
- **Usage**: Top section of the homepage.
- **Features**:
  - Dynamic tab-based search interface.
  - Backdrop blur effects on the search card.
  - Responsive typography with high-impact headlines.

### 3. Login Page (`Login.tsx`)
- **Usage**: Authentication gateway for all users.
- **Features**:
  - Multi-method login (Password, Email OTP, Phone OTP).
  - Social login integration (Google, GitHub).
  - Real-time form validation with visual feedback.
  - "Remember Me" and "Forgot Password" functionality.
  - Accessibility: Focus states, error announcements, and keyboard shortcuts.

### 4. Footer (`Footer.tsx`)
- **Usage**: Site-wide footer with navigation and newsletter.
- **Features**:
  - Modern grid layout with categorized links.
  - Animated social media icons.
  - Newsletter subscription form with validation.

## Styling Guidelines

### Tailwind CSS
- **Colors**: Use the defined CSS variables (`--primary`, `--accent`, `--background`, etc.) for consistency.
- **Spacing**: Follow the standard Tailwind spacing scale. Use `mobile-optimized-spacing` for section vertical padding.
- **Rounded Corners**: Prefer `rounded-2xl` and `rounded-3xl` for a modern, soft feel.
- **Shadows**: Use custom shadows with opacity (e.g., `shadow-primary/10`) for depth without clutter.

### Animations (Framer Motion)
- **Entrance Animations**: Use `initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}` for subtle entrance effects.
- **Hover States**: Use `whileHover={{ scale: 1.05 }}` for interactive elements.
- **Transitions**: Prefer `transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}` for natural movement.

## Maintenance Instructions

### Adding New Components
1. **Consistency**: Check existing components in `src/components/` for style patterns.
2. **Accessibility**: Always add ARIA labels and ensure keyboard accessibility.
3. **Responsiveness**: Test on mobile, tablet, and desktop views.
4. **Utility**: Use the `cn` utility from `src/lib/utils.ts` for conditional class merging.

### Updating Styles
1. **Global Styles**: Modify `src/index.css` for site-wide CSS variables.
2. **Theme Configuration**: Update `tailwind.config.js` for new colors or spacing.

### Testing
- **Cross-Browser**: Test changes in Chrome, Firefox, Safari, and Edge.
- **Accessibility**: Use tools like Lighthouse or Axe to verify WCAG compliance.
- **Performance**: Monitor bundle size and animation performance (ensure 60fps).

---
*Last Updated: 2026-03-01*
