import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfWeek, format, addWeeks, subWeeks, startOfMonth, endOfMonth, endOfWeek, addDays } from 'date-fns';

export type DayTag = 'shopping' | 'prep' | null;

export interface MealPlanItem {
  id: string;
  recipeId: string | null;
  recipeTitle?: string;
  recipeImage?: string;
  dayOfWeek: number;
  mealLabel: string;
  isLeftover: boolean;
  leftoverSourceId: string | null;
  servings: number;
  notes: string | null;
}

export interface MonthMealItem extends MealPlanItem {
  actualDate: string; // yyyy-MM-dd
  weekStartDate: string;
  dayTags: Record<string, DayTag>;
}

export interface MealPlan {
  id: string;
  weekStartDate: string;
  items: MealPlanItem[];
  dayNotes: Record<string, string>;
  dayTags: Record<string, DayTag>;
}

export function useMealPlan() {
  const { user } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthItems, setMonthItems] = useState<MonthMealItem[]>([]);
  const [monthDayTags, setMonthDayTags] = useState<Record<string, DayTag>>({});
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [dayThemes, setDayThemes] = useState<Record<string, string>>({});

  const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');

  // Fetch day themes from profile
  const fetchDayThemes = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('day_themes')
      .eq('id', user.id)
      .maybeSingle();
    if (data) {
      setDayThemes((data as any).day_themes || {});
    }
  }, [user]);

  useEffect(() => {
    fetchDayThemes();
  }, [fetchDayThemes]);

  const fetchMealPlan = useCallback(async () => {
    if (!user) {
      setMealPlan(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    let { data: plan } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start_date', weekStartStr)
      .maybeSingle();

    if (!plan) {
      const { data: newPlan } = await supabase
        .from('meal_plans')
        .insert({ user_id: user.id, week_start_date: weekStartStr })
        .select()
        .single();
      plan = newPlan;
    }

    if (plan) {
      const { data: items } = await supabase
        .from('meal_plan_items')
        .select(`*, recipe:recipes(id, title, image_url)`)
        .eq('meal_plan_id', plan.id)
        .order('day_of_week')
        .order('created_at');

      setMealPlan({
        id: plan.id,
        weekStartDate: plan.week_start_date,
        dayNotes: (plan as any).day_notes || {},
        dayTags: (plan as any).day_tags || {},
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

  // Fetch all meal plans for the visible month range
  const fetchMonthPlans = useCallback(async (monthDate: Date) => {
    if (!user) return;
    setLoadingMonth(true);

    const mStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
    const mEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
    const startStr = format(mStart, 'yyyy-MM-dd');
    const endStr = format(mEnd, 'yyyy-MM-dd');

    const { data: plans } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', user.id)
      .gte('week_start_date', startStr)
      .lte('week_start_date', endStr);

    if (!plans || plans.length === 0) {
      setMonthItems([]);
      setMonthDayTags({});
      setLoadingMonth(false);
      return;
    }

    const planIds = plans.map(p => p.id);
    const { data: items } = await supabase
      .from('meal_plan_items')
      .select(`*, recipe:recipes(id, title, image_url)`)
      .in('meal_plan_id', planIds);

    const allItems: MonthMealItem[] = [];
    const allTags: Record<string, DayTag> = {};

    for (const plan of plans) {
      const planItems = (items || []).filter((i: any) => i.meal_plan_id === plan.id);
      const tags = (plan as any).day_tags || {};

      for (let d = 0; d < 7; d++) {
        const dateStr = format(addDays(new Date(plan.week_start_date + 'T00:00:00'), d), 'yyyy-MM-dd');
        if (tags[String(d)]) {
          allTags[dateStr] = tags[String(d)];
        }
      }

      for (const item of planItems) {
        const actualDate = format(
          addDays(new Date(plan.week_start_date + 'T00:00:00'), (item as any).day_of_week),
          'yyyy-MM-dd'
        );
        allItems.push({
          id: item.id,
          recipeId: (item as any).recipe_id,
          recipeTitle: (item as any).recipe?.title,
          recipeImage: (item as any).recipe?.image_url,
          dayOfWeek: (item as any).day_of_week,
          mealLabel: (item as any).meal_label,
          isLeftover: (item as any).is_leftover,
          leftoverSourceId: (item as any).leftover_source_id,
          servings: (item as any).servings || 1,
          notes: (item as any).notes,
          actualDate,
          weekStartDate: plan.week_start_date,
          dayTags: tags,
        });
      }
    }

    setMonthItems(allItems);
    setMonthDayTags(allTags);
    setLoadingMonth(false);
  }, [user]);

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
    if (!mealPlan) return { error: new Error('No meal plan') };

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

  // Add meal to a specific week (for month view inline editing)
  const addMealToWeek = useCallback(async (
    weekStart: string,
    recipeId: string,
    dayOfWeek: number,
    mealLabel: string,
    servings: number = 1,
    isLeftover: boolean = false,
  ) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Find or create the meal plan for that week
    let { data: plan } = await supabase
      .from('meal_plans')
      .select('id')
      .eq('user_id', user.id)
      .eq('week_start_date', weekStart)
      .maybeSingle();

    if (!plan) {
      const { data: newPlan } = await supabase
        .from('meal_plans')
        .insert({ user_id: user.id, week_start_date: weekStart })
        .select('id')
        .single();
      plan = newPlan;
    }

    if (!plan) return { error: new Error('Could not create meal plan') };

    const { error } = await supabase
      .from('meal_plan_items')
      .insert({
        meal_plan_id: plan.id,
        recipe_id: recipeId,
        day_of_week: dayOfWeek,
        meal_label: mealLabel,
        servings,
        is_leftover: isLeftover,
      });

    return { error };
  }, [user]);

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

  const getMealsForShopping = useCallback(() => {
    if (!mealPlan) return [];
    return mealPlan.items.filter(item => !item.isLeftover && item.recipeId);
  }, [mealPlan]);

  const updateDayNote = useCallback(async (dayOfWeek: number, note: string) => {
    if (!mealPlan) return;
    const updatedNotes = { ...mealPlan.dayNotes, [String(dayOfWeek)]: note };
    if (!note.trim()) delete updatedNotes[String(dayOfWeek)];

    const { error } = await supabase
      .from('meal_plans')
      .update({ day_notes: updatedNotes } as any)
      .eq('id', mealPlan.id);

    if (!error) {
      setMealPlan(prev => prev ? { ...prev, dayNotes: updatedNotes } : null);
    }
    return { error };
  }, [mealPlan]);

  const updateDayTag = useCallback(async (dayOfWeek: number, tag: DayTag) => {
    if (!mealPlan) return;
    const updatedTags = { ...mealPlan.dayTags };
    if (tag) {
      updatedTags[String(dayOfWeek)] = tag;
    } else {
      delete updatedTags[String(dayOfWeek)];
    }

    const { error } = await supabase
      .from('meal_plans')
      .update({ day_tags: updatedTags } as any)
      .eq('id', mealPlan.id);

    if (!error) {
      setMealPlan(prev => prev ? { ...prev, dayTags: updatedTags } : null);
    }
    return { error };
  }, [mealPlan]);

  const updateDayTheme = useCallback(async (dayOfWeek: number, theme: string) => {
    if (!user) return;
    const updated = { ...dayThemes };
    if (theme.trim()) {
      updated[String(dayOfWeek)] = theme.trim();
    } else {
      delete updated[String(dayOfWeek)];
    }

    const { error } = await supabase
      .from('profiles')
      .update({ day_themes: updated } as any)
      .eq('id', user.id);

    if (!error) {
      setDayThemes(updated);
    }
    return { error };
  }, [user, dayThemes]);

  const getUpcomingMealsForPrep = useCallback((prepDayIndex: number) => {
    if (!mealPlan) return [];
    return mealPlan.items.filter(
      item => item.dayOfWeek > prepDayIndex && !item.isLeftover && item.recipeId
    );
  }, [mealPlan]);

  const moveMeal = useCallback(async (itemId: string, newDayOfWeek: number) => {
    const { error } = await supabase
      .from('meal_plan_items')
      .update({ day_of_week: newDayOfWeek })
      .eq('id', itemId);

    if (!error) {
      setMealPlan(prev => prev ? {
        ...prev,
        items: prev.items.map(i => i.id === itemId ? { ...i, dayOfWeek: newDayOfWeek } : i),
      } : null);
    }
    return { error };
  }, []);

  // Auto-find leftover source day name
  const getLeftoverSourceDay = useCallback((item: MealPlanItem) => {
    if (!item.isLeftover || !item.recipeId || !mealPlan) return null;
    const source = mealPlan.items.find(
      i => !i.isLeftover && i.recipeId === item.recipeId && i.dayOfWeek < item.dayOfWeek
    );
    if (source) {
      const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return DAYS[source.dayOfWeek];
    }
    // If not found earlier in week, just say the day name from leftoverSourceId
    if (item.leftoverSourceId) {
      const sourceItem = mealPlan.items.find(i => i.id === item.leftoverSourceId);
      if (sourceItem) {
        const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return DAYS[sourceItem.dayOfWeek];
      }
    }
    return null;
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
    addMealToWeek,
    removeMeal,
    updateMeal,
    updateDayNote,
    updateDayTag,
    updateDayTheme,
    dayThemes,
    moveMeal,
    getMealsForShopping,
    getUpcomingMealsForPrep,
    getLeftoverSourceDay,
    fetchMonthPlans,
    monthItems,
    monthDayTags,
    loadingMonth,
    refetch: fetchMealPlan,
  };
}
