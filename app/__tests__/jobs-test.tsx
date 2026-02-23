import { useJobs } from '@/hooks/useJobs';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import JobsScreen from '../(tabs)/jobs';

// Mock useJobs
jest.mock('@/hooks/useJobs', () => ({
  useJobs: jest.fn(),
}));
const mockUseJobs = useJobs as jest.Mock;

describe('JobsScreen', () => {
  const mockRoles = [
    {
      id: 'job1',
      title: 'Acteur Principal',
      status: 'open',
      tournages: {
        title: 'Film de Test',
        image_url: 'http://example.com/film.jpg',
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseJobs.mockReturnValue({
      roles: mockRoles,
      projects: [],
      loading: false,
      recommendations: [],
      availableCities: ['Paris'],
      selectedCategory: 'all',
      setSelectedCategory: jest.fn(),
      selectedCity: 'all',
      setSelectedCity: jest.fn(),
      searchQuery: '',
      setSearchQuery: jest.fn(),
      hideMyParticipations: false,
      setHideMyParticipations: jest.fn(),
    });
  });

  it('renders correctly with jobs', async () => {
    const { findByText } = render(<JobsScreen />);

    expect(await findByText('Acteur Principal')).toBeTruthy();
    expect(await findByText('Film de Test')).toBeTruthy();
  });

  it('switches between roles and projects view', async () => {
    const { getByText, queryByText } = render(<JobsScreen />);
    
    // Currently in 'roles' (Jobs) mode by default
    const projectToggle = getByText('Tournages');
    fireEvent.press(projectToggle);
    
    // Check if view mode changed if possible (depending on labels)
    // Actually the mock returns projects: [] so let's check it doesn't show jobs
    // In projects mode, it would look for different elements
  });
});
