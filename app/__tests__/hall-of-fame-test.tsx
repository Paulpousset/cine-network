import { useHallOfFame } from '@/hooks/useHallOfFame';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import HallOfFameScreen from '../hall-of-fame';

jest.mock('@/hooks/useHallOfFame', () => ({
  useHallOfFame: jest.fn(),
}));

describe('HallOfFameScreen', () => {
  const mockUseHallOfFame = useHallOfFame as jest.Mock;

  it('renders loading state initially', async () => {
    mockUseHallOfFame.mockReturnValue({
      projects: [],
      loading: true,
      refreshing: false,
      loadMore: jest.fn(),
      onRefresh: jest.fn(),
      addProject: jest.fn(),
    });

    const { getByTestId } = render(<HallOfFameScreen />);
    expect(getByTestId('clap-loading')).toBeTruthy();
  });

  it('renders a list of projects when loaded', async () => {
    const mockProjects = [
      { 
        id: '1', 
        title: 'Super Film', 
        description: 'Description du film', 
        images: [], 
        videos: [],
        owner_id: 'owner-1'
      }
    ];

    mockUseHallOfFame.mockReturnValue({
      projects: mockProjects,
      loading: false,
      refreshing: false,
      loadMore: jest.fn(),
      onRefresh: jest.fn(),
      addProject: jest.fn(),
    });

    const { findByText } = render(<HallOfFameScreen />);
    
    expect(await findByText('Super Film')).toBeTruthy();
  });

  it('opens project modal on press', async () => {
    const mockProjects = [
      { id: '1', title: 'Test Film', owner_id: 'owner-1' }
    ];

    mockUseHallOfFame.mockReturnValue({
      projects: mockProjects,
      loading: false,
      refreshing: false,
      loadMore: jest.fn(),
      onRefresh: jest.fn(),
    });

    const { getByText, findByText } = render(<HallOfFameScreen />);
    const projectItem = getByText('Test Film');
    
    await act(async () => {
        fireEvent.press(projectItem);
    });

    // Check modal content if it opens
    // expect(await findByText('Détails du projet')).toBeTruthy();
  });
});
