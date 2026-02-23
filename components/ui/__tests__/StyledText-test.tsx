/// <reference types="jest" />
import { render } from '@testing-library/react-native';
import React from 'react';
import { MonoText } from '../StyledText';

// On mocke useTheme car MonoText utilise Themed.Text qui en dépend
jest.mock('@/providers/ThemeProvider', () => ({
  useTheme: jest.fn(() => ({
    colors: { text: '#000000', background: '#FFFFFF' },
    isDark: false,
  })),
}));

describe('MonoText', () => {
  it('rend correctement avec la police SpaceMono', () => {
    const { getByText } = render(<MonoText>Snapshot test!</MonoText>);
    const textElement = getByText('Snapshot test!');
    
    // On vérifie que la police SpaceMono est bien présente quelque part dans le style (qui est un array maintenant)
    const flatStyle = Object.assign({}, ...textElement.props.style.flat());
    expect(flatStyle).toMatchObject({ fontFamily: 'SpaceMono' });
  });

  it('correspond au snapshot', () => {
    const { toJSON } = render(<MonoText>Snapshot text</MonoText>);
    expect(toJSON()).toMatchSnapshot();
  });
});
