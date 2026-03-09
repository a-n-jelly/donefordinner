import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { mapDbRecipe } from '@/hooks/useDbRecipes';
import { supabase } from '@/integrations/supabase/client';
import { useFavorites } from '@/hooks/useFavorites';
import { useShoppingList } from '@/hooks/useShoppingList';
import CookingMode from '@/components/CookingMode';
import { Recipe } from '@/types/recipe';
import { ArrowLeft, Clock, ChefHat, Star, Heart, Users, ShoppingCart, Play, Minus, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';

const RecipeDetail = () => {
  const { id } = useParams();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addFromRecipe } = useShoppingList();

  const [servings, setServings] = useState(4);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [showCookingMode, setShowCookingMode] = useState(false);

  // Fetch recipe from DB
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase.from('recipes').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      if (data) {
        const mapped = mapDbRecipe(data);
        setRecipe(mapped);
        setServings(mapped.servings);
      }
      setLoading(false);
    });
  }, [id]);

  const scale = recipe ? servings / recipe.servings : 1;

  if (loadingDb) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading text-2xl mb-2">Recipe not found</h1>
          <Link to="/" className="text-primary hover:underline">Back to recipes</Link>
        </div>
      </div>
    );
  }

  const toggleIngredient = (idx: number) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleAddToShoppingList = () => {
    addFromRecipe(
      recipe.ingredients.map(i => ({ ...i, amount: +(i.amount * scale).toFixed(2) })),
      recipe.title
    );
    toast.success('Ingredients added to shopping list!');
  };

  return (
    <>
      {showCookingMode && (
        <CookingMode steps={recipe.instructions} title={recipe.title} onClose={() => setShowCookingMode(false)} />
      )}
      <div className="min-h-screen pb-20 md:pb-0">
        {/* Hero image */}
        <div className="relative h-[40vh] md:h-[50vh]">
          <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          <Link to="/" className="absolute top-4 left-4 p-2 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <button
            onClick={() => toggleFavorite(recipe.id)}
            className="absolute top-4 right-4 p-2 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition-colors"
          >
            <Heart className={`h-5 w-5 ${isFavorite(recipe.id) ? 'fill-secondary text-secondary' : 'text-foreground'}`} />
          </button>
        </div>

        <div className="container max-w-3xl mx-auto px-4 -mt-16 relative z-10">
          <div className="bg-card rounded-xl p-6 md:p-8 shadow-warm-lg">
            <div className="flex flex-wrap gap-2 mb-3">
              {recipe.category.map(c => (
                <span key={c} className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{c}</span>
              ))}
              {recipe.tags.map(t => (
                <span key={t} className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{t}</span>
              ))}
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-card-foreground mb-2">{recipe.title}</h1>
            <p className="text-muted-foreground mb-4">{recipe.description}</p>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {recipe.prepTime + recipe.cookTime} min</span>
              <span className="flex items-center gap-1"><ChefHat className="h-4 w-4" /> {recipe.difficulty}</span>
              <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-secondary text-secondary" /> {recipe.rating} ({recipe.reviewCount})</span>
              <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {servings} servings</span>
            </div>

            {/* Start cooking button */}
            <button
              onClick={() => setShowCookingMode(true)}
              className="w-full md:w-auto mb-8 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
            >
              <Play className="h-4 w-4" /> Start Cooking
            </button>

            {/* Nutrition */}
            <div className="grid grid-cols-4 gap-3 mb-8">
              {[
                { label: 'Calories', value: recipe.nutrition.calories, unit: 'kcal' },
                { label: 'Protein', value: recipe.nutrition.protein, unit: 'g' },
                { label: 'Carbs', value: recipe.nutrition.carbs, unit: 'g' },
                { label: 'Fat', value: recipe.nutrition.fat, unit: 'g' },
              ].map(n => (
                <div key={n.label} className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-lg font-semibold text-foreground">{n.value}</div>
                  <div className="text-xs text-muted-foreground">{n.label}</div>
                </div>
              ))}
            </div>

            {/* Ingredients */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-xl font-semibold text-card-foreground">Ingredients</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => setServings(s => Math.max(1, s - 1))} className="p-1 rounded-full bg-muted hover:bg-accent transition-colors">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium w-6 text-center">{servings}</span>
                  <button onClick={() => setServings(s => s + 1)} className="p-1 rounded-full bg-muted hover:bg-accent transition-colors">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <ul className="space-y-2">
                {recipe.ingredients.map((ing, idx) => (
                  <li key={idx}>
                    <button
                      onClick={() => toggleIngredient(idx)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors hover:bg-muted/50 ${checkedIngredients.has(idx) ? 'opacity-50' : ''}`}
                    >
                      <span className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center ${checkedIngredients.has(idx) ? 'bg-primary border-primary' : 'border-border'}`}>
                        {checkedIngredients.has(idx) && <Check className="h-3 w-3 text-primary-foreground" />}
                      </span>
                      <span className={`text-sm ${checkedIngredients.has(idx) ? 'line-through text-muted-foreground' : 'text-card-foreground'}`}>
                        <strong>{+(ing.amount * scale).toFixed(2)} {ing.unit}</strong> {ing.item}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={handleAddToShoppingList}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-full text-sm font-medium hover:bg-secondary/90 transition-colors"
              >
                <ShoppingCart className="h-4 w-4" /> Add to Shopping List
              </button>
            </div>

            {/* Instructions */}
            <div>
              <h2 className="font-heading text-xl font-semibold text-card-foreground mb-4">Instructions</h2>
              <ol className="space-y-4">
                {recipe.instructions.map((step) => (
                  <li key={step.stepNumber} className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center">
                      {step.stepNumber}
                    </span>
                    <div className="pt-1">
                      <p className="text-card-foreground leading-relaxed">{step.instruction}</p>
                      {step.timerMinutes && (
                        <span className="inline-flex items-center gap-1 mt-1 text-xs text-secondary font-medium">
                          <Clock className="h-3 w-3" /> {step.timerMinutes} min
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <p className="mt-8 text-xs text-muted-foreground">Recipe by {recipe.author}</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default RecipeDetail;
