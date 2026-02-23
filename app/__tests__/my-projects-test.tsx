import { useMyProjectsData } from '@/hooks/useMyProjects';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import MyProjects from '../(tabs)/my-projects';

// Mock useMyProjectsData
jest.mock('@/hooks/useMyProjects', () => ({
  useMyProjectsData: jest.fn(),
}));
const mockUseMyProjectsData = useMyProjectsData as jest.Mock;

describe('MyProjectsScreen', () => {
  const mockOwnedProjects = [
    {
      id: 'p1',
      title: 'Mon Film 1',
      description: 'Super film de test',
      type: 'Long métrage',
      created_at: new Date().toISOString(),
      owner_id: 'test-user-id',
      image_url: 'http://example.com/p1.jpg',
    }
  ];

  const mockParticipatingProjects = [
    {
      id: 'p2',
      title: 'Film d\'un Ami',
      description: 'Je suis acteur dedans',
      type: 'Court métrage',
      created_at: new Date().toISOString(),
      owner_id: 'other-user-id',
      image_url: 'http://example.com/p2.jpg',
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMyProjectsData.mockReturnValue({
      ownedProjects: mockOwnedProjects,
      participatingProjects: mockParticipatingProjects,
      recentMessages: [],
      upcomingEvents: [],
      notifications: { all: [] },
      isLoading: false,
      isRefetching: false,
      refetch: jest.fn(),
    });
  });

  it('renders correctly with projects', async () => {
    const { findByText } = render(<MyProjects />);

    expect(await findByText('Mon Film 1')).toBeTruthy();
    expect(await findByText('Film d\'un Ami')).toBeTruthy();
  });

  it('shows empty sections when no projects', async () => {
    mockUseMyProjectsData.mockReturnValue({
      ownedProjects: [],
      participatingProjects: [],
      recentMessages: [],
      upcomingEvents: [],
      notifications: { all: [] },
      isLoading: false,
      isRefetching: false,
      refetch: jest.fn(),
    });

    const { getByText } = render(<MyProjects />);
    
    // Check titles are present
    expect(getByText('Mes Créations')).toBeTruthy();
    expect(getByText('Mes Participations')).toBeTruthy();
  });

  it('navigates to create project screen', async () => {
    const { getByText } = render(<MyProjects />);
    
    // On mobile, the button is a FAB with the 'add' icon
    const createButton = getByText('add');
    fireEvent.press(createButton);
    
    // Check if router.push was called
    const { router } = require('expo-router');
    expect(router.push).toHaveBeenCalledWith('/project/new');
  });
});
