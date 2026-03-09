import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMyRecipes } from '@/hooks/useDbRecipes';
import AddRecipeDialog from '@/components/AddRecipeDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Users, Trash2, Plus, ChefHat } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const MyRecipesPage = () => {
  const { user } = useAuth();
  const { recipes, loading, refetch, deleteRecipe } = useMyRecipes(user?.id);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const handleDelete = async (id: string, title: string) => {
    const { error } = await deleteRecipe(id);
    if (error) {
      toast.error('Failed to delete recipe');
    } else {
      toast.success(`"${title}" deleted`);
    }
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold">My Recipes</h1>
            <p className="text-muted-foreground mt-1">Recipes you've imported or created</p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Recipe
          </Button>
        </div>

        {!user && (
          <div className="text-center py-16 space-y-4">
            <ChefHat className="h-16 w-16 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold">Sign in to see your recipes</h2>
            <p className="text-muted-foreground">Create an account to start building your personal cookbook.</p>
            <Button asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        )}

        {user && loading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {user && !loading && recipes.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <ChefHat className="h-16 w-16 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold">No recipes yet</h2>
            <p className="text-muted-foreground">Import from a URL, add manually, or snap a photo of a recipe.</p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Recipe
            </Button>
          </div>
        )}

        {user && !loading && recipes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map(recipe => (
              <Card key={recipe.id} className="overflow-hidden group">
                <Link to={`/recipe/${recipe.id}`}>
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={recipe.imageUrl}
                      alt={recipe.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    {recipe.difficulty && (
                      <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-xs font-medium bg-background/80 backdrop-blur-sm text-foreground">
                        {recipe.difficulty}
                      </span>
                    )}
                  </div>
                </Link>
                <CardContent className="p-4 space-y-2">
                  <Link to={`/recipe/${recipe.id}`}>
                    <h3 className="font-semibold text-lg line-clamp-1 hover:text-primary transition-colors">
                      {recipe.title}
                    </h3>
                  </Link>
                  <p className="text-muted-foreground text-sm line-clamp-2">{recipe.description}</p>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {(recipe.prepTime || 0) + (recipe.cookTime || 0)}min
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {recipe.servings}
                      </span>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete recipe?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{recipe.title}". This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(recipe.id, recipe.title)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AddRecipeDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onRecipeAdded={refetch} />
    </div>
  );
};

export default MyRecipesPage;
