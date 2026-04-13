

## Plan: Month View Persistence, Inline Editing, Themed Days, and Leftover Day Labels

### Problem Summary
1. **Month view only shows meals for the current week** — other weeks appear empty because data is only fetched for one week at a time.
2. **No editing in month mode** — clicking a day just switches to week view.
3. **No themed days** — users want recurring day themes (e.g., Taco Tuesday, Meatless Monday).
4. **Leftover "from" requires manual selection** — should auto-show the source day name (e.g., "Monday") without user input.

---

### 1. Multi-Week Data for Month View

**`useMealPlan.ts`**: Add a `fetchMonthPlans(monthDate)` function that queries all `meal_plans` where `week_start_date` falls within the visible month range. Store results in a `monthMealPlans` map keyed by `week_start_date`. Expose `monthItems` — a flat list of all items across the month with their actual dates computed from `week_start_date + day_of_week`.

**`MealPlanPage.tsx`**: When in month mode, call `fetchMonthPlans` on mount/navigation. Each calendar cell looks up items by actual date from `monthItems` instead of only `itemsByDay`.

### 2. Inline Editing in Month View

Each month-view day cell gets a small "+" button to open the add-meal dialog (reusing existing dialog, just setting the correct day/week). Clicking an existing meal chip opens a mini popover or navigates to week view for that week. This keeps the month view actionable without a full rebuild.

### 3. Themed Days

**Database migration**: Add `day_themes` JSONB column to `meal_plans` (e.g., `{"1": "Taco Tuesday", "0": "Meatless Monday"}`). Alternatively, store themes at the profile level so they persist across weeks — add a `day_themes` JSONB column to `profiles`.

**`useMealPlan.ts`**: Add `updateDayTheme(dayOfWeek, theme)` function. Expose `dayThemes`.

**UI**: Show theme label in day headers (both views). Add a small edit button to set/clear a theme per day. Provide preset suggestions (Meatless Monday, Taco Tuesday, Pizza Friday, etc.) plus custom input.

### 4. Leftover Source Shows Day Name Automatically

**`MealPlanPage.tsx`**: When `isLeftover` is checked, instead of a dropdown to pick a source meal, automatically set the leftover source based on the selected recipe — find the most recent non-leftover instance of that recipe in the current week and display its day name. The "leftover from" label on meal cards changes from showing the source meal title to showing the day: e.g., "(leftover from Monday)".

Remove the manual source-meal selector. When a recipe is selected and `isLeftover` is true, auto-find the source by matching `recipeId` in earlier days of the week.

---

### Files Changed

| File | Change |
|------|--------|
| `profiles` table | Add `day_themes jsonb` column (migration) |
| `src/hooks/useMealPlan.ts` | Add `fetchMonthPlans`, `monthItems`, `updateDayTheme`, auto-leftover-source logic |
| `src/pages/MealPlanPage.tsx` | Month view uses multi-week data, inline add buttons, themed day headers, leftover shows day name |

### Estimated Effort
~2-3 messages

