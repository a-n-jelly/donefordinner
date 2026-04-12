import { useState } from 'react';
import { format, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, getDay } from 'date-fns';
import { useMealPlan, MealPlanItem, DayTag } from '@/hooks/useMealPlan';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  ChevronLeft, ChevronRight, Plus, Trash2, CalendarIcon, ShoppingCart,
  Sparkles, Loader2, GripVertical, StickyNote, Tag, UtensilsCrossed,
  CalendarDays, LayoutGrid
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DEFAULT_MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

type ViewMode = 'week' | 'month';

const MealPlanPage = () => {
  const { user } = useAuth();
  const {
    mealPlan, loading, currentWeekStart, nextWeek, prevWeek, goToWeek,
    addMeal, removeMeal, updateMeal, getMealsForShopping, updateDayNote,
    updateDayTag, moveMeal, getUpcomingMealsForPrep
  } = useMealPlan();
  const { dbRecipes } = useDbRecipes();
  const { addItems } = useShoppingList();

  const [viewMode, setViewMode] = useState<ViewMode>('week');
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

  const [editingNoteDay, setEditingNoteDay] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');

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
      selectedRecipeId, selectedDay, label.trim(), servings,
      isLeftover, isLeftover ? leftoverSourceId || null : null
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

    const recipeIds = [...new Set(meals.map(m => m.recipeId).filter(Boolean))] as string[];
    const { data: recipes } = await supabase
      .from('recipes')
      .select('id, title, ingredients, servings')
      .in('id', recipeIds);

    if (!recipes || recipes.length === 0) {
      toast.error('Could not fetch recipe details');
      return;
    }

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
          ingredientMap.set(key, { amount, unit, recipeTitle: recipe.title });
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

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const sourceDay = parseInt(result.source.droppableId);
    const destDay = parseInt(result.destination.droppableId);
    if (sourceDay === destDay) return;

    const itemId = result.draggableId;
    const { error } = await moveMeal(itemId, destDay);
    if (error) toast.error('Failed to move meal');
  };

  const startEditingNote = (dayIndex: number) => {
    setEditingNoteDay(dayIndex);
    setNoteText(mealPlan?.dayNotes?.[String(dayIndex)] || '');
  };

  const saveNote = async () => {
    if (editingNoteDay === null) return;
    await updateDayNote(editingNoteDay, noteText);
    setEditingNoteDay(null);
  };

  const handleTagChange = async (dayIndex: number, tag: DayTag) => {
    const currentTag = mealPlan?.dayTags?.[String(dayIndex)] || null;
    const newTag = currentTag === tag ? null : tag;
    await updateDayTag(dayIndex, newTag);
  };

  const itemsByDay = DAYS.map((_, dayIndex) =>
    mealPlan?.items.filter(item => item.dayOfWeek === dayIndex) || []
  );

  const nonLeftoverMeals = mealPlan?.items.filter(i => !i.isLeftover && i.recipeId) || [];

  // Monthly view helpers
  const monthDate = currentWeekStart;
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const getMonthDays = () => {
    const days: Date[] = [];
    let d = calendarStart;
    while (d <= calendarEnd) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  };

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

  const DayTagBadge = ({ dayIndex }: { dayIndex: number }) => {
    const tag = mealPlan?.dayTags?.[String(dayIndex)] || null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-0.5 rounded hover:bg-muted/50 transition-colors">
            {tag === 'shopping' ? (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 gap-0.5">
                <ShoppingCart className="h-2.5 w-2.5" /> Shop
              </Badge>
            ) : tag === 'prep' ? (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-0.5">
                <UtensilsCrossed className="h-2.5 w-2.5" /> Prep
              </Badge>
            ) : (
              <Tag className="h-3.5 w-3.5 text-muted-foreground/50" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[140px]">
          <DropdownMenuItem onClick={() => handleTagChange(dayIndex, 'shopping')}>
            <ShoppingCart className="h-3.5 w-3.5 mr-2 text-blue-600" />
            Shopping Day
            {tag === 'shopping' && <span className="ml-auto text-xs">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleTagChange(dayIndex, 'prep')}>
            <UtensilsCrossed className="h-3.5 w-3.5 mr-2 text-amber-600" />
            Prep Day
            {tag === 'prep' && <span className="ml-auto text-xs">✓</span>}
          </DropdownMenuItem>
          {tag && (
            <DropdownMenuItem onClick={() => handleTagChange(dayIndex, tag)}>
              <Trash2 className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              Clear Tag
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const PrepHighlight = ({ dayIndex }: { dayIndex: number }) => {
    const tag = mealPlan?.dayTags?.[String(dayIndex)] || null;
    if (tag !== 'prep') return null;
    const upcoming = getUpcomingMealsForPrep(dayIndex);
    if (upcoming.length === 0) return null;

    return (
      <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-2 text-xs space-y-1">
        <div className="font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1">
          <UtensilsCrossed className="h-3 w-3" /> Prep these ahead:
        </div>
        {upcoming.map(meal => (
          <div key={meal.id} className="text-foreground/80 pl-4">
            • {meal.recipeTitle} <span className="text-muted-foreground">({DAYS[meal.dayOfWeek]})</span>
          </div>
        ))}
      </div>
    );
  };

  const getDayCardClasses = (dayIndex: number) => {
    const tag = mealPlan?.dayTags?.[String(dayIndex)] || null;
    if (tag === 'shopping') return 'border-blue-500/30 bg-blue-500/5';
    if (tag === 'prep') return 'border-amber-500/30 bg-amber-500/5';
    return '';
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading text-3xl font-bold">Meal Plan</h1>
            <p className="text-muted-foreground">Plan your meals — drag between days, tag shopping & prep days</p>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-muted rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('week')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5",
                  viewMode === 'week' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <CalendarDays className="h-3.5 w-3.5" /> Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5",
                  viewMode === 'month' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Month
              </button>
            </div>

            <Button variant="outline" size="icon" onClick={prevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[200px]">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {viewMode === 'week'
                    ? `${format(currentWeekStart, 'MMM d')} - ${format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}`
                    : format(currentWeekStart, 'MMMM yyyy')
                  }
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

        {/* WEEK VIEW */}
        {!loading && viewMode === 'week' && (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {DAYS.map((day, dayIndex) => {
                const dayNote = mealPlan?.dayNotes?.[String(dayIndex)] || '';
                return (
                  <Droppable droppableId={String(dayIndex)} key={day}>
                    {(provided, snapshot) => (
                      <Card
                        className={cn(
                          "min-h-[200px] transition-colors",
                          snapshot.isDraggingOver && "ring-2 ring-primary/40 bg-primary/5",
                          getDayCardClasses(dayIndex)
                        )}
                      >
                        <CardHeader className="py-3 px-4">
                          <CardTitle className="text-sm font-medium flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span>{day}</span>
                              <DayTagBadge dayIndex={dayIndex} />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(addDays(currentWeekStart, dayIndex), 'M/d')}
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 pb-3 space-y-2">
                          {/* Prep highlight */}
                          <PrepHighlight dayIndex={dayIndex} />

                          {/* Day note */}
                          {editingNoteDay === dayIndex ? (
                            <Textarea
                              className="text-xs min-h-[48px] resize-none"
                              placeholder="Add a note for this day..."
                              value={noteText}
                              onChange={e => setNoteText(e.target.value)}
                              onBlur={saveNote}
                              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNote(); } }}
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() => startEditingNote(dayIndex)}
                              className={cn(
                                "w-full text-left text-xs rounded-md p-2 transition-colors",
                                dayNote ? "bg-accent/60 text-foreground" : "text-muted-foreground hover:bg-muted/50"
                              )}
                            >
                              <StickyNote className="h-3 w-3 inline mr-1 opacity-60" />
                              {dayNote || 'Add note...'}
                            </button>
                          )}

                          {/* Meals */}
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="space-y-2 min-h-[40px]"
                          >
                            {itemsByDay[dayIndex].map((item, index) => (
                              <Draggable key={item.id} draggableId={item.id} index={index}>
                                {(dragProvided, dragSnapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    className={cn(
                                      "p-2 rounded-lg text-xs group relative",
                                      item.isLeftover ? "bg-muted/50 border border-dashed border-muted-foreground/30" : "bg-accent",
                                      dragSnapshot.isDragging && "shadow-lg ring-2 ring-primary/30"
                                    )}
                                  >
                                    <div className="flex items-start gap-1">
                                      <div
                                        {...dragProvided.dragHandleProps}
                                        className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <GripVertical className="h-3 w-3" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-muted-foreground mb-0.5">{item.mealLabel}</div>
                                        <div className="font-medium line-clamp-2">
                                          {item.recipeTitle || 'Unknown recipe'}
                                          {item.isLeftover && <span className="text-muted-foreground ml-1">(leftover)</span>}
                                        </div>
                                        <div className="text-muted-foreground">{item.servings} servings</div>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleRemoveMeal(item.id)}
                                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-opacity"
                                    >
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </button>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>

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
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        )}

        {/* MONTH VIEW */}
        {!loading && viewMode === 'month' && (
          <div>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {getMonthDays().map((date, i) => {
                const isCurrentMonth = isSameMonth(date, monthDate);
                const isToday = isSameDay(date, new Date());

                // Check if this date falls in the current week to show tags/meals
                const dayOfWeekIndex = (getDay(date) + 6) % 7; // Convert Sun=0 to Mon=0
                const isCurrentWeek = isSameDay(startOfWeek(date, { weekStartsOn: 1 }), currentWeekStart);
                const dayItems = isCurrentWeek ? itemsByDay[dayOfWeekIndex] : [];
                const dayTag = isCurrentWeek ? (mealPlan?.dayTags?.[String(dayOfWeekIndex)] || null) : null;

                return (
                  <button
                    key={i}
                    onClick={() => goToWeek(date)}
                    className={cn(
                      "min-h-[90px] p-1.5 rounded-lg border text-left transition-colors hover:bg-accent/50",
                      isCurrentMonth ? "border-border" : "border-transparent opacity-40",
                      isToday && "ring-2 ring-primary/40",
                      isCurrentWeek && "bg-accent/30",
                      dayTag === 'shopping' && isCurrentWeek && "border-blue-500/30 bg-blue-500/5",
                      dayTag === 'prep' && isCurrentWeek && "border-amber-500/30 bg-amber-500/5",
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        "text-xs font-medium",
                        isToday ? "bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center" : ""
                      )}>
                        {format(date, 'd')}
                      </span>
                      {dayTag === 'shopping' && (
                        <ShoppingCart className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      )}
                      {dayTag === 'prep' && (
                        <UtensilsCrossed className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      )}
                    </div>
                    {dayItems.slice(0, 3).map(item => (
                      <div key={item.id} className="text-[10px] leading-tight truncate text-foreground/70 mb-0.5">
                        {item.recipeTitle || item.mealLabel}
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">+{dayItems.length - 3} more</div>
                    )}
                  </button>
                );
              })}
            </div>
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
