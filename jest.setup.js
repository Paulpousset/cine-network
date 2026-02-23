
// Mock expo-image
jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Image: ({ source, style, tintColor, ...props }) => {
      return React.createElement(View, { 
        ...props, 
        style: [style, tintColor ? { tintColor } : {}],
        testID: 'expo-image-mocked'
      });
    },
  };
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-router
// Helper to have the same router mock everywhere
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  setParams: jest.fn(),
};

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');
  const internalMockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    setParams: jest.fn(),
  };
  return {
    router: internalMockRouter,
    useRouter: () => internalMockRouter,
    useSearchParams: () => ({}),
    useLocalSearchParams: () => ({}),
    usePathname: () => '/',
    useNavigation: () => ({
      setOptions: jest.fn(),
      goBack: jest.fn(),
    }),
    Stack: {
      Screen: ({ options, children }) => React.createElement(View, { testID: 'stack-screen' }, children),
    },
    Link: ({ children, ...props }) => React.createElement(View, props, children),
    Tabs: {
      Screen: () => null,
    },
    useFocusEffect: (cb) => cb(),
  };
});

// Mock expo-apple-authentication
jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  AppleAuthenticationButton: 'AppleAuthenticationButton',
  AppleAuthenticationButtonStyle: { BLACK: 0, WHITE: 1, OUTLINE: 2 },
  AppleAuthenticationButtonType: { SIGN_IN: 0, SIGN_UP: 1, CONTINUE: 2 },
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: (props) => React.createElement(Text, { testID: 'ionicons-mock' }, props.name),
    MaterialIcons: (props) => React.createElement(Text, { testID: 'materialicons-mock' }, props.name),
    MaterialCommunityIcons: (props) => React.createElement(Text, { testID: 'materialcommunityicons-mock' }, props.name),
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Mock @shopify/flash-list
jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    FlashList: ({ data, renderItem, ListHeaderComponent, ListFooterComponent, ...props }) => {
      return React.createElement(View, { testID: 'flash-list' }, 
        ListHeaderComponent && React.createElement(View, null, typeof ListHeaderComponent === 'function' ? ListHeaderComponent() : ListHeaderComponent),
        data?.map((item, index) => React.createElement(View, { key: index }, renderItem({ item, index }))),
        ListFooterComponent && React.createElement(View, null, typeof ListFooterComponent === 'function' ? ListFooterComponent() : ListFooterComponent)
      );
    }
  };
});

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }) => React.createElement(View, props, children),
  };
});

// Mock Supabase
const mockSupabaseQuery = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  filter: jest.fn().mockReturnThis(),
  match: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn(() => Promise.resolve({ data: {}, error: null })),
  range: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn(() => Promise.resolve({ data: {}, error: null })),
  url: {
    searchParams: new URLSearchParams(),
  },
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ 
        data: { session: { user: { id: 'test-user-id', email: 'test@example.com' } } }, 
        error: null 
      })),
      getUser: jest.fn(() => Promise.resolve({ 
        data: { user: { id: 'test-user-id', email: 'test@example.com' } }, 
        error: null 
      })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      signInAnonymously: jest.fn(),
      setSession: jest.fn(),
    },
    from: jest.fn(() => mockSupabaseQuery),
    rpc: jest.fn().mockReturnThis(),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'http://test.com' } })),
      })),
    },
  },
}));

// Mock UserProvider custom hooks
jest.mock('@/providers/UserProvider', () => {
  return {
    useUser: () => ({
      user: { id: 'test-user-id' },
      session: { user: { id: 'test-user-id' } },
      profile: { username: 'testuser', full_name: 'Test User', updated_at: new Date().toISOString() },
      isGuest: false,
      isLoading: false,
      refreshProfile: jest.fn(),
    }),
    UserProvider: ({ children }) => children,
  };
});

// Mock ThemeProvider custom hooks
jest.mock('@/providers/ThemeProvider', () => {
    const originalModule = jest.requireActual('@/providers/ThemeProvider');
    return {
      __esModule: true,
      ...originalModule,
      // For general app tests, we use the mocked useTheme
      useTheme: () => ({
        colors: { 
            background: '#FFFFFF', 
            backgroundSecondary: '#F5F5F5',
            text: '#000000', 
            tint: '#6C5CE7', 
            card: '#FFFFFF', 
            border: '#DDDDDD',
            primary: '#6C5CE7',
            danger: '#FF5252',
            shadow: '#000000'
        },
        isDark: false,
        themeMode: 'system',
        setThemeMode: jest.fn(),
        accentColor: '#6C5CE7',
        setAccentColor: jest.fn(),
      }),
    };
  });

// Mock UserModeProvider custom hooks
jest.mock('@/hooks/useUserMode', () => ({
  useUserMode: () => ({
    mode: 'acteur',
    effectiveUserId: 'test-user-id',
    isImpersonating: false,
    setMode: jest.fn(),
  }),
}));

// Mock TutorialProvider custom hooks
jest.mock('@/providers/TutorialProvider', () => ({
    useTutorial: () => ({
        startTutorial: jest.fn(),
        isLoading: false,
    }),
    TutorialProvider: ({ children }) => children,
}));

// Mock expo-video
jest.mock('expo-video', () => ({
  useVideoPlayer: jest.fn(() => ({
    loop: false,
    play: jest.fn(),
    pause: jest.fn(),
  })),
  VideoView: 'VideoView',
}));

// Default mocks for major hooks
jest.mock('@/hooks/useFeed', () => ({
  useFeed: () => ({
    posts: [],
    loading: false,
    refreshing: false,
    onRefresh: jest.fn(),
    loadMore: jest.fn(),
    hasNextPage: false,
  })
}));

jest.mock('@/hooks/useTalents', () => ({
  useTalents: () => ({
    talents: [],
    loading: false,
    refreshing: false,
    onRefresh: jest.fn(),
  })
}));
