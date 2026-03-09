import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { useMealPlan, MealPlanItem } from '@/hooks/useMealPlan';
import { useDbRecipes } from '@/hooks/useDbRecipes';
import { useShoppingList } from '@/hooks/useShoppingList';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarIcon, ShoppingCart, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DEFAULT_MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const MealPlanPage = () => {
  const { user } = useAuth();
  const {
    mealPlan, loading, currentWeekStart, nextWeek, prevWeek, goToWeek,
    addMeal, removeMeal, updateMeal, getMealsForShopping
  } = useMealPlan();
  const { dbRecipes } = useDbRecipes();
  const { addItems } = useShoppingList();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedMealLabel, setSelectedMealLabel] = useState('Lunch');
  const [customMealLabel, setCustomMealLabel] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [servings, setServings] = useState(2);
  const [isLeftover, setIsLeftover] = useState(false);
  const [leftoverSourceId, setLeftoverSourceId] = useState('');

  const [prepSuggestions, setPrepSuggestions] = useState<string | null>(null);
  const [loadingPrep, setLoadingPrep] = useState(false);

  const openAddDialog = (dayOfWeek: number) => {
    setSelectedDay(dayOfWeek);
    setSelectedMealLabel('Lunch');
    setCustomMealLabel('');
    setSelectedRecipeId('');
    setServings(2);
    setIsLeftover(false);
    setLeftoverSourceId('');
    setAddDialogOpen(true);
  };

  const handleAddMeal = async () => {
    if (!selectedRecipeId) {
      toast.error('Please select a recipe');
      return;
    }
    const label = selectedMealLabel === 'Custom' ? customMealLabel : selectedMealLabel;
    if (!label.trim()) {
      toast.error('Please enter a meal label');
      return;
    }

    const { error } = await addMeal(
      selectedRecipeId,
      selectedDay,
      label.trim(),
      servings,
      isLeftover,
      isLeftover ? leftoverSourceId || null : null
    );

    if (error) {
      toast.error('Failed to add meal');
    } else {
      toast.success('Meal added!');
      setAddDialogOpen(false);
    }
  };

  const handleRemoveMeal = async (itemId: string) => {
    const { error } = await removeMeal(itemId);
    if (error) toast.error('Failed to remove meal');
  };

  const handleGenerateShoppingList = async () => {
    const meals = getMealsForShopping();
    if (meals.length === 0) {
      toast.error('No meals to generate shopping list from');
      return;
    }

    // Fetch full recipe details for each meal
    const recipeIds = [...new Set(meals.map(m => m.recipeId).filter(Boolean))] as string[];
    const { data: recipes } = await supabase
      .from('recipes')
      .select('id, title, ingredients, servings')
      .in('id', recipeIds);

    if (!recipes || recipes.length === 0) {
      toast.error('Could not fetch recipe details');
      return;
    }

    // Aggregate ingredients, scaling by servings
    const ingredientMap = new Map<string, { amount: number; unit: string; recipeTitle: string }>();

    for (const meal of meals) {
      const recipe = recipes.find(r => r.id === meal.recipeId);
      if (!recipe) continue;
      
      const ingredients = recipe.ingredients as Array<{ name?: string; item?: string; amount?: string | number; unit?: string }> | null;
      if (!Array.isArray(ingredients)) continue;

      const recipeServings = recipe.servings || 4;
      const scale = meal.servings / recipeServings;

      for (const ing of ingredients) {
        const itemName = ing.name || ing.item || '';
        const unit = ing.unit || '';
        const key = `${itemName}-${unit}`.toLowerCase();
        const existing = ingredientMap.get(key);
        const amount = (parseFloat(String(ing.amount)) || 0) * scale;

        if (existing) {
          existing.amount += amount;
        } else {
          ingredientMap.set(key, {
            amount,
            unit,
            recipeTitle: recipe.title,
          });
        }
      }
    }

    const items = Array.from(ingredientMap.entries()).map(([key, val]) => ({
      item: key.split('-')[0],
      amount: Math.ceil(val.amount * 10) / 10,
      unit: val.unit,
      recipeTitle: 'Meal Plan',
    }));

    await addItems(items);
    toast.success(`Added ${items.length} items to shopping list!`);
  };

  const handleGetPrepSuggestions = async () => {
    const meals = getMealsForShopping();
    if (meals.length === 0) {
      toast.error('Add some meals first');
      return;
    }

    setLoadingPrep(true);
    setPrepSuggestions(null);

    try {
      const recipeIds = [...new Set(meals.map(m => m.recipeId).filter(Boolean))] as string[];
      const { data: recipes } = await supabase
        .from('recipes')
        .select('title, instructions, prep_time, ingredients')
        .in('id', recipeIds);

      const { data, error } = await supabase.functions.invoke('analyze-prep', {
        body: { recipes },
      });

      if (error) throw error;
      setPrepSuggestions(data.suggestions);
    } catch (err: any) {
      toast.error(err.message || 'Failed to get prep suggestions');
    } finally {
      setLoadingPrep(false);
    }
  };

  // Group items by day
  const itemsByDay = DAYS.map((_, dayIndex) =>
    mealPlan?.items.filter(item => item.dayOfWeek === dayIndex) || []
  );

  // Get non-leftover meals for leftover source selection
  const nonLeftoverMeals = mealPlan?.items.filter(i => !i.isLeftover && i.recipeId) || [];

  if (!user) {
    return (
      <div className="min-h-screen pb-20 md:pb-0 flex items-center justify-center">
        <div className="text-center space-y-4">
          <CalendarIcon className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">Sign in to plan your meals</h2>
          <Button asChild><Link to="/auth">Sign In</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading text-3xl font-bold">Meal Plan</h1>
            <p className="text-muted-foreground">Plan your week's meals</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[200px]">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={currentWeekStart}
                  onSelect={(date) => date && goToWeek(date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="icon" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button onClick={handleGenerateShoppingList} variant="secondary">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Generate Shopping List
          </Button>
          <Button onClick={handleGetPrepSuggestions} variant="outline" disabled={loadingPrep}>
            {loadingPrep ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Prep Suggestions
          </Button>
        </div>

        {/* Prep suggestions */}
        {prepSuggestions && (
          <Card className="mb-6 bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                What to Prep Ahead
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                {prepSuggestions}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {/* Week grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {DAYS.map((day, dayIndex) => (
              <Card key={day} className="min-h-[200px]">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span>{day}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(addDays(currentWeekStart, dayIndex), 'M/d')}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-2">
                  {itemsByDay[dayIndex].map(item => (
                    <div
                      key={item.id}
                      className={cn(
                        "p-2 rounded-lg text-xs group relative",
                        item.isLeftover ? "bg-muted/50 border border-dashed border-muted-foreground/30" : "bg-accent"
                      )}
                    >
                      <div className="font-medium text-muted-foreground mb-0.5">{item.mealLabel}</div>
                      <div className="font-medium line-clamp-2">
                        {item.recipeTitle || 'Unknown recipe'}
                        {item.isLeftover && <span className="text-muted-foreground ml-1">(leftover)</span>}
                      </div>
                      <div className="text-muted-foreground">{item.servings} servings</div>
                      <button
                        onClick={() => handleRemoveMeal(item.id)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => openAddDialog(dayIndex)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add meal
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Meal Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Meal - {DAYS[selectedDay]}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Recipe</Label>
              <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a recipe..." />
                </SelectTrigger>
                <SelectContent>
                  {dbRecipes.map(recipe => (
                    <SelectItem key={recipe.id} value={recipe.id}>
                      {recipe.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Meal Type</Label>
              <Select value={selectedMealLabel} onValueChange={setSelectedMealLabel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_MEALS.map(meal => (
                    <SelectItem key={meal} value={meal}>{meal}</SelectItem>
                  ))}
                  <SelectItem value="Custom">Custom...</SelectItem>
                </SelectContent>
              </Select>
              {selectedMealLabel === 'Custom' && (
                <Input
                  placeholder="e.g., Brunch, Late night snack"
                  value={customMealLabel}
                  onChange={e => setCustomMealLabel(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Servings</Label>
              <Input
                type="number"
                min={1}
                value={servings}
                onChange={e => setServings(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="leftover"
                checked={isLeftover}
                onCheckedChange={(checked) => setIsLeftover(checked === true)}
              />
              <Label htmlFor="leftover" className="text-sm font-normal cursor-pointer">
                This is a leftover from another meal
              </Label>
            </div>

            {isLeftover && nonLeftoverMeals.length > 0 && (
              <div className="space-y-2">
                <Label>Leftover from</Label>
                <Select value={leftoverSourceId} onValueChange={setLeftoverSourceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source meal..." />
                  </SelectTrigger>
                  <SelectContent>
                    {nonLeftoverMeals.map(meal => (
                      <SelectItem key={meal.id} value={meal.id}>
                        {DAYS[meal.dayOfWeek]} {meal.mealLabel} - {meal.recipeTitle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMeal}>Add Meal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MealPlanPage;
