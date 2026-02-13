import { Link, useLocation } from 'react-router-dom';
import { UtensilsCrossed, Heart, ShoppingCart, Search } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();

  const links = [
    { to: '/', label: 'Recipes', icon: UtensilsCrossed },
    { to: '/favorites', label: 'Favorites', icon: Heart },
    { to: '/shopping-list', label: 'Shopping List', icon: ShoppingCart },
  ];

  return (
    <>
      {/* Desktop navbar */}
      <nav className="hidden md:flex items-center justify-between px-8 py-4 border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2">
          <UtensilsCrossed className="h-6 w-6 text-primary" />
          <span className="font-heading text-xl font-bold text-foreground">Savory</span>
        </Link>
        <div className="flex items-center gap-6">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === link.to ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t">
        <div className="flex justify-around py-2">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex flex-col items-center gap-1 px-4 py-2 text-xs font-medium transition-colors ${
                location.pathname === link.to ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
