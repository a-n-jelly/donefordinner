import { useState, useMemo } from 'react';
import { recipes } from '@/data/recipes';
import RecipeCard from '@/components/RecipeCard';
import SearchAndFilter from '@/components/SearchAndFilter';
import AddRecipeDialog from '@/components/AddRecipeDialog';
import { useFavorites } from '@/hooks/useFavorites';
import { MealType, CuisineType, DietaryTag, Difficulty } from '@/types/recipe';
import heroBanner from '@/assets/hero-banner.jpg';

const Index = () => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MealType | ''>('');
  const [selectedCuisine, setSelectedCuisine] = useState<CuisineType | ''>('');
  const [selectedDietary, setSelectedDietary] = useState<DietaryTag | ''>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | ''>('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!r.title.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q) && !r.cuisine.toLowerCase().includes(q)) return false;
      }
      if (selectedCategory && !r.category.includes(selectedCategory)) return false;
      if (selectedCuisine && r.cuisine !== selectedCuisine) return false;
      if (selectedDietary && !r.tags.includes(selectedDietary)) return false;
      if (selectedDifficulty && r.difficulty !== selectedDifficulty) return false;
      return true;
    });
  }, [searchQuery, selectedCategory, selectedCuisine, selectedDietary, selectedDifficulty]);

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Hero */}
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        <img src={heroBanner} alt="Fresh ingredients on a rustic table" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <h1 className="font-heading text-4xl md:text-6xl font-bold text-foreground mb-2">
            Savory
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-md">
            Discover delicious recipes from around the world, curated for home cooks.
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <SearchAndFilter
          searchQuery={searchQuery} onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory}
          selectedCuisine={selectedCuisine} onCuisineChange={setSelectedCuisine}
          selectedDietary={selectedDietary} onDietaryChange={setSelectedDietary}
          selectedDifficulty={selectedDifficulty} onDifficultyChange={setSelectedDifficulty}
          onAddRecipe={() => setAddDialogOpen(true)}
        />

        {/* Recipe Grid */}
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

        {filteredRecipes.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No recipes found. Try adjusting your filters.</p>
          </div>
        )}
      </div>

      <AddRecipeDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  );
};

export default Index;
