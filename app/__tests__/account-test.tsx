import { supabase } from '@/lib/supabase';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import AccountScreen from '../account';

// Mock focus/blur for CityAutocomplete if needed
jest.mock('@/components/common/CityAutocomplete', () => 'CityAutocomplete');

describe('AccountScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default session mock
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ 
      data: { session: { user: { id: 'test-user-id' } } }, 
      error: null 
    });
  });

  const mockProfile = {
    id: 'test-user-id',
    full_name: 'John Doe',
    username: 'johndoe',
    ville: 'Paris',
    role: 'acteur',
    avatar_url: 'http://avatar.com/123',
    subscription_tier: 'studio',
  };

  const getMockFrom = (table: string) => {
    const mock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
      then: jest.fn(),
    };

    if (table === 'profiles' || table === 'public_profile_settings') {
      mock.maybeSingle.mockResolvedValue({ data: mockProfile, error: null });
      mock.single.mockResolvedValue({ data: mockProfile, error: null });
    } else if (table === 'tournages') {
      mock.then.mockImplementation((callback) => callback({ data: [], error: null }));
    } else {
      mock.maybeSingle.mockResolvedValue({ data: null, error: null });
    }

    return mock;
  };

  it('renders and displays loaded profile data', async () => {
    (supabase.from as jest.Mock).mockImplementation(getMockFrom);

    const { findByDisplayValue } = render(<AccountScreen />);
    
    // Wait for the specific data to be loaded into inputs
    // This implicitly waits for fetchProfile to complete
    const fullNameInput = await findByDisplayValue('John Doe');
    expect(fullNameInput).toBeTruthy();
  });

  it('allows editing the full name', async () => {
    (supabase.from as jest.Mock).mockImplementation(getMockFrom);

    const { findByDisplayValue } = render(<AccountScreen />);
    
    const input = await findByDisplayValue('John Doe');
    fireEvent.changeText(input, 'Jane Doe');
    
    expect(await findByDisplayValue('Jane Doe')).toBeTruthy();
  });
});
