

## Fix: RLS violation when adding recipes

### Root Cause
In `src/components/AddRecipeDialog.tsx` line 94-96, the insert is:
```typescript
{ user_id: user.id, ...recipe }
```
If the `recipe` object from scraping or photo parsing contains a `user_id` property (likely `null` or `undefined`), the spread **overwrites** the valid `user_id` set before it. The RLS policy requires `auth.uid() = user_id`, so a `null` user_id fails.

### Fix
Move `user_id: user.id` **after** the spread so it always wins:
```typescript
{ ...recipe, user_id: user.id }
```

### Files Changed
| File | Change |
|------|--------|
| `src/components/AddRecipeDialog.tsx` | Swap order: `{ ...recipe, user_id: user.id }` |

Single line change. No database migration needed.

