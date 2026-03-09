import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Ingredient } from '@/types/recipe';

interface ShoppingItem {
  id: string;
  item: string;
  amount: number | null;
  unit: string | null;
  checked: boolean;
  recipeTitle?: string | null;
}

const SHOPPING_KEY = 'recipe-shopping-list';

export function useShoppingList() {
  const { user } = useAuth();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load items from Supabase or localStorage
  useEffect(() => {
    if (user) {
      setLoading(true);
      supabase
        .from('shopping_list_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) {
            setItems(data.map(row => ({
              id: row.id,
              item: row.item,
              amount: row.amount,
              unit: row.unit,
              checked: row.checked,
              recipeTitle: row.recipe_title,
            })));
          }
          setLoading(false);
        });
    } else {
      try {
        const stored = JSON.parse(localStorage.getItem(SHOPPING_KEY) || '[]');
        setItems(stored);
      } catch {
        setItems([]);
      }
      setLoading(false);
    }
  }, [user]);

  // Sync localStorage for unauthenticated users
  useEffect(() => {
    if (!user) {
      localStorage.setItem(SHOPPING_KEY, JSON.stringify(items));
    }
  }, [items, user]);

  const addFromRecipe = useCallback(async (ingredients: Ingredient[], recipeTitle: string) => {
    const newItems = ingredients.map(ing => ({
      id: crypto.randomUUID(),
      item: ing.item,
      amount: ing.amount,
      unit: ing.unit,
      checked: false,
      recipeTitle,
    }));

    if (user) {
      const dbItems = newItems.map(item => ({
        user_id: user.id,
        item: item.item,
        amount: item.amount,
        unit: item.unit,
        checked: false,
        recipe_title: recipeTitle,
      }));
      const { data } = await supabase.from('shopping_list_items').insert(dbItems).select();
      if (data) {
        setItems(prev => [...prev, ...data.map(row => ({
          id: row.id,
          item: row.item,
          amount: row.amount,
          unit: row.unit,
          checked: row.checked,
          recipeTitle: row.recipe_title,
        }))]);
      }
    } else {
      setItems(prev => [...prev, ...newItems]);
    }
  }, [user]);

  const addItems = useCallback(async (newItems: { item: string; amount?: number; unit?: string; recipeTitle?: string }[]) => {
    if (user) {
      const dbItems = newItems.map(item => ({
        user_id: user.id,
        item: item.item,
        amount: item.amount || null,
        unit: item.unit || null,
        checked: false,
        recipe_title: item.recipeTitle || null,
      }));
      const { data } = await supabase.from('shopping_list_items').insert(dbItems).select();
      if (data) {
        setItems(prev => [...prev, ...data.map(row => ({
          id: row.id,
          item: row.item,
          amount: row.amount,
          unit: row.unit,
          checked: row.checked,
          recipeTitle: row.recipe_title,
        }))]);
      }
    } else {
      const localItems = newItems.map(item => ({
        id: crypto.randomUUID(),
        item: item.item,
        amount: item.amount || null,
        unit: item.unit || null,
        checked: false,
        recipeTitle: item.recipeTitle || null,
      }));
      setItems(prev => [...prev, ...localItems]);
    }
  }, [user]);

  const toggleItem = useCallback(async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));

    if (user) {
      await supabase.from('shopping_list_items').update({ checked: !item.checked }).eq('id', id);
    }
  }, [items, user]);

  const removeItem = useCallback(async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));

    if (user) {
      await supabase.from('shopping_list_items').delete().eq('id', id);
    }
  }, [user]);

  const clearChecked = useCallback(async () => {
    const checkedIds = items.filter(i => i.checked).map(i => i.id);
    setItems(prev => prev.filter(i => !i.checked));

    if (user && checkedIds.length > 0) {
      await supabase.from('shopping_list_items').delete().in('id', checkedIds);
    }
  }, [items, user]);

  const clearAll = useCallback(async () => {
    const allIds = items.map(i => i.id);
    setItems([]);

    if (user && allIds.length > 0) {
      await supabase.from('shopping_list_items').delete().in('id', allIds);
    }
  }, [items, user]);

  return { items, loading, addFromRecipe, addItems, toggleItem, removeItem, clearChecked, clearAll };
}
