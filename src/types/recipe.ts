export interface Ingredient {
  item: string;
  amount: number;
  unit: string;
  group?: string;
}

export interface InstructionStep {
  stepNumber: number;
  instruction: string;
  timerMinutes?: number;
}

export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Dessert' | 'Snack';
export type CuisineType = 'Italian' | 'Mexican' | 'Asian' | 'Mediterranean' | 'American' | 'Indian' | 'French' | 'Japanese';
export type DietaryTag = 'Vegetarian' | 'Vegan' | 'Gluten-Free' | 'Keto' | 'Dairy-Free';

export interface Recipe {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  servings: number;
  prepTime: number;
  cookTime: number;
  difficulty: Difficulty;
  category: MealType[];
  cuisine: CuisineType;
  tags: (DietaryTag | string)[];
  ingredients: Ingredient[];
  instructions: InstructionStep[];
  nutrition: Nutrition;
  rating: number;
  reviewCount: number;
  author: string;
}

export interface ShoppingItem {
  id: string;
  item: string;
  amount: number;
  unit: string;
  checked: boolean;
  recipeTitle?: string;
}
