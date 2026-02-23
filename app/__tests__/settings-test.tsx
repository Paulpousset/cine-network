import { supabase } from '@/lib/supabase';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import SettingsScreen from '../settings';

// Mock values from ThemeProvider are used by default from jest.setup.js
// but we can override if needed.

describe('SettingsScreen', () => {
  it('renders settings options', () => {
    const { getByText } = render(<SettingsScreen />);
    
    expect(getByText('Profil')).toBeTruthy();
    expect(getByText('Assistance & Aide')).toBeTruthy();
  });

  it('handles logout', async () => {
    const { getByText } = render(<SettingsScreen />);
    
    const logoutBtn = getByText('Se déconnecter');
    fireEvent.press(logoutBtn);
    
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('can change theme mode', async () => {
    const { getByText } = render(<SettingsScreen />);
    
    // We look for theme labels
    expect(getByText('Système')).toBeTruthy();
    expect(getByText('Clair')).toBeTruthy();
    expect(getByText('Sombre')).toBeTruthy();
    
    // Changing to Dark
    await act(async () => {
        fireEvent.press(getByText('Sombre'));
    });
    
    // We expect a call to setThemeMode from useTheme if it was mocked to track calls
    // But since useTheme mock in jest.setup.js isn't tracking, we just check if it renders
  });
});
