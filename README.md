# MoneyMentor Mobile (Expo)

This project is an Expo app (with Expo Router). The recommended way to run it is on your phone using Expo Go.

## 1) Prerequisites

Install these first:

- Node.js 20 LTS (recommended)
- npm (comes with Node)
- Git

Check versions:

```bash
node -v
npm -v
git --version
```

## 2) Clone the repository

```bash
git clone <YOUR_REPO_URL>
cd "Moneymentor Github repo/React-Native-AndroidApplication"
```

If you cloned into a different folder name, use that folder instead.

## 3) Install dependencies

```bash
npm install
```

## 4) Configure environment variables

Create or update `.env` in `React-Native-AndroidApplication/` with:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Important:

- Variable names must start with `EXPO_PUBLIC_` so Expo can load them at runtime.
- Keep real keys out of source control.

## 5) Run the app on your phone (recommended)

1. Install Expo Go on your phone:
- iOS: App Store
- Android: Google Play Store

2. Start the Expo dev server:

```bash
npx expo start
```

Or:

```bash
npm start
```

3. Open the app on your phone:
- iOS: open the Camera app and scan the QR code in the terminal/browser
- Android: open Expo Go and scan the QR code

Notes:
- Your phone and computer should be on the same Wi-Fi network.
- If QR connection has issues, press `t` in the Expo terminal to switch to Tunnel mode.

## 6) Run the app on web (secondary option)

```bash
npx expo start --web
```

Or with npm script:

```bash
npm run web
```

Expo will start a dev server and open the app in your browser (usually `http://localhost:8081` or a nearby port).

## 7) Other useful commands

Start Expo dev server (all targets):

```bash
npx expo start
```

Run Android target:

```bash
npm run android
```

Run iOS target (macOS only):

```bash
npm run ios
```

## 8) Common issues

Port already in use:

```bash
npx expo start --web --port 8082
```

Stale cache:

```bash
npx expo start -c
```

Expo Go connection issues:

- Ensure phone and computer are on the same network
- Try Tunnel mode (`t` in terminal)
- Re-open Expo Go and rescan QR code

Missing env vars error:

- Confirm `.env` is inside `React-Native-AndroidApplication/`
- Confirm exact names:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Restart Expo after changing `.env`
