const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipes } = await req.json();

    if (!recipes || !Array.isArray(recipes) || recipes.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'No recipes provided' }), {
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

    // Format recipes for the prompt
    const recipeSummaries = recipes.map((r: any, i: number) => {
      const instructions = Array.isArray(r.instructions)
        ? r.instructions.map((s: any) => s.instruction || s.text || '').join('\n')
        : '';
      const ingredients = Array.isArray(r.ingredients)
        ? r.ingredients.map((ing: any) => ing.name || ing.item || '').join(', ')
        : '';

      return `Recipe ${i + 1}: ${r.title}
Prep time: ${r.prep_time || 'unknown'} minutes
Ingredients: ${ingredients}
Instructions:
${instructions}`;
    }).join('\n\n---\n\n');

    const prompt = `You are a meal prep expert. Analyze these recipes for a weekly meal plan and provide practical prep-ahead suggestions.

${recipeSummaries}

Based on these recipes, provide:
1. What can be prepped ahead of time (sauces, marinades, chopped vegetables, pre-cooked grains, etc.)
2. Which items should be prepped together to save time
3. Recommended prep day schedule (what to do Sunday vs. during the week)
4. Any ingredients that can be batch-prepared and used across multiple recipes
5. Storage tips for prepped items

Be specific and practical. Format your response in clear sections. Keep it concise but actionable.`;

    console.log('Analyzing prep for', recipes.length, 'recipes');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI API error:', errText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded, please try again later' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ success: false, error: 'AI credits exhausted' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      throw new Error('Failed to get prep suggestions from AI');
    }

    const aiData = await response.json();
    const suggestions = aiData.choices?.[0]?.message?.content;

    if (!suggestions) {
      throw new Error('No response from AI');
    }

    console.log('Successfully generated prep suggestions');

    return new Response(JSON.stringify({ success: true, suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze prep'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
