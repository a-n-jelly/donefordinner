import { useState, useMemo } from 'react';
import { useDbRecipes } from '@/hooks/useDbRecipes';
import RecipeCard from '@/components/RecipeCard';
import SearchAndFilter from '@/components/SearchAndFilter';
import AddRecipeDialog from '@/components/AddRecipeDialog';
import { useFavorites } from '@/hooks/useFavorites';
import { MealType, CuisineType, DietaryTag, Difficulty } from '@/types/recipe';
import { ChefHat, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { dbRecipes, loading, refetch } = useDbRecipes();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MealType | ''>('');
  const [selectedCuisine, setSelectedCuisine] = useState<CuisineType | ''>('');
  const [selectedDietary, setSelectedDietary] = useState<DietaryTag | ''>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | ''>('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const filteredRecipes = useMemo(() => {
    return dbRecipes.filter(r => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!r.title.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q) && !(r.cuisine || '').toLowerCase().includes(q)) return false;
      }
      if (selectedCategory && !r.category.includes(selectedCategory)) return false;
      if (selectedCuisine && r.cuisine !== selectedCuisine) return false;
      if (selectedDietary && !r.tags.includes(selectedDietary)) return false;
      if (selectedDifficulty && r.difficulty !== selectedDifficulty) return false;
      return true;
    });
  }, [dbRecipes, searchQuery, selectedCategory, selectedCuisine, selectedDietary, selectedDifficulty]);

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/10 to-transparent">
        <div className="container max-w-6xl mx-auto px-4 py-12">
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-2">
            My Cookbook
          </h1>
          <p className="text-lg text-muted-foreground">
            Your curated collection of recipes
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="container max-w-6xl mx-auto px-4 py-6">
        <SearchAndFilter
          searchQuery={searchQuery} onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory}
          selectedCuisine={selectedCuisine} onCuisineChange={setSelectedCuisine}
          selectedDietary={selectedDietary} onDietaryChange={setSelectedDietary}
          selectedDifficulty={selectedDifficulty} onDifficultyChange={setSelectedDifficulty}
          onAddRecipe={() => setAddDialogOpen(true)}
        />

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {/* Empty state */}
        {!loading && dbRecipes.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <ChefHat className="h-16 w-16 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold">Your cookbook is empty</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Start building your collection by importing recipes from your favorite websites, adding them manually, or snapping a photo.
            </p>
            <Button onClick={() => setAddDialogOpen(true)} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Recipe
            </Button>
          </div>
        )}

        {/* Recipe Grid */}
        {!loading && filteredRecipes.length > 0 && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                isFavorite={isFavorite(recipe.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}

        {/* No results for filters */}
        {!loading && dbRecipes.length > 0 && filteredRecipes.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No recipes match your filters. Try adjusting them.</p>
          </div>
        )}
      </div>

      <AddRecipeDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onRecipeAdded={refetch} />
    </div>
  );
};

export default Index;
