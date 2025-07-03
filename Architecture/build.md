# Build Plan

## High-Level Goals

1. Deliver a cross-platform mobile application that connects job posters with skilled workers.
2. Gamify engagement through a points & rank system that rewards helpful behavior.
3. Provide real-time messaging and notifications so workers and clients can communicate quickly.
4. Offer rich job posts with media (images, attachments) stored in the cloud.
5. Maintain a maintainable, test-covered TypeScript codebase with CI/CD.

## Current Progress

- 📱 **React Native / Expo** scaffold is in place and runs on Android, iOS & Web.
- ☁️ **Supabase** is configured; helpers exist for authentication, job posts, points & notifications.
- 🗺️ **App routing**: Tab layout (`Home`, `Jobs`, `Messages`, `Profile`) and auth routes (`/login`, `/signup`) implemented.
- 🏅 **Gamification**: SQL migrations & TypeScript helpers for points & rank calculation are written.
- 🔔 **In-app notifications** via custom `NotificationBanner` component work locally.
- 🧩 Core UI components (Collapsible, Post, PointsHistory, etc.) are available.
- ✅ Initial Jest snapshot test for themed text component.

## Tech Stack / Tooling

| Layer | Technology |
|-------|------------|
| Mobile UI | React Native (Expo SDK), Expo Router, TypeScript |
| Backend-as-a-Service | Supabase (PostgreSQL, Auth, Realtime) |
| Media Storage | Cloudinary (planned) |
| Native Modules | Expo Haptics, Expo Icons |
| Testing | Jest, React-Native-Testing-Library |
| DevOps | Gradle (Android), Metro/webpack (Web), GitHub Actions (planned) |

## Known Blockers / Open Questions

1. **Route duplication** — both `app/` and `src/app/` contain pages; decide on single source of truth.
2. **Cloudinary integration** — need a secure signature endpoint (Supabase Edge Function?) & direct uploads from RN.
3. **Push notifications** — choose between Expo Push vs FCM/APNs directly and wire into Supabase events.
4. **Messaging backend** — design schema & realtime strategy for 1-to-1 chats.
5. **CI/CD** — no pipeline yet; determine test + build matrix.
6. **Design hand-off** — many Figma images exist but UI isn't finalized; need design tokens & dark mode support.
7. **SQL triggers** — rank/points triggers are drafted but unverified in staging.
8. **Production signing keys** — Android/iOS release credentials not generated. 