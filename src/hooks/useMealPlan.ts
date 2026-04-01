import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfWeek, format, addWeeks, subWeeks } from 'date-fns';

export interface MealPlanItem {
  id: string;
  recipeId: string | null;
  recipeTitle?: string;
  recipeImage?: string;
  dayOfWeek: number; // 0 = Monday, 6 = Sunday
  mealLabel: string;
  isLeftover: boolean;
  leftoverSourceId: string | null;
  servings: number;
  notes: string | null;
}

export interface MealPlan {
  id: string;
  weekStartDate: string;
  items: MealPlanItem[];
  dayNotes: Record<string, string>;
}

export function useMealPlan() {
  const { user } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday
  );
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');

  // Fetch or create meal plan for current week
  const fetchMealPlan = useCallback(async () => {
    if (!user) {
      setMealPlan(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Get or create meal plan for this week
    let { data: plan } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start_date', weekStartStr)
      .maybeSingle();

    if (!plan) {
      // Create new meal plan for this week
      const { data: newPlan } = await supabase
        .from('meal_plans')
        .insert({ user_id: user.id, week_start_date: weekStartStr })
        .select()
        .single();
      plan = newPlan;
    }

    if (plan) {
      // Fetch items with recipe details
      const { data: items } = await supabase
        .from('meal_plan_items')
        .select(`
          *,
          recipe:recipes(id, title, image_url)
        `)
        .eq('meal_plan_id', plan.id)
        .order('day_of_week')
        .order('created_at');

      setMealPlan({
        id: plan.id,
        weekStartDate: plan.week_start_date,
        items: (items || []).map((item: any) => ({
          id: item.id,
          recipeId: item.recipe_id,
          recipeTitle: item.recipe?.title,
          recipeImage: item.recipe?.image_url,
          dayOfWeek: item.day_of_week,
          mealLabel: item.meal_label,
          isLeftover: item.is_leftover,
          leftoverSourceId: item.leftover_source_id,
          servings: item.servings || 1,
          notes: item.notes,
        })),
      });
    }

    setLoading(false);
  }, [user, weekStartStr]);

  useEffect(() => {
    fetchMealPlan();
  }, [fetchMealPlan]);

  const nextWeek = useCallback(() => {
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  }, []);

  const prevWeek = useCallback(() => {
    setCurrentWeekStart(prev => subWeeks(prev, 1));
  }, []);

  const goToWeek = useCallback((date: Date) => {
    setCurrentWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
  }, []);

  const addMeal = useCallback(async (
    recipeId: string,
    dayOfWeek: number,
    mealLabel: string,
    servings: number = 1,
    isLeftover: boolean = false,
    leftoverSourceId: string | null = null
  ) => {
    if (!mealPlan) return;

    const { data, error } = await supabase
      .from('meal_plan_items')
      .insert({
        meal_plan_id: mealPlan.id,
        recipe_id: recipeId,
        day_of_week: dayOfWeek,
        meal_label: mealLabel,
        servings,
        is_leftover: isLeftover,
        leftover_source_id: leftoverSourceId,
      })
      .select(`*, recipe:recipes(id, title, image_url)`)
      .single();

    if (!error && data) {
      setMealPlan(prev => prev ? {
        ...prev,
        items: [...prev.items, {
          id: data.id,
          recipeId: data.recipe_id,
          recipeTitle: data.recipe?.title,
          recipeImage: data.recipe?.image_url,
          dayOfWeek: data.day_of_week,
          mealLabel: data.meal_label,
          isLeftover: data.is_leftover,
          leftoverSourceId: data.leftover_source_id,
          servings: data.servings || 1,
          notes: data.notes,
        }],
      } : null);
    }

    return { error };
  }, [mealPlan]);

  const removeMeal = useCallback(async (itemId: string) => {
    const { error } = await supabase.from('meal_plan_items').delete().eq('id', itemId);
    if (!error) {
      setMealPlan(prev => prev ? {
        ...prev,
        items: prev.items.filter(i => i.id !== itemId),
      } : null);
    }
    return { error };
  }, []);

  const updateMeal = useCallback(async (
    itemId: string,
    updates: { mealLabel?: string; servings?: number; isLeftover?: boolean; leftoverSourceId?: string | null; notes?: string }
  ) => {
    const dbUpdates: any = {};
    if (updates.mealLabel !== undefined) dbUpdates.meal_label = updates.mealLabel;
    if (updates.servings !== undefined) dbUpdates.servings = updates.servings;
    if (updates.isLeftover !== undefined) dbUpdates.is_leftover = updates.isLeftover;
    if (updates.leftoverSourceId !== undefined) dbUpdates.leftover_source_id = updates.leftoverSourceId;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    const { error } = await supabase.from('meal_plan_items').update(dbUpdates).eq('id', itemId);
    if (!error) {
      setMealPlan(prev => prev ? {
        ...prev,
        items: prev.items.map(i => i.id === itemId ? { ...i, ...updates } : i),
      } : null);
    }
    return { error };
  }, []);

  // Get all non-leftover meals for shopping list generation
  const getMealsForShopping = useCallback(() => {
    if (!mealPlan) return [];
    return mealPlan.items.filter(item => !item.isLeftover && item.recipeId);
  }, [mealPlan]);

  return {
    mealPlan,
    loading,
    currentWeekStart,
    weekStartStr,
    nextWeek,
    prevWeek,
    goToWeek,
    addMeal,
    removeMeal,
    updateMeal,
    getMealsForShopping,
    refetch: fetchMealPlan,
  };
}
