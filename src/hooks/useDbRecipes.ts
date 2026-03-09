import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Recipe } from '@/types/recipe';
import { Json } from '@/integrations/supabase/types';

// Maps a DB recipe row to the frontend Recipe type
function mapDbRecipe(row: any): Recipe {
  const ingredients = Array.isArray(row.ingredients)
    ? row.ingredients.map((i: any) => ({
        item: i.name || i.item || '',
        amount: parseFloat(i.amount) || 0,
        unit: i.unit || '',
        group: i.group,
      }))
    : [];

  const instructions = Array.isArray(row.instructions)
    ? row.instructions.map((s: any, idx: number) => ({
        stepNumber: s.step || s.stepNumber || idx + 1,
        instruction: s.instruction || s.text || '',
        timerMinutes: s.timerMinutes || s.timer_minutes,
      }))
    : [];

  const nutrition = row.nutrition
    ? {
        calories: row.nutrition.calories || 0,
        protein: row.nutrition.protein || 0,
        carbs: row.nutrition.carbs || 0,
        fat: row.nutrition.fat || 0,
      }
    : { calories: 0, protein: 0, carbs: 0, fat: 0 };

  return {
    id: row.id,
    title: row.title || 'Untitled',
    description: row.description || '',
    imageUrl: row.image_url || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&q=80',
    servings: row.servings || 4,
    prepTime: row.prep_time || 0,
    cookTime: row.cook_time || 0,
    difficulty: row.difficulty || 'Medium',
    category: Array.isArray(row.category) ? row.category : [],
    cuisine: row.cuisine || 'Other',
    tags: Array.isArray(row.tags) ? row.tags : [],
    ingredients,
    instructions,
    nutrition,
    rating: row.rating || 0,
    reviewCount: row.review_count || 0,
    author: row.author || 'Unknown',
  };
}

export function useDbRecipes() {
  const [dbRecipes, setDbRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecipes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDbRecipes(data.map(mapDbRecipe));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  return { dbRecipes, loading, refetch: fetchRecipes };
}

export function useMyRecipes(userId: string | undefined) {
  const [recipes, setRecipes] = useState<(Recipe & { createdAt: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecipes = async () => {
    if (!userId) {
      setRecipes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRecipes(data.map(row => ({ ...mapDbRecipe(row), createdAt: row.created_at })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecipes();
  }, [userId]);

  const deleteRecipe = async (id: string) => {
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (!error) {
      setRecipes(prev => prev.filter(r => r.id !== id));
    }
    return { error };
  };

  return { recipes, loading, refetch: fetchRecipes, deleteRecipe };
}

export { mapDbRecipe };
