import { useState, useEffect, useCallback } from 'react';
import { ShoppingItem, Ingredient } from '@/types/recipe';

const SHOPPING_KEY = 'recipe-shopping-list';

export function useShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(SHOPPING_KEY) || '[]');
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(SHOPPING_KEY, JSON.stringify(items));
  }, [items]);

  const addFromRecipe = useCallback((ingredients: Ingredient[], recipeTitle: string) => {
    setItems(prev => {
      const newItems = ingredients.map(ing => ({
        id: `${recipeTitle}-${ing.item}-${Date.now()}-${Math.random()}`,
        item: ing.item,
        amount: ing.amount,
        unit: ing.unit,
        checked: false,
        recipeTitle,
      }));
      return [...prev, ...newItems];
    });
  }, []);

  const toggleItem = useCallback((id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearChecked = useCallback(() => {
    setItems(prev => prev.filter(item => !item.checked));
  }, []);

  const clearAll = useCallback(() => setItems([]), []);

  return { items, addFromRecipe, toggleItem, removeItem, clearChecked, clearAll };
}
