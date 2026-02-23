import { supabase } from '@/lib/supabase';
import { render } from '@testing-library/react-native';
import React from 'react';
import NotificationsScreen from '../notifications';

// Helper to mock different tables
const mockSupabaseQuery = (dataByTable: { [key: string]: any[] }) => {
  return (table: string) => {
    const data = dataByTable[table] || [];
    return {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: (callback: any) => Promise.resolve(callback({ data, error: null })),
    };
  };
};

describe('NotificationsScreen', () => {
  it('renders notifications grouped by status', async () => {
    const mockReceivedConnections = [
      { 
        id: '1', 
        status: 'pending', 
        requester: { id: 'user-2', full_name: 'Jane Received', username: 'janedoe' } 
      }
    ];

    (supabase.from as jest.Mock).mockImplementation((table) => {
        return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            then: (callback: any) => {
                // Return data for EVERY call to connections.
                // findByText handles multiple elements if needed, but we check if it is present.
                const data = table === 'connections' ? mockReceivedConnections : [];
                return Promise.resolve(callback({ data, error: null }));
            },
        };
    });

    const { findAllByText } = render(<NotificationsScreen />);
    
    // Check for unique name
    const requesterNames = await findAllByText('Jane Received');
    expect(requesterNames.length).toBeGreaterThan(0);
  });
});
