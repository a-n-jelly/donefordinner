import { Link } from 'react-router-dom';
import { Clock, ChefHat, Star, Heart } from 'lucide-react';
import { Recipe } from '@/types/recipe';
import { motion } from 'framer-motion';

interface RecipeCardProps {
  recipe: Recipe;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}

const difficultyColor: Record<string, string> = {
  Easy: 'bg-primary/15 text-primary',
  Medium: 'bg-secondary/15 text-secondary',
  Hard: 'bg-destructive/15 text-destructive',
};

const RecipeCard = ({ recipe, isFavorite, onToggleFavorite }: RecipeCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="group relative bg-card rounded-lg overflow-hidden shadow-warm hover:shadow-warm-lg transition-all duration-300"
    >
      <Link to={`/recipe/${recipe.id}`} className="block">
        <div className="aspect-[4/3] overflow-hidden">
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${difficultyColor[recipe.difficulty]}`}>
              {recipe.difficulty}
            </span>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-3.5 w-3.5 fill-secondary text-secondary" />
              <span className="font-medium">{recipe.rating}</span>
            </div>
          </div>
          <h3 className="font-heading text-lg font-semibold text-card-foreground leading-tight mb-1">
            {recipe.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{recipe.description}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {recipe.prepTime + recipe.cookTime} min
            </span>
            <span className="flex items-center gap-1">
              <ChefHat className="h-3.5 w-3.5" />
              {recipe.cuisine}
            </span>
          </div>
        </div>
      </Link>
      <button
        onClick={(e) => { e.preventDefault(); onToggleFavorite(recipe.id); }}
        className="absolute top-3 right-3 p-2 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition-colors"
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart className={`h-4 w-4 transition-colors ${isFavorite ? 'fill-secondary text-secondary' : 'text-muted-foreground'}`} />
      </button>
    </motion.div>
  );
};

export default RecipeCard;
