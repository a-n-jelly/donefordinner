import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const recipeSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Recipe title or name' },
    description: { type: 'string', description: 'Brief description or summary of the recipe' },
    servings: { type: 'integer', description: 'Number of servings this recipe makes' },
    prep_time: { type: 'integer', description: 'Preparation time in minutes' },
    cook_time: { type: 'integer', description: 'Cooking time in minutes' },
    difficulty: { type: 'string', enum: ['Easy', 'Medium', 'Hard'], description: 'Recipe difficulty level' },
    cuisine: { type: 'string', description: 'Cuisine type (e.g., Italian, Mexican, Asian)' },
    category: { type: 'array', items: { type: 'string' }, description: 'Meal types (e.g., Breakfast, Lunch, Dinner, Dessert)' },
    tags: { type: 'array', items: { type: 'string' }, description: 'Dietary tags (e.g., Vegetarian, Vegan, Gluten-Free)' },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          item: { type: 'string', description: 'Ingredient name' },
          amount: { type: 'number', description: 'Amount/quantity as a number' },
          unit: { type: 'string', description: 'Unit of measurement (cups, tbsp, etc.)' }
        },
        required: ['item', 'amount', 'unit']
      }
    },
    instructions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          stepNumber: { type: 'integer', description: 'Step number' },
          instruction: { type: 'string', description: 'Instruction text' },
          timerMinutes: { type: 'integer', description: 'Optional timer in minutes' }
        },
        required: ['stepNumber', 'instruction']
      }
    },
    nutrition: {
      type: 'object',
      properties: {
        calories: { type: 'integer', description: 'Calories per serving' },
        protein: { type: 'number', description: 'Protein in grams' },
        carbs: { type: 'number', description: 'Carbohydrates in grams' },
        fat: { type: 'number', description: 'Fat in grams' }
      }
    },
    image_url: { type: 'string', description: 'Main recipe image URL' },
    author: { type: 'string', description: 'Recipe author or source' }
  },
  required: ['title', 'ingredients', 'instructions']
};

async function scrapeRecipe(url: string, apiKey: string): Promise<any> {
  console.log('Scraping:', url);
  
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['extract'],
      extract: {
        schema: recipeSchema,
        prompt: 'Extract all recipe information including title, description, ingredients with amounts and units, step-by-step instructions, nutritional values per serving, cooking times, difficulty level, cuisine type, categories, and dietary tags.'
      },
      onlyMainContent: true,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Failed to scrape ${url}: ${data.error || response.status}`);
  }

  const recipeData = data.data?.extract || data.extract;
  if (!recipeData || !recipeData.title) {
    throw new Error(`No recipe data found at ${url}`);
  }

  return {
    title: recipeData.title,
    description: recipeData.description || '',
    image_url: recipeData.image_url || null,
    servings: recipeData.servings || 4,
    prep_time: recipeData.prep_time || 15,
    cook_time: recipeData.cook_time || 30,
    difficulty: recipeData.difficulty || 'Medium',
    category: Array.isArray(recipeData.category) ? recipeData.category : ['Dinner'],
    cuisine: recipeData.cuisine || 'International',
    tags: Array.isArray(recipeData.tags) ? recipeData.tags : [],
    ingredients: recipeData.ingredients || [],
    instructions: recipeData.instructions || [],
    nutrition: recipeData.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
    author: recipeData.author || 'Unknown',
    rating: 4.5,
    review_count: 0,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { urls } = await req.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'URLs array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'FIRECRAWL_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: { url: string; success: boolean; title?: string; error?: string }[] = [];

    for (const url of urls) {
      try {
        const recipe = await scrapeRecipe(url.trim(), apiKey);
        
        // Check if recipe already exists
        const { data: existing } = await supabase
          .from('recipes')
          .select('id')
          .eq('title', recipe.title)
          .is('user_id', null)
          .maybeSingle();
        
        if (existing) {
          results.push({ url, success: true, title: recipe.title, skipped: true });
          console.log('Skipped (exists):', recipe.title);
          continue;
        }
        
        const { error: insertError } = await supabase.from('recipes').insert(recipe);
        
        if (insertError) {
          results.push({ url, success: false, error: insertError.message });
        } else {
          results.push({ url, success: true, title: recipe.title });
          console.log('Inserted:', recipe.title);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.push({ url, success: false, error: message });
        console.error('Error processing', url, message);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const successful = results.filter(r => r.success).length;
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Seeded ${successful}/${urls.length} recipes`,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to seed recipes' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
