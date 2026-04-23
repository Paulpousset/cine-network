# Tita 🎬

[![Expo](https://img.shields.io/badge/Expo-54.0.29-blue.svg)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-0.81.5-61dafb.svg)](https://reactnative.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green.svg)](https://supabase.com/)
[![License: Private](https://img.shields.io/badge/License-Private-red.svg)](#license)

Tita is a professional mobile application built with React Native and Expo, designed to revolutionize collaboration within the film and audiovisual industry. It provides a unified platform for project management, talent scouting, and seamless communication between filmmakers, actors, and technicians.

## 🚀 Key Features

- **Project Lifecycle Management**: Streamlined tools to manage film projects from inception through post-production.
- **Talent Marketplace**: A comprehensive professional network to discover and connect with crew and cast members.
- **Dynamic Casting & Roles**: Advanced role definition and recruitment tools for precise talent matching.
- **Unified Team Dashboard**: Integrated project calendars, team management, and secure categorized messaging.
- **Cross-Platform Delivery**: Native performance on iOS and Android with a robust Web version, all from a single codebase.

## 🛠 Tech Stack

- **Frontend**: [Expo](https://expo.dev/) / [React Native](https://reactnative.dev/)
- **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based navigation)
- **Backend**: [Supabase](https://supabase.com/) (Auth, Real-time DB, Storage, Edge Functions)
- **State/Hooks**: Custom hooks for session and environment management.
- **Utilities**: React Native Maps, Expo Image/Document Pickers.

## 📦 Getting Started (Developer Onboarding)

### 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18 or higher (using `nvm` is recommended).
- **Package Manager**: `npm` (v10+).
- **Expo Go**: Install on your iOS/Android device for testing.
- **Simulators**: Xcode (for iOS) or Android Studio (for Android) if you want to run emulators.

### 🔧 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/paulpousset/cine-network.git
   cd cine-network
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install Playwright browsers (for E2E tests):**
   ```bash
   npx playwright install --with-deps
   ```

### 🔐 Environment Variables

Create a `.env` file in the root directory and add the following:

```env
# Supabase Configuration (Remote Instance)
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 🏃 Running the App

Start the Expo development server:
```bash
npx expo start
```

- Press **`a`** for Android.
- Press **`i`** for iOS.
- Press **`w`** for Web.
- Scan the QR code with **Expo Go** for physical devices.

---

## 🏗 Workflow & Best Practices

### 🌿 Git Flow
- **main**: Production-ready code.
- **dev**: Target branch for integrations.
- **feature/* / fix/*** : Create your branch from `dev`.
- Always open a Pull Request (PR) to `dev` for review.

### 🎨 Theming & UI
- Use the `useTheme()` hook for colors and status.
- Components should be modular and stored in `components/`.
- Global styles are located in `constants/Styles.ts`.

---

## 🧪 Testing

The project includes unit tests and End-to-End (E2E) tests.

### Unit Tests (Jest)
```bash
npm test
```

### E2E Tests (Playwright)
We use [Playwright](https://playwright.dev/) for the web version.
- **Run all tests:** `npm run test:e2e`
- **Interactive UI:** `npm run test:e2e:ui`

---

## 📂 Project Structure

```text
/
├── app/                  # Expo Router (File-based navigation)
│   ├── (tabs)/           # Main App Sections (Feed, Projects, Talents)
│   ├── project/          # Project creation and settings
│   ├── profile/          # User profiles
│   └── api/              # Local API routes / Handlers
├── components/           # Reusable UI components
├── hooks/                # Custom React hooks (logic, data fetching)
├── lib/                  # Library configs (Supabase, Events)
├── providers/            # React Context Providers (Theme, Auth, User)
├── services/             # Business logic & services (Notifications, Logs)
├── supabase/             # Database migrations and configuration
└── utils/                # Helper functions and constants
```

## 📄 License
This project is private and proprietary. Unauthorized copying or distribution is strictly prohibited.

│   └── account.tsx       # User settings and account management
├── assets/               # Static assets (fonts, images)
├── components/           # Reusable UI components
├── constants/            # Theme colors and global constants
├── hooks/                # Custom React hooks (e.g., useUserMode)
├── lib/                  # External service configs (Supabase, types)
└── utils/                # Helper functions and business logic
```

## 🗺 Roadmap

- [ ] Enhanced real-time chat notifications.
- [ ] Advanced file sharing and versioning for scripts/storyboards.
- [ ] Integration with professional industry APIs.
- [ ] Expanded analytics for project leads.

## 🤝 Contributing

This project is currently **private**. Detailed contribution guidelines will be provided if the project transitions to open source.

1. Open an issue to discuss proposed changes.
2. Fork the repository.
3. Create a feature branch: `git checkout -b feat/amazing-feature`.
4. Commit your changes: `git commit -m 'feat: add amazing feature'`.
5. Push to the branch: `git push origin feat/amazing-feature`.
6. Open a Pull Request.

## 📄 License

Copyright © 2026 Tita. All rights reserved.
This project is private and proprietary. Unauthorized copying or distribution is strictly prohibited.

---

_Built with ❤️ for the film industry._
