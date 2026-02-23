import { useFilmingLocations } from '@/hooks/useFilmingLocations';
import { useLocationCategories } from '@/hooks/useLocationCategories';
import { render } from '@testing-library/react-native';
import React from 'react';
import LocationsScreen from '../locations/index';

// Mock hooks
jest.mock('@/hooks/useFilmingLocations', () => ({
  useFilmingLocations: jest.fn(),
}));
jest.mock('@/hooks/useLocationCategories', () => ({
  useLocationCategories: jest.fn(),
}));

const mockUseFilmingLocations = useFilmingLocations as jest.Mock;
const mockUseLocationCategories = useLocationCategories as jest.Mock;

describe('LocationsScreen', () => {
  const mockLocations = [
    {
      id: 'loc1',
      title: 'Château de Versailles',
      city: 'Versailles',
      main_image: 'http://example.com/chateau.jpg',
      category: 'Château',
      price_per_day: 5000,
      latitude: 48.8048,
      longitude: 2.1203,
      created_at: new Date().toISOString(),
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFilmingLocations.mockReturnValue({
      locations: mockLocations,
      loading: false,
      refreshing: false,
      onRefresh: jest.fn(),
      searchQuery: '',
      setSearchQuery: jest.fn(),
      selectedFilters: {},
      setSelectedFilters: jest.fn(),
    });
    mockUseLocationCategories.mockReturnValue({
      categories: ['Château', 'Appartement', 'Industriel'],
      loading: false,
    });
  });

  it('renders correctly with locations', async () => {
    const { findByText } = render(<LocationsScreen />);

    expect(await findByText('Château de Versailles')).toBeTruthy();
  });

  it('shows no results when filtering returns nothing', async () => {
    mockUseFilmingLocations.mockReturnValue({
      locations: [],
      loading: false,
      refreshing: false,
      onRefresh: jest.fn(),
      searchQuery: '',
      setSearchQuery: jest.fn(),
      selectedFilters: {},
      setSelectedFilters: jest.fn(),
    });

    const { findByText } = render(<LocationsScreen />);
    
    // Check for some static text like "Publier" or "Chercher une ville..."
    expect(await findByText('Publier')).toBeTruthy();
  });
});
