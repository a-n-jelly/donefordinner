import { useShoppingList } from '@/hooks/useShoppingList';
import { ShoppingCart, Trash2, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const ShoppingListPage = () => {
  const { items, toggleItem, removeItem, clearChecked, clearAll } = useShoppingList();

  const unchecked = items.filter(i => !i.checked);
  const checked = items.filter(i => i.checked);

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Shopping List</h1>
            <p className="text-muted-foreground text-sm">{items.length} items</p>
          </div>
          {items.length > 0 && (
            <div className="flex gap-2">
              {checked.length > 0 && (
                <button onClick={clearChecked} className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:bg-accent transition-colors">
                  Clear checked
                </button>
              )}
              <button onClick={clearAll} className="text-xs px-3 py-1.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                Clear all
              </button>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-lg text-muted-foreground mb-2">Your shopping list is empty</p>
            <Link to="/cookbook" className="text-primary hover:underline text-sm">Browse recipes to add ingredients</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {unchecked.length > 0 && (
              <ul className="space-y-1">
                {unchecked.map(item => (
                  <li key={item.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                    <button onClick={() => toggleItem(item.id)} className="flex-shrink-0 w-5 h-5 rounded border border-border" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground">
                        <strong>{item.amount} {item.unit}</strong> {item.item}
                      </span>
                      {item.recipeTitle && (
                        <span className="block text-xs text-muted-foreground">{item.recipeTitle}</span>
                      )}
                    </div>
                    <button onClick={() => removeItem(item.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {checked.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Checked ({checked.length})</h3>
                <ul className="space-y-1">
                  {checked.map(item => (
                    <li key={item.id} className="flex items-center gap-3 p-3 rounded-lg opacity-50 group">
                      <button onClick={() => toggleItem(item.id)} className="flex-shrink-0 w-5 h-5 rounded bg-primary border-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </button>
                      <span className="flex-1 text-sm line-through text-muted-foreground">
                        {item.amount} {item.unit} {item.item}
                      </span>
                      <button onClick={() => removeItem(item.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1">
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShoppingListPage;
