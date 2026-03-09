import { Search, X, Plus } from 'lucide-react';
import { MealType, CuisineType, DietaryTag, Difficulty } from '@/types/recipe';
import { Button } from '@/components/ui/button';

interface SearchAndFilterProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: MealType | '';
  onCategoryChange: (c: MealType | '') => void;
  selectedCuisine: CuisineType | '';
  onCuisineChange: (c: CuisineType | '') => void;
  selectedDietary: DietaryTag | '';
  onDietaryChange: (d: DietaryTag | '') => void;
  selectedDifficulty: Difficulty | '';
  onDifficultyChange: (d: Difficulty | '') => void;
  onAddRecipe?: () => void;
}

const categories: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack'];
const cuisines: CuisineType[] = ['Italian', 'Mexican', 'Asian', 'Mediterranean', 'American', 'Indian', 'French', 'Japanese'];
const dietaryTags: DietaryTag[] = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Keto', 'Dairy-Free'];
const difficulties: Difficulty[] = ['Easy', 'Medium', 'Hard'];

const FilterChip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
      active
        ? 'bg-primary text-primary-foreground'
        : 'bg-muted text-muted-foreground hover:bg-accent'
    }`}
  >
    {label}
  </button>
);

const SearchAndFilter = ({
  searchQuery, onSearchChange,
  selectedCategory, onCategoryChange,
  selectedCuisine, onCuisineChange,
  selectedDietary, onDietaryChange,
  selectedDifficulty, onDifficultyChange,
  onAddRecipe,
}: SearchAndFilterProps) => {
  const hasFilters = selectedCategory || selectedCuisine || selectedDietary || selectedDifficulty;

  return (
    <div className="space-y-4">
      {/* Search bar + Add button */}
      <div className="flex items-center gap-3 max-w-xl mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-full bg-muted/60 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          {searchQuery && (
            <button onClick={() => onSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        {onAddRecipe && (
          <Button size="sm" onClick={onAddRecipe} className="shrink-0">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        )}
      </div>

      {/* Filter chips */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map(c => (
            <FilterChip key={c} label={c} active={selectedCategory === c} onClick={() => onCategoryChange(selectedCategory === c ? '' : c)} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {cuisines.map(c => (
            <FilterChip key={c} label={c} active={selectedCuisine === c} onClick={() => onCuisineChange(selectedCuisine === c ? '' : c)} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {dietaryTags.map(d => (
            <FilterChip key={d} label={d} active={selectedDietary === d} onClick={() => onDietaryChange(selectedDietary === d ? '' : d)} />
          ))}
          {difficulties.map(d => (
            <FilterChip key={d} label={d} active={selectedDifficulty === d} onClick={() => onDifficultyChange(selectedDifficulty === d ? '' : d)} />
          ))}
        </div>
      </div>

      {hasFilters && (
        <div className="text-center">
          <button
            onClick={() => { onCategoryChange(''); onCuisineChange(''); onDietaryChange(''); onDifficultyChange(''); }}
            className="text-xs text-primary hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchAndFilter;
