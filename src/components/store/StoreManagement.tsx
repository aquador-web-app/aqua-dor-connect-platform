import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Package, DollarSign, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  stock_quantity: number;
  category_id?: string;
  image_url?: string;
  is_active: boolean;
  sku?: string;
  weight?: number;
  tags?: string[];
  featured: boolean;
  created_at: string;
  product_categories?: {
    name: string;
  };
}

interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  image_url?: string;
}

export const StoreManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: 0,
    currency: 'HTG',
    stock_quantity: 0,
    category_id: '',
    image_url: '',
    sku: '',
    weight: 0,
    tags: '',
    featured: false
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_categories (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Map data to ensure all required fields exist
      const mappedProducts = (data || []).map((product: any) => ({
        ...product,
        featured: product.featured || false,
        sku: product.sku || '',
        weight: product.weight || 0,
        tags: product.tags || []
      }));
      setProducts(mappedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
        variant: "destructive"
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
        .order('sort_order', { ascending: true });

      if (error) throw error;
      // Map data to ensure all required fields exist
      const mappedCategories = (data || []).map((category: any) => ({
        ...category,
        sort_order: category.sort_order || 0,
        image_url: category.image_url || ''
      }));
      setCategories(mappedCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSaveProduct = async () => {
    try {
      const productData = {
        ...productForm,
        tags: productForm.tags ? productForm.tags.split(',').map(tag => tag.trim()) : [],
        category_id: productForm.category_id || null
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;

        toast({
          title: "Produit modifié",
          description: "Le produit a été modifié avec succès"
        });
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) throw error;

        toast({
          title: "Produit créé",
          description: "Le produit a été créé avec succès"
        });
      }

      setShowProductForm(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la sauvegarde du produit",
        variant: "destructive"
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Produit supprimé",
        description: "Le produit a été désactivé avec succès"
      });

      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression du produit",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setProductForm({
      name: '',
      description: '',
      price: 0,
      currency: 'HTG',
      stock_quantity: 0,
      category_id: '',
      image_url: '',
      sku: '',
      weight: 0,
      tags: '',
      featured: false
    });
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price,
      currency: product.currency,
      stock_quantity: product.stock_quantity,
      category_id: product.category_id || '',
      image_url: product.image_url || '',
      sku: product.sku || '',
      weight: product.weight || 0,
      tags: product.tags?.join(', ') || '',
      featured: product.featured
    });
    setShowProductForm(true);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    
    return matchesSearch && matchesCategory && product.is_active;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion du Magasin</h2>
          <p className="text-muted-foreground">Gérez vos produits et catégories</p>
        </div>
        
        <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingProduct(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Produit
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du produit</Label>
                <Input
                  id="name"
                  value={productForm.name}
                  onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nom du produit"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={productForm.sku}
                  onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                  placeholder="Code produit"
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={productForm.description}
                  onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description du produit"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="price">Prix</Label>
                <Input
                  id="price"
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  placeholder="Prix"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  value={productForm.stock_quantity}
                  onChange={(e) => setProductForm(prev => ({ ...prev, stock_quantity: parseInt(e.target.value) || 0 }))}
                  placeholder="Quantité en stock"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select value={productForm.category_id} onValueChange={(value) => setProductForm(prev => ({ ...prev, category_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="weight">Poids (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={productForm.weight}
                  onChange={(e) => setProductForm(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                  placeholder="Poids"
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label htmlFor="image_url">URL de l'image</Label>
                <Input
                  id="image_url"
                  value={productForm.image_url}
                  onChange={(e) => setProductForm(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
                <Input
                  id="tags"
                  value={productForm.tags}
                  onChange={(e) => setProductForm(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="tag1, tag2, tag3"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowProductForm(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveProduct}>
                {editingProduct ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher des produits..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map(product => (
          <Card key={product.id} className="overflow-hidden">
            {product.image_url && (
              <div className="aspect-square bg-muted">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg line-clamp-2">{product.name}</CardTitle>
                {product.featured && (
                  <Badge variant="secondary" className="ml-2">
                    Vedette
                  </Badge>
                )}
              </div>
              {product.product_categories && (
                <Badge variant="outline" className="w-fit">
                  {product.product_categories.name}
                </Badge>
              )}
            </CardHeader>
            
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                {product.description}
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">
                    {product.price} {product.currency}
                  </span>
                  <div className="flex items-center gap-1">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {product.stock_quantity}
                    </span>
                  </div>
                </div>
                
                {product.sku && (
                  <p className="text-xs text-muted-foreground">
                    SKU: {product.sku}
                  </p>
                )}
                
                {product.tags && product.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {product.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditForm(product)}
                    className="flex-1"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Modifier
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteProduct(product.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Aucun produit trouvé</h3>
          <p className="text-muted-foreground">
            {searchTerm ? 'Aucun produit ne correspond à votre recherche.' : 'Commencez par créer votre premier produit.'}
          </p>
        </div>
      )}
    </div>
  );
};