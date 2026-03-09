import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Recipe scraping not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping recipe from:', formattedUrl);

    // Define recipe schema for structured extraction
    const recipeSchema = {
      type: 'object',
      properties: {
        title: { 
          type: 'string', 
          description: 'Recipe title or name' 
        },
        description: { 
          type: 'string', 
          description: 'Brief description or summary of the recipe' 
        },
        servings: { 
          type: 'integer', 
          description: 'Number of servings this recipe makes' 
        },
        prep_time: { 
          type: 'integer', 
          description: 'Preparation time in minutes' 
        },
        cook_time: { 
          type: 'integer', 
          description: 'Cooking time in minutes' 
        },
        difficulty: { 
          type: 'string', 
          enum: ['Easy', 'Medium', 'Hard'],
          description: 'Recipe difficulty level' 
        },
        cuisine: { 
          type: 'string', 
          description: 'Cuisine type (e.g., Italian, Mexican, Asian)' 
        },
        category: { 
          type: 'array',
          items: { type: 'string' },
          description: 'Meal types (e.g., Breakfast, Lunch, Dinner, Dessert)' 
        },
        tags: { 
          type: 'array',
          items: { type: 'string' },
          description: 'Dietary tags (e.g., Vegetarian, Vegan, Gluten-Free)' 
        },
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
        image_url: { 
          type: 'string', 
          description: 'Main recipe image URL' 
        },
        author: { 
          type: 'string', 
          description: 'Recipe author or source' 
        }
      },
      required: ['title', 'ingredients', 'instructions']
    };

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['extract'],
        extract: {
          schema: recipeSchema,
          prompt: 'Extract all recipe information from this page including title, description, ingredients with amounts and units, step-by-step instructions, nutritional values per serving, cooking times, difficulty level, cuisine type, categories, and dietary tags.'
        },
        onlyMainContent: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.error || `Failed to scrape recipe (${response.status})` 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract recipe data from Firecrawl response
    const recipeData = data.data?.extract || data.extract;
    
    if (!recipeData || !recipeData.title) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not extract recipe data from this URL. Please make sure it\'s a recipe page.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set defaults for missing fields
    const processedRecipe = {
      ...recipeData,
      servings: recipeData.servings || 4,
      prep_time: recipeData.prep_time || 15,
      cook_time: recipeData.cook_time || 30,
      difficulty: recipeData.difficulty || 'Medium',
      cuisine: recipeData.cuisine || 'International',
      category: Array.isArray(recipeData.category) ? recipeData.category : ['Dinner'],
      tags: Array.isArray(recipeData.tags) ? recipeData.tags : [],
      nutrition: recipeData.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
      author: recipeData.author || 'Unknown',
      rating: 4.5,
      review_count: 0,
    };

    console.log('Recipe extracted successfully:', processedRecipe.title);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        recipe: processedRecipe,
        source_url: formattedUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error scraping recipe:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape recipe';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});