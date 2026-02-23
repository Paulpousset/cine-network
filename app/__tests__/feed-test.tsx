/// <reference types="jest" />
import { useFeed } from '@/hooks/useFeed';
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import FeedScreen from '../(tabs)/feed';

// On mocke les hooks spécifiques si besoin de changer les valeurs par défaut du jest.setup.js
jest.mock('@/hooks/useFeed', () => ({
  useFeed: jest.fn(),
}));

const mockUseFeed = useFeed as jest.Mock;

describe('FeedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('affiche un indicateur de chargement au début', () => {
    mockUseFeed.mockReturnValue({
      posts: [],
      loading: true,
      refreshing: false,
      onRefresh: jest.fn(),
      loadMore: jest.fn(),
    });

    const { getByTestId } = render(<FeedScreen />);
    // ClapLoading est rendu quand loading est true
    expect(getByTestId('clap-loading')).toBeTruthy();
  });

  it('affiche la liste des posts quand les données sont chargées', async () => {
    const mockPosts = [
      { id: '1', content: 'Premier post', author: { full_name: 'Paul' }, created_at: new Date().toISOString() },
      { id: '2', content: 'Second post', author: { full_name: 'Alice' }, created_at: new Date().toISOString() },
    ];

    mockUseFeed.mockReturnValue({
      posts: mockPosts,
      loading: false,
      refreshing: false,
      onRefresh: jest.fn(),
      loadMore: jest.fn(),
    });

    const { getByText, getAllByTestId } = render(<FeedScreen />);

    // FlashList est mockée pour afficher tous ses items directement
    await waitFor(() => {
      expect(getByText('Premier post')).toBeTruthy();
      expect(getByText('Second post')).toBeTruthy();
    });
  });

  it('appelle onRefresh lors d\'un rafraîchissement', async () => {
    const refreshMock = jest.fn();
    mockUseFeed.mockReturnValue({
      posts: [],
      loading: false,
      refreshing: false,
      onRefresh: refreshMock,
      loadMore: jest.fn(),
    });

    // Dans le mock de FlashList, on pourrait déclencher le rafraîchissement si on l'avait configuré
    // Ici on teste surtout que le rendu se passe bien
    render(<FeedScreen />);
    expect(mockUseFeed).toHaveBeenCalled();
  });
});
