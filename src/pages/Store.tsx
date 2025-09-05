import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image_url: string | null;
  stock_quantity: number;
  category_id: string;
  product_categories: {
    name: string;
  } | null;
}

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  products: Product;
}

interface Category {
  id: string;
  name: string;
}

export default function Store() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({
    payment_method: 'cash',
    shipping_address: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    if (user) {
      fetchCart();
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_categories(name)
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCart = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('shopping_cart')
        .select(`
          *,
          products(*, product_categories(name))
        `)
        .eq('user_id', profile.id);

      if (error) throw error;
      setCart(data || []);
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  const addToCart = async (productId: string) => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour ajouter des produits au panier",
        variant: "destructive",
      });
      return;
    }

    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from('shopping_cart')
        .upsert({
          user_id: profile.id,
          product_id: productId,
          quantity: 1
        }, {
          onConflict: 'user_id,product_id'
        });

      if (error) throw error;

      await fetchCart();
      toast({
        title: "Ajouté au panier",
        description: "Le produit a été ajouté à votre panier",
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le produit au panier",
        variant: "destructive",
      });
    }
  };

  const updateCartQuantity = async (cartItemId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      await removeFromCart(cartItemId);
      return;
    }

    try {
      const { error } = await supabase
        .from('shopping_cart')
        .update({ quantity: newQuantity })
        .eq('id', cartItemId);

      if (error) throw error;
      await fetchCart();
    } catch (error) {
      console.error('Error updating cart:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la quantité",
        variant: "destructive",
      });
    }
  };

  const removeFromCart = async (cartItemId: string) => {
    try {
      const { error } = await supabase
        .from('shopping_cart')
        .delete()
        .eq('id', cartItemId);

      if (error) throw error;
      await fetchCart();
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast({
        title: "Erreur",
        description: "Impossible de retirer le produit du panier",
        variant: "destructive",
      });
    }
  };

  const handleCheckout = async () => {
    if (!profile?.id || cart.length === 0) return;

    setSubmitting(true);
    try {
      const totalAmount = cart.reduce((sum, item) => sum + (item.products.price * item.quantity), 0);

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: profile.id,
          total_amount: totalAmount,
          payment_method: checkoutForm.payment_method,
          shipping_address: checkoutForm.shipping_address || null,
          notes: checkoutForm.notes || null
        } as any)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.products.price,
        total_price: item.products.price * item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Clear cart
      const { error: clearCartError } = await supabase
        .from('shopping_cart')
        .delete()
        .eq('user_id', profile.id);

      if (clearCartError) throw clearCartError;

      await fetchCart();
      setCheckoutOpen(false);
      setCartOpen(false);

      toast({
        title: "Commande créée",
        description: `Votre commande ${orderData.order_number} a été créée avec succès`,
      });
    } catch (error) {
      console.error('Error during checkout:', error);
      toast({
        title: "Erreur",
        description: "Impossible de finaliser la commande",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === "all" || product.category_id === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const cartTotal = cart.reduce((sum, item) => sum + (item.products.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Boutique</h1>
        
        {user && (
          <Dialog open={cartOpen} onOpenChange={setCartOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="relative">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Panier
                {cartItemCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {cartItemCount}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Votre Panier</DialogTitle>
              </DialogHeader>
              
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Votre panier est vide</p>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.products.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          ${item.products.price} x {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between font-semibold">
                      <span>Total: ${cartTotal.toFixed(2)}</span>
                    </div>
                    
                    <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full mt-4">
                          Finaliser la commande
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Finaliser la commande</DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div>
                            <Label>Méthode de paiement</Label>
                            <RadioGroup 
                              value={checkoutForm.payment_method}
                              onValueChange={(value) => setCheckoutForm(prev => ({...prev, payment_method: value}))}
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="cash" id="cash" />
                                <Label htmlFor="cash">Espèces</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="moncash" id="moncash" />
                                <Label htmlFor="moncash">MonCash</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="check" id="check" />
                                <Label htmlFor="check">Chèque</Label>
                              </div>
                              <div className="flex items-center space-x-2 opacity-50">
                                <RadioGroupItem value="card" id="card" disabled />
                                <Label htmlFor="card">Carte (Bientôt disponible)</Label>
                              </div>
                            </RadioGroup>
                          </div>
                          
                          <div>
                            <Label htmlFor="address">Adresse de livraison (optionnel)</Label>
                            <Textarea 
                              id="address"
                              value={checkoutForm.shipping_address}
                              onChange={(e) => setCheckoutForm(prev => ({...prev, shipping_address: e.target.value}))}
                              placeholder="Entrez votre adresse de livraison"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="notes">Notes (optionnel)</Label>
                            <Textarea 
                              id="notes"
                              value={checkoutForm.notes}
                              onChange={(e) => setCheckoutForm(prev => ({...prev, notes: e.target.value}))}
                              placeholder="Instructions spéciales ou commentaires"
                            />
                          </div>
                          
                          <div className="flex justify-between items-center font-semibold text-lg">
                            <span>Total: ${cartTotal.toFixed(2)}</span>
                          </div>
                          
                          <Button 
                            onClick={handleCheckout} 
                            className="w-full"
                            disabled={submitting}
                          >
                            {submitting ? "Traitement..." : "Confirmer la commande"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Rechercher des produits..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="sm:max-w-xs">
            <SelectValue placeholder="Toutes les catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <CardHeader className="p-0">
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground">Pas d'image</span>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="p-4">
              <div className="space-y-2">
                <h3 className="font-semibold">{product.name}</h3>
                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">
                    ${product.price.toFixed(2)}
                  </span>
                  {product.product_categories && (
                    <Badge variant="secondary">
                      {product.product_categories.name}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {product.stock_quantity > 0 ? (
                    <span className="text-green-600">
                      En stock ({product.stock_quantity})
                    </span>
                  ) : (
                    <span className="text-red-600">Rupture de stock</span>
                  )}
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="p-4 pt-0">
              <Button 
                className="w-full"
                onClick={() => addToCart(product.id)}
                disabled={product.stock_quantity === 0}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Ajouter au panier
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Aucun produit trouvé.</p>
        </div>
      )}
      </main>
      <Footer />
    </>
  );
}