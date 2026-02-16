import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';

export function useLocationCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('location_categories')
        .select('name')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      setCategories(data.map(c => c.name));
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addCategory = async (name: string) => {
    try {
      const { error: insertError } = await supabase
        .from('location_categories')
        .upsert({ name }, { onConflict: 'name' });

      if (insertError) throw insertError;
      
      await fetchCategories();
    } catch (err) {
      console.error('Error adding category:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    isLoading,
    error,
    refresh: fetchCategories,
    addCategory,
  };
}
