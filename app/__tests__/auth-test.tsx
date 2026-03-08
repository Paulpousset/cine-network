import { supabase } from '@/lib/supabase';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import AuthScreen from '../auth';

describe('AuthScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rend le formulaire de connexion par défaut', async () => {
    const { getByText, getByPlaceholderText } = render(<AuthScreen />);
    
    // Wait for the initialization logic (Apple auth check)
    await waitFor(() => {
      expect(getByText('Se connecter')).toBeTruthy();
    });
    
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Mot de passe')).toBeTruthy();
  });

  it('permet de basculer vers le formulaire d\'inscription', async () => {
    const { getByText, getByPlaceholderText } = render(<AuthScreen />);
    
    // Wait for initialization
    await waitFor(() => {
      expect(getByText('Pas encore de compte ?')).toBeTruthy();
    });
    
    const switchButton = getByText('Créer un compte');
    fireEvent.press(switchButton);
    
    // Wait for toggle animation/state change
    await waitFor(() => {
      expect(getByPlaceholderText('Nom complet')).toBeTruthy();
      expect(getByText("S'inscrire")).toBeTruthy();
    });
  });

  it('appelle supabase.auth.signInWithPassword lors de la connexion', async () => {
    const signInMock = supabase.auth.signInWithPassword as jest.Mock;
    signInMock.mockResolvedValueOnce({ data: { user: {} }, error: null });

    const { getByPlaceholderText, getByText } = render(<AuthScreen />);
    
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');
    
    const loginButton = getByText('Se connecter');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('affiche une erreur si la connexion échoue', async () => {
    const signInMock = supabase.auth.signInWithPassword as jest.Mock;
    signInMock.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Identifiants invalides' } });

    const { getByPlaceholderText, getByText, findByText } = render(<AuthScreen />);
    
    fireEvent.changeText(getByPlaceholderText('Email'), 'wrong@example.com');
    fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'wrongpass');
    
    const loginButton = getByText('Se connecter');
    fireEvent.press(loginButton);

    const errorMessage = await findByText('Identifiants invalides');
    expect(errorMessage).toBeTruthy();
  });
});
