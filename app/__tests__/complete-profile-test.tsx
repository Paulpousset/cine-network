import { supabase } from '@/lib/supabase';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import CompleteProfileScreen from '../complete-profile';

describe('CompleteProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form elements', async () => {
    const { findByPlaceholderText, getByText } = render(<CompleteProfileScreen />);
    
    expect(await findByPlaceholderText('Ex: cineaste_du_92')).toBeTruthy();
    expect(getByText(/Avant de commencer/)).toBeTruthy();
  });

  it('handles profile update successfully', async () => {
    // Mock user
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });

    // Mock profiles check (no existing user)
    const mockFrom = supabase.from as jest.Mock;
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockResolvedValue({ error: null }),
    }));

    const { getByPlaceholderText, getByText, getAllByText } = render(<CompleteProfileScreen />);

    // Fill the form
    const usernameInput = getByPlaceholderText('Ex: cineaste_du_92');
    fireEvent.changeText(usernameInput, 'new_user');
    
    const roleButtons = getAllByText('Acteur');
    fireEvent.press(roleButtons[0]);
    
    const saveButton = getByText("C'est parti !");
    
    await act(async () => {
        fireEvent.press(saveButton);
    });

    // Check if profiles update was called
    expect(supabase.from).toHaveBeenCalledWith('profiles');
  });
});
