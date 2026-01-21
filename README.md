# Cine Network 🎬

Cine Network is a professional mobile application built with React Native and Expo, designed to streamline collaboration within the film and audiovisual industry. It connects filmmakers, actors, and technicians through a unified platform for project management and talent scouting.

## 🚀 Key Features

- **Project Lifecycle Management**: Create and manage film projects from setup to post-production.
- **Talent Marketplace**: Explore professional profiles and discover new talents for your crew or cast.
- **Dynamic Roles & Casting**: Detailed role definitions and recruitment management.
- **Integrated Team Tools**: Dedicated project calendars, team management dashboards, and categorized chat systems.
- **Cross-Platform**: Optimized for iOS, Android, and Web using Expo.

## 🛠 Tech Stack

- **Framework**: [Expo](https://expo.dev/) / [React Native](https://reactnative.dev/)
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
- **Backend-as-a-Service**: [Supabase](https://supabase.com/) (Authentication, Real-time Database, Storage)
- **Styling**: Themed components with support for light/dark modes.
- **Other Tools**: React Native Maps, Expo Image Picker, Expo Document Picker.

## 📦 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- npm or yarn
- [Expo Go](https://expo.dev/client) app on your mobile device (for testing)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/paulpousset/cine-network.git
   cd cine-network
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure Supabase:
   Ensure your Supabase credentials are correctly set in [lib/supabase.ts](lib/supabase.ts).

### Running the App

Start the Expo development server:

```bash
npx expo start
```

## 📂 Project Structure

- [app/](app/): Contains the main application routes and screens (Expo Router).
  - [(tabs)/](<app/(tabs)/>): Main navigation tabs (My Projects, Jobs, Talents).
  - [project/](app/project/): Project-specific management screens and sub-routes.
  - [profile/](app/profile/): User profile views.
- [components/](components/): Reusable UI components.
- [lib/](lib/): Backend configuration (Supabase) and type definitions.
- [hooks/](hooks/): Custom React hooks (e.g., `useUserMode`).
- [utils/](utils/): Helper functions and constants (e.g., role definitions).

## 📄 License

This project is private.
