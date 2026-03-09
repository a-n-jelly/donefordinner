import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const FAVORITES_KEY = 'recipe-favorites';

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load favorites from Supabase or localStorage
  useEffect(() => {
    if (user) {
      // Authenticated: fetch from DB
      setLoading(true);
      supabase
        .from('favorites')
        .select('recipe_id')
        .eq('user_id', user.id)
        .then(({ data, error }) => {
          if (!error && data) {
            setFavorites(data.map(f => f.recipe_id));
          }
          setLoading(false);
        });
    } else {
      // Not authenticated: use localStorage
      try {
        const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
        setFavorites(stored);
      } catch {
        setFavorites([]);
      }
      setLoading(false);
    }
  }, [user]);

  // Sync localStorage for unauthenticated users
  useEffect(() => {
    if (!user) {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    }
  }, [favorites, user]);

  const toggleFavorite = useCallback(async (recipeId: string) => {
    const isFav = favorites.includes(recipeId);

    if (user) {
      // Optimistic update
      setFavorites(prev => isFav ? prev.filter(id => id !== recipeId) : [...prev, recipeId]);

      if (isFav) {
        await supabase.from('favorites').delete().eq('user_id', user.id).eq('recipe_id', recipeId);
      } else {
        await supabase.from('favorites').insert({ user_id: user.id, recipe_id: recipeId });
      }
    } else {
      // localStorage only
      setFavorites(prev => isFav ? prev.filter(id => id !== recipeId) : [...prev, recipeId]);
    }
  }, [favorites, user]);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  return { favorites, toggleFavorite, isFavorite, loading };
}
