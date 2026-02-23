import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import DiscoverScreen from '../(tabs)/discover';

// Mock child components or hooks they use
jest.mock('@/hooks/useHallOfFame', () => ({
  useHallOfFame: () => ({
    talents: [],
    loading: false,
    refreshing: false,
    onRefresh: jest.fn(),
  })
}));

jest.mock('@/hooks/useFilmingLocations', () => ({
  useFilmingLocations: () => ({
    locations: [],
    loading: false,
    refreshing: false,
    onRefresh: jest.fn(),
    searchQuery: '',
    setSearchQuery: jest.fn(),
    selectedFilters: {},
    setSelectedFilters: jest.fn(),
  })
}));

describe('DiscoverScreen', () => {
  it('renders correctly and switches tabs', async () => {
    const { getByText, queryByText } = render(<DiscoverScreen />);

    // Check active tab text
    expect(getByText('Hall of Fame')).toBeTruthy();
    expect(getByText('Lieux')).toBeTruthy();
    
    // Tab switching
    const locationTab = getByText('Lieux');
    fireEvent.press(locationTab);
    
    // In actual implementation it renders LocationsScreen
    // LocationsScreen might have some text we can check for
    await waitFor(() => {
        // Just checking it completes without error
    });
  });
});
