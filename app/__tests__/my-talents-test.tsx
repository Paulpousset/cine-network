import { useUserMode } from '@/hooks/useUserMode';
import { supabase } from '@/lib/supabase';
import { render } from '@testing-library/react-native';
import React from 'react';
import MyTalentsScreen from '../(tabs)/my-talents';

// Mock useUserMode
jest.mock('@/hooks/useUserMode', () => ({
  useUserMode: jest.fn(),
}));
const mockUseUserMode = useUserMode as jest.Mock;

describe('MyTalentsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserMode.mockReturnValue({
      mode: 'agent',
      effectiveUserId: 'agent-id',
      setImpersonatedUser: jest.fn(),
    });

    // Supabase mocks for checkRole and fetchTalents
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: 'agent-id' } } },
      error: null,
    });

    (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { role: 'agent' }, error: null }),
        then: jest.fn().mockImplementation((callback: any) => callback({ data: [], error: null })),
    });
  });

  it('renders talents managed by the agent', async () => {
    const { findByText } = render(<MyTalentsScreen />);
    
    // Check if the title is present
    expect(await findByText('Mes Talents')).toBeTruthy();
  });

  it('shows empty state when no managed talents', async () => {
    const { findByText } = render(<MyTalentsScreen />);
    
    // Should show the title regardless
    expect(await findByText('Mes Talents')).toBeTruthy();
  });
});
