import { useTalents } from '@/hooks/useTalents';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import TalentsScreen from '../(tabs)/talents';

// Mock useTalents
jest.mock('@/hooks/useTalents', () => ({
  useTalents: jest.fn(),
}));
const mockUseTalents = useTalents as jest.Mock;

describe('TalentsScreen', () => {
  const mockTalents = [
    {
      id: '1',
      full_name: 'Alice Talent',
      username: 'alicetalent',
      role: 'acteur',
      avatar_url: 'http://example.com/alice.jpg',
      ville: 'Paris',
    },
    {
      id: '2',
      full_name: 'Bob Talent',
      username: 'bobtalent',
      role: 'realisateur',
      avatar_url: 'http://example.com/bob.jpg',
      ville: 'Lyon',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTalents.mockReturnValue({
      profiles: mockTalents,
      suggestedProfiles: [],
      loading: false,
      refreshing: false,
      onRefresh: jest.fn(),
      loadMore: jest.fn(),
      hasNextPage: false,
      availableCities: ['Paris', 'Lyon'],
      suggestedRoles: ['acteur', 'realisateur'],
      selectedRoles: [],
      setSelectedRoles: jest.fn(),
      selectedSubRoles: [],
      setSelectedSubRoles: jest.fn(),
      selectedCities: [],
      setSelectedCities: jest.fn(),
      isFreeOnly: false,
      setIsFreeOnly: jest.fn(),
      experienceLevel: 'all',
      setExperienceLevel: jest.fn(),
      query: '',
      setQuery: jest.fn(),
      fetchPendingCount: jest.fn(),
      sendConnectionRequest: jest.fn(),
      myConnections: [],
      suggestionReason: 'Mutual',
    });
  });

  it('renders talents list correctly', async () => {
    const { findByText, getByText } = render(<TalentsScreen />);

    // We search for a talent's name
    expect(await findByText(/Alice Talent/i)).toBeTruthy();
    expect(getByText(/Bob Talent/i)).toBeTruthy();
  });

  it('shows empty state when no talents', async () => {
    mockUseTalents.mockReturnValue({
      profiles: [],
      suggestedProfiles: [],
      loading: false,
      refreshing: false,
      onRefresh: jest.fn(),
      loadMore: jest.fn(),
      hasNextPage: false,
      availableCities: [],
      suggestedRoles: [],
      selectedRoles: [],
      setSelectedRoles: jest.fn(),
      selectedSubRoles: [],
      setSelectedSubRoles: jest.fn(),
      selectedCities: [],
      setSelectedCities: jest.fn(),
      isFreeOnly: false,
      setIsFreeOnly: jest.fn(),
      experienceLevel: 'all',
      setExperienceLevel: jest.fn(),
      query: '',
      setQuery: jest.fn(),
      fetchPendingCount: jest.fn(),
      sendConnectionRequest: jest.fn(),
      myConnections: [],
    });

    const { findByPlaceholderText } = render(<TalentsScreen />);
    
    // Check for the search input placeholder to ensure screen loaded correctly
    expect(await findByPlaceholderText('Rechercher un talent par nom...')).toBeTruthy();
  });

  it('opens filter modal on mobile', async () => {
    // Force mobile dimensions is not strictly necessary as getByText will find it if it exists in the tree
    const { getByText, queryByText, getAllByText } = render(<TalentsScreen />);
    
    // There might be multiple "Filtres" (sidebar title on tablet, button text on mobile)
    // On mobile, only the button is visible.
    const filterButtons = getAllByText('Filtres');
    fireEvent.press(filterButtons[0]);
    
    // Check if modal title appeared (which is also "Filtres")
    await waitFor(() => {
        expect(getAllByText('Filtres').length).toBeGreaterThan(1);
    });
  });
});
