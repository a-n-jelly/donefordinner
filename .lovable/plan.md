

## Plan: Auth-Aware Routing with Landing Page

### Estimated Effort: ~4-5 messages

Here's a breakdown by message:

---

### Message 1: Create Landing Page (~1 credit)
Create `src/pages/LandingPage.tsx` — a public marketing page with:
- Hero section: headline, subheadline explaining "digital cookbook, meal planner, and shopping list"
- Benefits section (3-4 feature cards)
- Dual CTA: "Sign In" button (links to `/auth`) + "Join the Waitlist" button (captures email to a new `waitlist` table)
- Clean, on-brand design using existing Tailwind theme

### Message 2: Database + Waitlist (~1 credit)
- Create `waitlist` table (id, email, created_at) with migration
- No RLS needed (or simple insert-only policy for anon)
- Wire up the waitlist form on the landing page to insert into this table

### Message 3: Routing Overhaul (~1 credit)
- Update `App.tsx`: mount `LandingPage` at `/`, move cookbook to `/cookbook`
- Update `ProtectedRoute.tsx`: remove the preview bypass, redirect unauthenticated users to `/` (landing) instead of `/auth`
- Update `AuthPage.tsx`: after successful login, redirect to `/cookbook`
- Update all internal `<Link to="/">` references to `/cookbook`

### Message 4: Navigation State (~1 credit)
- Update `Navbar.tsx`: only render for authenticated users (hide on landing page)
- Navbar already shows Sign In / Sign Out based on auth state — just ensure "Sign Out" redirects to `/`
- Landing page gets its own minimal top nav (logo + "Sign In" button)

### Message 5: Polish & Edge Cases (~1 credit)
- Session persistence verification (already handled by Supabase)
- Ensure refresh on protected routes redirects to landing if session expired
- Loading spinner during auth state resolution

---

### Summary of File Changes

| File | Action |
|------|--------|
| `src/pages/LandingPage.tsx` | **Create** — marketing landing page |
| `src/App.tsx` | **Edit** — new route structure |
| `src/components/ProtectedRoute.tsx` | **Edit** — remove preview bypass, redirect to `/` |
| `src/components/Navbar.tsx` | **Edit** — hide on landing, conditional rendering |
| `src/pages/AuthPage.tsx` | **Edit** — redirect to `/cookbook` after login |
| `src/components/Navbar.tsx` | **Edit** — update internal links from `/` to `/cookbook` |
| Migration SQL | **Create** — `waitlist` table |

### Recommended Approach

Send this as **2-3 prompts** to Lovable rather than all at once:

1. **First prompt**: "Create a landing page at `/` with hero, benefits, and dual CTA (Sign In + Join Waitlist). Move the cookbook to `/cookbook`. Update ProtectedRoute to redirect unauthenticated users to the landing page instead of `/auth`. Remove the preview/dev auth bypass."

2. **Second prompt**: "Create a waitlist table in the database and wire the Join Waitlist button to save emails. Update the navbar to hide on the landing page and show a minimal header instead."

3. **Third prompt**: "Test and polish — ensure session persistence, logout redirects to landing, and all internal links point to `/cookbook`."

