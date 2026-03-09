import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const AddRecipePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  const handleScrape = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setPreview(null);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-recipe', {
        body: { url: url.trim() }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setPreview(data.recipe);
      toast.success('Recipe scraped successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to scrape recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preview || !user) return;
    setLoading(true);

    try {
      const { error } = await supabase.from('recipes').insert({
        user_id: user.id,
        title: preview.title,
        description: preview.description,
        image_url: preview.image_url,
        servings: preview.servings,
        prep_time: preview.prep_time,
        cook_time: preview.cook_time,
        difficulty: preview.difficulty,
        category: preview.category,
        cuisine: preview.cuisine,
        tags: preview.tags,
        ingredients: preview.ingredients,
        instructions: preview.instructions,
        nutrition: preview.nutrition,
        rating: preview.rating,
        review_count: preview.review_count,
        author: preview.author,
      });

      if (error) throw error;

      toast.success('Recipe added to your cookbook!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save recipe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-heading text-3xl font-bold mb-2">Add Recipe from URL</h1>
        <p className="text-muted-foreground mb-8">Paste a recipe URL to import it into your cookbook</p>

        <div className="flex gap-3 mb-8">
          <Input
            type="url"
            placeholder="https://www.recipetineats.com/..."
            value={url}
            onChange={e => setUrl(e.target.value)}
            disabled={loading}
          />
          <Button onClick={handleScrape} disabled={loading || !url.trim()}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Scraping...</> : 'Import'}
          </Button>
        </div>

        {preview && (
          <Card>
            <CardHeader>
              {preview.image_url && (
                <img src={preview.image_url} alt={preview.title} className="w-full h-64 object-cover rounded-lg mb-4" />
              )}
              <CardTitle>{preview.title}</CardTitle>
              <CardDescription>{preview.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 text-sm">
                <span>⏱️ {preview.prep_time + preview.cook_time} min</span>
                <span>🍽️ {preview.servings} servings</span>
                <span>📊 {preview.difficulty}</span>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={loading}>Save to Cookbook</Button>
                <Button variant="outline" onClick={() => setPreview(null)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AddRecipePage;
