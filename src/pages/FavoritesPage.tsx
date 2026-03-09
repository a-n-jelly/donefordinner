import { useMemo } from 'react';
import { useDbRecipes } from '@/hooks/useDbRecipes';
import RecipeCard from '@/components/RecipeCard';
import { useFavorites } from '@/hooks/useFavorites';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

const FavoritesPage = () => {
  const { favorites, isFavorite, toggleFavorite, loading: favLoading } = useFavorites();
  const { dbRecipes, loading: recipesLoading } = useDbRecipes();

  const favoriteRecipes = useMemo(() => {
    return dbRecipes.filter(r => favorites.includes(r.id));
  }, [dbRecipes, favorites]);

  const loading = favLoading || recipesLoading;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">My Favorites</h1>
        <p className="text-muted-foreground mb-8">Your saved recipes, all in one place.</p>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {!loading && favoriteRecipes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoriteRecipes.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} isFavorite={isFavorite(recipe.id)} onToggleFavorite={toggleFavorite} />
            ))}
          </div>
        )}

        {!loading && favoriteRecipes.length === 0 && (
          <div className="text-center py-20">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-lg text-muted-foreground mb-2">No favorites yet</p>
            <Link to="/" className="text-primary hover:underline text-sm">Browse your cookbook to add some</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;
