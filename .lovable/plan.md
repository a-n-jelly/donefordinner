

# Authentication with Social Login and Magic Link

## Overview
Add authentication to the Savory app using Lovable Cloud (Supabase Auth). Users can sign in via Google, Apple, or email magic link. The database schema from the existing plan already includes a `profiles` table with an auto-creation trigger -- this plan builds on that foundation.

## Prerequisites
Lovable Cloud must be enabled first (as outlined in the existing database plan). The database migration should create the `profiles` table and auto-profile trigger before auth is wired up. If Cloud is not yet enabled, we will enable it as the first step.

## Auth Methods
1. **Google OAuth** -- Social sign-in via Google
2. **Apple OAuth** -- Social sign-in via Apple ID
3. **Email Magic Link** -- Passwordless login; user receives a clickable link via email

## Implementation Steps

### Step 1: Enable Lovable Cloud
Connect the project to Lovable Cloud to get a Supabase backend with Auth capabilities.

### Step 2: Run database migration
Execute the migration from the existing plan (profiles, recipes, favorites, shopping_list_items tables, RLS policies, auto-profile trigger). This is a prerequisite for auth since the profiles table must exist.

### Step 3: Enable OAuth providers
Configure Google and Apple as auth providers in the Supabase project. This involves:
- Enabling Google provider (requires Google OAuth client ID and secret from Google Cloud Console)
- Enabling Apple provider (requires Apple Services ID, team ID, key ID, and private key from Apple Developer Console)
- Setting the correct redirect URLs

### Step 4: Create Auth UI pages
- **`src/pages/AuthPage.tsx`** -- Login/signup page with three options:
  - "Continue with Google" button
  - "Continue with Apple" button
  - Email input + "Send Magic Link" button
- Clean, branded UI matching the Savory design system (sage green, terracotta, Playfair Display headings)

### Step 5: Create Auth context and hook
- **`src/contexts/AuthContext.tsx`** -- React context providing:
  - `user` (current Supabase user or null)
  - `session` (current session)
  - `signOut()` function
  - `loading` state
- Uses `onAuthStateChange` listener (set up BEFORE `getSession()` per best practices)
- Wrap the app in `<AuthProvider>`

### Step 6: Create protected route wrapper
- **`src/components/ProtectedRoute.tsx`** -- Redirects unauthenticated users to `/auth` for protected pages (favorites, shopping list)
- Recipe browsing and detail pages remain public

### Step 7: Update Navbar
- Show user avatar/name when logged in, with a dropdown for sign-out
- Show "Sign In" button when logged out
- Highlight which features require login

### Step 8: Update existing hooks
- `useFavorites` and `useShoppingList` -- check auth state; if logged in, sync with Supabase; if not, continue using localStorage as fallback

### Step 9: Add `/auth` route to App.tsx
- Add the auth page route
- Wrap favorites and shopping list routes in `<ProtectedRoute>`

## Route Protection Summary
| Route | Access |
|-------|--------|
| `/` | Public |
| `/recipe/:id` | Public |
| `/auth` | Public (redirects to `/` if already logged in) |
| `/favorites` | Authenticated only |
| `/shopping-list` | Authenticated only |

## Technical Notes
- Magic link emails use Supabase's built-in email handling (no custom templates needed initially)
- `emailRedirectTo` will be set to `window.location.origin` for magic links
- Social login callbacks will redirect back to the app origin
- Google and Apple OAuth require external developer console setup -- credentials will be stored as Supabase secrets

