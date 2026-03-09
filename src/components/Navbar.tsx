import { Link, useLocation } from 'react-router-dom';
import { UtensilsCrossed, Heart, ShoppingCart, LogIn, LogOut, User, CalendarDays } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const Navbar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const links = [
    { to: '/', label: 'Cookbook', icon: UtensilsCrossed },
    { to: '/meal-plan', label: 'Meal Plan', icon: CalendarDays },
    { to: '/favorites', label: 'Favorites', icon: Heart },
    { to: '/shopping-list', label: 'Shopping', icon: ShoppingCart },
  ];

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? '';

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

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 focus:outline-none">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="text-xs text-muted-foreground cursor-default">
                  {user.email}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link to="/auth" className="gap-2">
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            </Button>
          )}
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
          {user ? (
            <button onClick={signOut} className="flex flex-col items-center gap-1 px-4 py-2 text-xs font-medium text-muted-foreground">
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          ) : (
            <Link
              to="/auth"
              className={`flex flex-col items-center gap-1 px-4 py-2 text-xs font-medium transition-colors ${
                location.pathname === '/auth' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <User className="h-5 w-5" />
              Sign In
            </Link>
          )}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
