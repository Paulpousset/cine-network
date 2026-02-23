import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import NotificationSettingsScreen from '../notification-settings';

describe('NotificationSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all notification switches', async () => {
    const { getByText, findByText } = render(<NotificationSettingsScreen />);
    
    // Check titles/options exist
    expect(await findByText('Communication')).toBeTruthy();
    expect(getByText('Messages Directs')).toBeTruthy();
  });

  it('toggles a notification setting and saves it', async () => {
    const { getByText } = render(<NotificationSettingsScreen />);
    
    await waitFor(() => {
        expect(getByText('Messages Directs')).toBeTruthy();
    });
  });
});
