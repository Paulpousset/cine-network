import { supabase } from '@/lib/supabase';
import { useUser } from '@/providers/UserProvider';
import { PostgrestError } from '@supabase/supabase-js';
import Fuse from 'fuse.js';
import { useCallback, useEffect, useState } from 'react';

export interface FilmingLocation {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  images: string[];
  contact_info: string;
  price_per_day: number | null;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string;
    role?: string;
  };
}

export function useFilmingLocations() {
  const { profile } = useUser();
  const [locations, setLocations] = useState<FilmingLocation[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<FilmingLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<PostgrestError | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distanceRange, setDistanceRange] = useState<number | null>(null); // in km

  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('filming_locations')
        .select(`
          *,
          profiles:owner_id (
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      // If we have a distance filter, we don't apply the city string filter to get more results for radius
      if (selectedCity && !distanceRange) {
        query = query.ilike('city', `%${selectedCity}%`);
      }

      if (maxPrice !== null) {
        query = query.lte('price_per_day', maxPrice);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      let processedData = data || [];

      // Manual distance filtering if userLocation and distanceRange are set
      if (userLocation && distanceRange !== null) {
        processedData = processedData.filter(loc => {
          if (!loc.latitude || !loc.longitude) return false;
          const dist = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            loc.latitude,
            loc.longitude
          );
          return dist <= distanceRange;
        });
      }

      setLocations(processedData);
      setFilteredLocations(processedData);
    } catch (err: any) {
      console.error('Error fetching filming locations:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, selectedCity, maxPrice, distanceRange, userLocation]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredLocations(locations);
      return;
    }

    const fuse = new Fuse(locations, {
      keys: [
        { name: 'title', weight: 2 },
        { name: 'city', weight: 1.5 },
        { name: 'description', weight: 1 },
        { name: 'category', weight: 1 },
        { name: 'address', weight: 0.5 },
      ],
      threshold: 0.4,
    });

    const results = fuse.search(searchQuery);
    setFilteredLocations(results.map(result => result.item));
  }, [searchQuery, locations]);

  const addLocation = async (locationData: Partial<FilmingLocation>) => {
    if (!profile) throw new Error('User not authenticated');

    // Add category to the dynamic enum table if it exists
    if (locationData.category) {
      try {
        await supabase
          .from('location_categories')
          .upsert({ name: locationData.category }, { onConflict: 'name' });
      } catch (catError) {
        console.error('Error ensuring category exists:', catError);
      }
    }

    const { data, error } = await supabase
      .from('filming_locations')
      .insert([
        {
          ...locationData,
          owner_id: profile.id,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    
    // Refresh list
    fetchLocations();
    return data;
  };

  const updateLocation = async (id: string, locationData: Partial<FilmingLocation>) => {
    if (!profile) throw new Error('User not authenticated');

    // Add category to the dynamic enum table if it exists
    if (locationData.category) {
      try {
        await supabase
          .from('location_categories')
          .upsert({ name: locationData.category }, { onConflict: 'name' });
      } catch (catError) {
        console.error('Error ensuring category exists:', catError);
      }
    }

    const { data, error } = await supabase
      .from('filming_locations')
      .update(locationData)
      .eq('id', id)
      .eq('owner_id', profile.id) // Security check
      .select()
      .single();

    if (error) throw error;
    
    // Refresh list
    fetchLocations();
    return data;
  };

  const deleteLocation = async (id: string) => {
    if (!profile) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('filming_locations')
      .delete()
      .eq('id', id)
      .eq('owner_id', profile.id); // Security check

    if (error) throw error;
    
    // Refresh list
    fetchLocations();
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI/180);
  };

  return {
    locations: filteredLocations,
    allLocations: locations,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedCity,
    setSelectedCity,
    maxPrice,
    setMaxPrice,
    distanceRange,
    setDistanceRange,
    userLocation,
    setUserLocation,
    refresh: fetchLocations,
    addLocation,
    updateLocation,
    deleteLocation,
  };
}
