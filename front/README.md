# SelfDev Frontend

React Native app (Expo SDK 57) for SelfDev.

## Get started

```bash
cd frontend
npm install
npx expo start
```

Then open the app in:

- iOS Simulator
- Android emulator
- [Expo Go](https://expo.dev/go) on a device
- web (`w` in the terminal)

Source lives in `src/`. Routing is file-based via [Expo Router](https://docs.expo.dev/router/introduction):

- `src/app/_layout.tsx` — root layout and tabs
- `src/app/index.tsx` — Home
- `src/app/explore.tsx` — Explore
