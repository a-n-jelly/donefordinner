import { Link } from 'react-router-dom';
import { UtensilsCrossed, BookOpen, CalendarDays, ShoppingCart, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const benefits = [
  {
    icon: BookOpen,
    title: 'Digital Cookbook',
    description: 'Import recipes from any website, snap a photo, or add them by hand. Your entire collection in one place.',
  },
  {
    icon: CalendarDays,
    title: 'Meal Planner',
    description: 'Plan your week with drag-and-drop simplicity. AI suggests prep-ahead strategies to save time.',
  },
  {
    icon: ShoppingCart,
    title: 'Smart Shopping List',
    description: 'Auto-generate grocery lists from your meal plan, scaled to your servings. Never forget an ingredient.',
  },
  {
    icon: ChefHat,
    title: 'Cooking Mode',
    description: 'Step-by-step guided cooking with hands-free navigation. Focus on the food, not your phone.',
  },
];

const LandingPage = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/cookbook" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-6 w-6 text-primary" />
          <span className="font-heading text-xl font-bold text-foreground">Savory</span>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/auth">Sign In</Link>
        </Button>
      </nav>

      {/* Hero */}
      <section className="px-6 md:px-12 pt-16 pb-20 md:pt-24 md:pb-28 text-center max-w-3xl mx-auto">
        <h1 className="font-heading text-4xl md:text-6xl font-bold text-foreground leading-tight mb-6">
          Your recipes,{' '}
          <span className="text-primary">beautifully organized</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          A digital cookbook, meal planner, and shopping list — all in one place.
          Import recipes from anywhere, plan your week, and cook with confidence.
        </p>
        <Button size="lg" asChild className="h-12 px-8 text-base">
          <Link to="/auth">Get Started</Link>
        </Button>
      </section>

      {/* Benefits */}
      <section className="px-6 md:px-12 pb-24 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="rounded-xl border bg-card p-6 shadow-warm hover:shadow-warm-lg transition-shadow"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                  <b.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-foreground">{b.title}</h3>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Savory. All rights reserved.
      </footer>
    </div>
  );
};

export default LandingPage;
