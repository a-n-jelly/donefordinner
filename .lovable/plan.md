

# Database Setup with Lovable Cloud

## Overview
Set up a Supabase-backed database via Lovable Cloud to store recipes, user profiles, favorites, and shopping list items. This replaces the current localStorage-based persistence and the hardcoded recipe data file, laying the groundwork for authentication in the next step.

## Database Schema

### 1. `recipes` table
Stores all recipe data. Publicly readable by anyone.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| user_id | UUID (FK auth.users) | Nullable for seed data |
| title | TEXT | Not null |
| description | TEXT | |
| image_url | TEXT | |
| servings | INT | |
| prep_time | INT | Minutes |
| cook_time | INT | Minutes |
| difficulty | TEXT | Easy/Medium/Hard |
| category | TEXT[] | Array of meal types |
| cuisine | TEXT | |
| tags | TEXT[] | Dietary tags |
| ingredients | JSONB | Array of {item, amount, unit} |
| instructions | JSONB | Array of {stepNumber, instruction, timerMinutes?} |
| nutrition | JSONB | {calories, protein, carbs, fat} |
| rating | FLOAT | |
| review_count | INT | |
| author | TEXT | |
| created_at | TIMESTAMPTZ | Default now() |

### 2. `profiles` table
Created automatically when a user signs up (via trigger).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Same as auth.users.id |
| display_name | TEXT | |
| avatar_url | TEXT | |
| dietary_preferences | TEXT[] | |
| created_at | TIMESTAMPTZ | Default now() |

### 3. `favorites` table
Links users to their favorite recipes.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| user_id | UUID (FK auth.users) | Not null |
| recipe_id | UUID (FK recipes) | Not null |
| created_at | TIMESTAMPTZ | Default now() |
| | | Unique(user_id, recipe_id) |

### 4. `shopping_list_items` table
Persists user shopping list items.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| user_id | UUID (FK auth.users) | Not null |
| item | TEXT | Not null |
| amount | FLOAT | |
| unit | TEXT | |
| checked | BOOLEAN | Default false |
| recipe_title | TEXT | Optional reference |
| created_at | TIMESTAMPTZ | Default now() |

## Security (RLS Policies)

- **recipes**: SELECT open to all; INSERT/UPDATE/DELETE for authenticated owner only
- **profiles**: SELECT for authenticated users; INSERT via trigger; UPDATE/DELETE own row only
- **favorites**: All operations restricted to own user_id
- **shopping_list_items**: All operations restricted to own user_id

## Auto-profile trigger
A database trigger will automatically create a profile row when a new user signs up.

## Implementation Steps

### Step 1: Enable Lovable Cloud
Connect the project to Lovable Cloud to get a Supabase backend.

### Step 2: Create database migration
Single migration with:
1. Create `profiles` table with FK to `auth.users(id)` and ON DELETE CASCADE
2. Create `recipes` table (user_id nullable to allow seed data)
3. Create `favorites` table with unique constraint
4. Create `shopping_list_items` table
5. Enable RLS on all tables
6. Create helper functions (`is_recipe_owner`, etc.) as SECURITY DEFINER
7. Create RLS policies for each table
8. Create trigger to auto-create profile on signup

### Step 3: Seed recipe data
Insert the existing 12 recipes from `src/data/recipes.ts` into the database using the data insert tool.

### Step 4: Update frontend code
- Install and configure `@supabase/supabase-js`
- Create `src/integrations/supabase/client.ts` for the Supabase client
- Create `src/hooks/useRecipes.ts` -- fetch recipes from Supabase using TanStack Query
- Update `useFavorites.ts` -- read/write favorites from Supabase (with localStorage fallback for unauthenticated users)
- Update `useShoppingList.ts` -- read/write shopping items from Supabase (with localStorage fallback)
- Update `Index.tsx`, `RecipeDetail.tsx`, `FavoritesPage.tsx`, `ShoppingListPage.tsx` to use the new Supabase-backed hooks
- Keep the static `recipes.ts` data file as a fallback/reference but primary source becomes the database

### Step 5: Generate TypeScript types
Auto-generate types from the Supabase schema to ensure type safety across the app.

## What comes next (not in this plan)
Authentication (login/signup pages, auth context, protected routes) will be the next step after the database is confirmed working.

