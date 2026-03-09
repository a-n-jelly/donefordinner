const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, mimeType = 'image/jpeg' } = await req.json();
    
    if (!image) {
      return new Response(JSON.stringify({ success: false, error: 'Image is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ success: false, error: 'AI not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Parsing recipe from image...');

    const prompt = `You are a recipe parser. Analyze this recipe image and extract all recipe information into a structured JSON format.

Extract the following fields:
- title (string, required - the name of the dish)
- description (string, brief description of the dish)
- servings (number)
- prep_time (number, in minutes)
- cook_time (number, in minutes)
- difficulty (string: "Easy", "Medium", or "Hard")
- cuisine (string, e.g., "Italian", "Mexican", "Asian")
- category (array of strings, e.g., ["Dinner", "Lunch"])
- tags (array of strings for dietary info, e.g., ["Vegetarian", "Gluten-Free"])
- ingredients (array of objects with fields: name (string), amount (string), unit (string))
- instructions (array of objects with fields: step (number), instruction (string))
- nutrition (object with: calories, protein, carbs, fat - all numbers per serving, or null if not visible)

Return ONLY valid JSON with these fields. Use null for missing fields. Do not include markdown code blocks.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${image}` }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI API error:', errText);
      throw new Error('Failed to parse recipe with AI');
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('No content in AI response:', aiData);
      throw new Error('No response from AI');
    }

    console.log('AI response:', content.substring(0, 500));

    let recipe;
    try {
      // Try to parse directly
      recipe = JSON.parse(content);
    } catch {
      // Try to extract JSON from text (in case of markdown code blocks)
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        recipe = JSON.parse(match[0]);
      } else {
        console.error('Could not parse AI response:', content);
        throw new Error('Could not parse AI response as JSON');
      }
    }

    if (!recipe.title) {
      throw new Error('Could not extract recipe from image');
    }

    // Normalize the recipe data
    const processedRecipe = {
      title: recipe.title,
      description: recipe.description || null,
      servings: recipe.servings || null,
      prep_time: recipe.prep_time || null,
      cook_time: recipe.cook_time || null,
      difficulty: recipe.difficulty || 'Medium',
      cuisine: recipe.cuisine || null,
      category: Array.isArray(recipe.category) ? recipe.category : [],
      tags: Array.isArray(recipe.tags) ? recipe.tags : [],
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
      nutrition: recipe.nutrition || null,
      image_url: null,
      rating: null,
      review_count: null,
      author: null,
    };

    console.log('Successfully parsed recipe:', processedRecipe.title);

    return new Response(JSON.stringify({ success: true, recipe: processedRecipe }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to parse recipe' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
