

## Plan: Day Notes + Drag-and-Drop for Meal Planner

### Overview
Add per-day notes to the meal plan and enable drag-and-drop to move meals between days.

---

### 1. Database Migration
Add a `day_notes` JSONB column to `meal_plans` table to store notes keyed by day index (e.g. `{"0": "Grocery run", "3": "Dinner party"}`).

```sql
ALTER TABLE meal_plans ADD COLUMN day_notes jsonb DEFAULT '{}'::jsonb;
```

No new RLS policies needed — existing meal_plans policies cover this column.

### 2. Update `useMealPlan` Hook
- Add `updateDayNote(dayOfWeek: number, note: string)` function that updates the `day_notes` JSONB in the database.
- Add `moveMeal(itemId: string, newDayOfWeek: number)` function that updates `day_of_week` on a meal_plan_item and refreshes local state.
- Expose `dayNotes` (parsed from the meal plan) in the return value.

### 3. Install `@hello-pangea/dnd`
Lightweight drag-and-drop library (maintained fork of react-beautiful-dnd). Used to wrap the week grid in a `DragDropContext` with each day column as a `Droppable` and each meal card as a `Draggable`.

### 4. Update `MealPlanPage.tsx`
- **Day notes**: Add an inline editable text area below each day header. Saves on blur via `updateDayNote`.
- **Drag and drop**: Wrap the grid in `DragDropContext`, each day's meal list in `Droppable`, each meal card in `Draggable`. On drop, call `moveMeal` to persist the new day assignment.
- Add visual drag handle and drop indicator styling.

### Files Changed
| File | Change |
|------|--------|
| `meal_plans` table | Add `day_notes jsonb` column |
| `src/hooks/useMealPlan.ts` | Add `updateDayNote`, `moveMeal`, expose `dayNotes` |
| `src/pages/MealPlanPage.tsx` | Day notes UI + DnD integration |
| `package.json` | Add `@hello-pangea/dnd` |

### Estimated Effort
~2 messages

