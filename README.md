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
- **Backend**: [Supabase](https://supabase.com/) (Auth, Real-time DB, Storage)
- **State/Hooks**: Custom hooks for session and environment management.
- **Utilities**: React Native Maps, Expo Image/Document Pickers.

## 📦 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo Go](https://expo.dev/client) app on your mobile device for testing.
- A [Supabase](https://supabase.com/) account and project.

### Environment Setup

Create a `.env` file in the root directory (or use your preferred environment management tool) and add your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/paulpousset/cine-network.git
   cd cine-network
   ```

2. **Install dependencies:**

   ```bash
   npm install
   npx playwright install --with-deps
   ```

3. **Start the development server:**
   ```bash
   npx expo start
   ```

## 🧪 Testing

The project includes unit tests and End-to-End (E2E) tests.

### Unit Tests

```bash
npm test
```

### E2E Tests (Web)

We use [Playwright](https://playwright.dev/) for E2E testing the web version of the application.

- **Run tests:** `npm run test:e2e`
- **Open UI mode:** `npm run test:e2e:ui`
- **Debug tests:** `npm run test:e2e:debug`

Before running E2E tests for the first time, ensure you have installed the necessary browsers:

```bash
npx playwright install
```

> Use the **Expo Go** app to scan the QR code and run the app on your device, or press `i` for iOS simulator, `a` for Android emulator, or `w` for web.

## 📂 Project Structure

```text
/
├── app/                  # Application routes (Expo Router)
│   ├── (tabs)/           # Main navigation: Projects, Jobs, Talents
│   ├── project/          # Project management and details
│   ├── profile/          # User professional profiles
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
