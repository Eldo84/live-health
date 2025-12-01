# Routing Structure Documentation

## Overview
The application has been restructured to clearly separate the main landing pages from the application pages.

## Route Structure

### Main Landing Pages (No AppLayout)
These routes use `MainPageLayout` which provides a simple layout without the header/sidebar:

- **`/`** - Home page (mainpage/pages/index.tsx)
  - Landing page with tabs for: Home, About Us, Become a Partner, Advertise, Donate
  
- **`/partnership`** - Partnership page (mainpage/pages/Partnership.tsx)
  - Standalone partnership inquiry form

### Application Pages (With AppLayout)
These routes use `AppLayout` which includes the header, sidebar, and info panel:

- **`/app/map`** - Interactive outbreak map (HomePageMap)
- **`/app/dashboard`** - Dashboard with analytics

### Legacy Routes (Backward Compatibility)
These routes still work and use AppLayout:

- **`/map`** - Redirects to interactive map (with AppLayout)
- **`/dashboard`** - Redirects to dashboard (with AppLayout)

## File Structure

```
src/
├── layouts/
│   ├── AppLayout.tsx          # Layout with header/sidebar for app pages
│   └── MainPageLayout.tsx      # Simple layout for landing pages
├── screens/
│   ├── mainpage/
│   │   └── pages/
│   │       ├── index.tsx      # Home page component
│   │       ├── Partnership.tsx
│   │       ├── OutbreakMap.tsx
│   │       └── AnimatedGlobe.tsx
│   ├── HomePageMap/           # Interactive map (app page)
│   └── Dashboard/             # Dashboard (app page)
└── index.tsx                  # Main routing configuration
```

## Key Changes

1. **Home Route**: The main landing page (`mainpage/pages/index.tsx`) is now the home route (`/`)
2. **Layout Separation**: Landing pages use `MainPageLayout`, app pages use `AppLayout`
3. **Path Aliases**: Configured `@/` alias in both `vite.config.ts` and `tsconfig.app.json`
4. **Dependencies**: Installed required packages:
   - `react-hook-form`
   - `zod`
   - `@hookform/resolvers`
   - `react-helmet-async`

## Missing Assets

The following assets need to be added to `src/assets/`:
- `outbreaknow-logo.png`
- `outbreaknow-logo-new.png`
- `dr-lufulwabo.jpeg`

## Components Created

- `src/components/PartnerRow.tsx` - Partner/sponsor display component
- `src/components/AdvertiseForm.tsx` - Advertising inquiry form
- `src/components/NewsletterSignup.tsx` - Newsletter subscription form
- `src/components/ui/form.tsx` - Form components for react-hook-form
- `src/components/ui/textarea.tsx` - Textarea component
- `src/hooks/use-toast.ts` - Toast notification hook

## Next Steps

1. Add missing asset images to `src/assets/`
2. Update any internal links to use the new route structure
3. Test all routes to ensure they work correctly
4. Consider adding a redirect from old routes if needed

