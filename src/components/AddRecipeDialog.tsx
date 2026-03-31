import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Link2, PenLine, Camera, Upload } from 'lucide-react';

interface AddRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecipeAdded?: () => void;
}

const AddRecipeDialog = ({ open, onOpenChange, onRecipeAdded }: AddRecipeDialogProps) => {
  const { user } = useAuth();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  
  // URL tab state
  const [url, setUrl] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlPreview, setUrlPreview] = useState<any>(null);
  
  // Manual tab state
  const [manualLoading, setManualLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [servings, setServings] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');
  
  // Photo tab state
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoRecipe, setPhotoRecipe] = useState<any>(null);

  const resetForm = () => {
    setUrl('');
    setUrlPreview(null);
    setTitle('');
    setDescription('');
    setImageUrl('');
    setServings('');
    setPrepTime('');
    setCookTime('');
    setDifficulty('');
    setCuisine('');
    setIngredients('');
    setInstructions('');
    setPhotoPreview(null);
    setPhotoRecipe(null);
  };

  const handleUrlScrape = async () => {
    if (!url.trim()) return;
    setUrlLoading(true);
    setUrlPreview(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('scrape-recipe', {
        body: { url: url.trim() }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      setUrlPreview(data.recipe);
      toast.success('Recipe imported!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to import recipe');
    } finally {
      setUrlLoading(false);
    }
  };
  
  const saveRecipe = async (recipe: any) => {
    if (!user) {
      toast.error('Please sign in to save recipes');
      return;
    }
    
    try {
      const { error } = await supabase.from('recipes').insert({
        ...recipe,
        user_id: user.id,
      });
      
      if (error) throw error;
      
      toast.success('Recipe added to your cookbook!');
      resetForm();
      onOpenChange(false);
      onRecipeAdded?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save recipe');
    }
  };
  
  const handleManualSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    
    setManualLoading(true);
    try {
      const ingredientList = ingredients
        .split('\n')
        .filter(i => i.trim())
        .map(i => ({ name: i.trim(), amount: '', unit: '' }));
      const instructionList = instructions
        .split('\n')
        .filter(i => i.trim())
        .map((step, idx) => ({ step: idx + 1, instruction: step.trim() }));
      
      await saveRecipe({
        title: title.trim(),
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        servings: servings ? parseInt(servings) : null,
        prep_time: prepTime ? parseInt(prepTime) : null,
        cook_time: cookTime ? parseInt(cookTime) : null,
        difficulty: difficulty || null,
        cuisine: cuisine.trim() || null,
        ingredients: ingredientList,
        instructions: instructionList,
        category: [],
        tags: [],
      });
    } finally {
      setManualLoading(false);
    }
  };
  
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setPhotoLoading(true);
    setPhotoRecipe(null);
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      setPhotoPreview(dataUrl);
      
      try {
        const { data, error } = await supabase.functions.invoke('parse-recipe-image', {
          body: { image: base64, mimeType: file.type }
        });
        
        if (error) throw error;
        if (!data.success) throw new Error(data.error);
        
        setPhotoRecipe(data.recipe);
        toast.success('Recipe parsed from photo!');
      } catch (err: any) {
        toast.error(err.message || 'Failed to parse recipe from photo');
      } finally {
        setPhotoLoading(false);
      }
    };
    reader.readAsDataURL(file);
    
    // Reset input so same file can be selected again
    e.target.value = '';
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Recipe</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="url" className="mt-2">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="url" className="gap-2">
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">From URL</span>
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <PenLine className="h-4 w-4" />
              <span className="hidden sm:inline">Manually</span>
            </TabsTrigger>
            <TabsTrigger value="photo" className="gap-2">
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">From Photo</span>
            </TabsTrigger>
          </TabsList>
          
          {/* URL Tab */}
          <TabsContent value="url" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://www.recipetineats.com/..."
                value={url}
                onChange={e => setUrl(e.target.value)}
                disabled={urlLoading}
              />
              <Button onClick={handleUrlScrape} disabled={urlLoading || !url.trim()}>
                {urlLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Import'}
              </Button>
            </div>
            
            {urlPreview && (
              <div className="border rounded-lg p-4 space-y-3">
                {urlPreview.image_url && (
                  <img src={urlPreview.image_url} alt={urlPreview.title} className="w-full h-48 object-cover rounded-md" />
                )}
                <h3 className="font-semibold text-lg">{urlPreview.title}</h3>
                <p className="text-muted-foreground text-sm line-clamp-2">{urlPreview.description}</p>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>⏱️ {(urlPreview.prep_time || 0) + (urlPreview.cook_time || 0)} min</span>
                  <span>🍽️ {urlPreview.servings} servings</span>
                  <span>📊 {urlPreview.difficulty}</span>
                </div>
                <Button onClick={() => saveRecipe({
                  title: urlPreview.title,
                  description: urlPreview.description,
                  image_url: urlPreview.image_url,
                  servings: urlPreview.servings,
                  prep_time: urlPreview.prep_time,
                  cook_time: urlPreview.cook_time,
                  difficulty: urlPreview.difficulty,
                  category: urlPreview.category,
                  cuisine: urlPreview.cuisine,
                  tags: urlPreview.tags,
                  ingredients: urlPreview.ingredients,
                  instructions: urlPreview.instructions,
                  nutrition: urlPreview.nutrition,
                  rating: urlPreview.rating,
                  review_count: urlPreview.review_count,
                  author: urlPreview.author,
                })} className="w-full">
                  Save to Cookbook
                </Button>
              </div>
            )}
          </TabsContent>
          
          {/* Manual Tab */}
          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Title *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Recipe name" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" rows={2} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Image URL</Label>
                <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." type="url" />
              </div>
              <div className="space-y-1.5">
                <Label>Prep time (min)</Label>
                <Input value={prepTime} onChange={e => setPrepTime(e.target.value)} type="number" placeholder="15" />
              </div>
              <div className="space-y-1.5">
                <Label>Cook time (min)</Label>
                <Input value={cookTime} onChange={e => setCookTime(e.target.value)} type="number" placeholder="30" />
              </div>
              <div className="space-y-1.5">
                <Label>Servings</Label>
                <Input value={servings} onChange={e => setServings(e.target.value)} type="number" placeholder="4" />
              </div>
              <div className="space-y-1.5">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Cuisine</Label>
                <Input value={cuisine} onChange={e => setCuisine(e.target.value)} placeholder="Italian, Mexican, Asian..." />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Ingredients (one per line)</Label>
                <Textarea value={ingredients} onChange={e => setIngredients(e.target.value)} placeholder="2 cups flour&#10;1 tsp salt&#10;3 eggs" rows={4} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Instructions (one step per line)</Label>
                <Textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Preheat oven to 180°C&#10;Mix dry ingredients&#10;Add wet ingredients" rows={5} />
              </div>
            </div>
            <Button onClick={handleManualSave} disabled={manualLoading || !title.trim()} className="w-full">
              {manualLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : 'Save to Cookbook'}
            </Button>
          </TabsContent>
          
          {/* Photo Tab */}
          <TabsContent value="photo" className="space-y-4 mt-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center space-y-4">
              {!photoPreview ? (
                <>
                  <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">Take a photo of a recipe or upload an image</p>
                  <p className="text-xs text-muted-foreground">AI will extract the recipe details automatically</p>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={() => cameraInputRef.current?.click()}>
                      <Camera className="h-4 w-4 mr-2" />
                      Take Photo
                    </Button>
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handlePhotoCapture}
                    />
                    <Button variant="outline" onClick={() => uploadInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                    <input
                      ref={uploadInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoCapture}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <img src={photoPreview} alt="Recipe photo" className="w-full max-h-48 object-contain rounded-md" />
                  {photoLoading && (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Parsing recipe with AI...</span>
                    </div>
                  )}
                  <Button variant="outline" size="sm" onClick={() => { setPhotoPreview(null); setPhotoRecipe(null); }}>
                    Try another photo
                  </Button>
                </div>
              )}
            </div>
            
            {photoRecipe && (
              <div className="border rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-lg">{photoRecipe.title}</h3>
                {photoRecipe.description && (
                  <p className="text-muted-foreground text-sm line-clamp-2">{photoRecipe.description}</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {photoRecipe.prep_time && <span>⏱️ Prep: {photoRecipe.prep_time}min</span>}
                  {photoRecipe.cook_time && <span>🔥 Cook: {photoRecipe.cook_time}min</span>}
                  {photoRecipe.servings && <span>🍽️ {photoRecipe.servings} servings</span>}
                </div>
                <Button onClick={() => saveRecipe(photoRecipe)} className="w-full">
                  Save to Cookbook
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AddRecipeDialog;
