# Task Breakdown

> Tick things off as you go – feel free to reorder or append as needed.

## 1. Routing & Navigation
- [ ] Remove duplicated pages in `app/` vs `src/app/`; settle on a single router directory.
- [ ] Add stack screens for *Job Details* and *Profile Settings*.
- [ ] Configure deep-linking & push-route handling (Expo Router linking config).

## 2. Authentication
- [ ] Wire `/login` & `/signup` pages to Supabase Auth (email / password flow).
- [ ] Implement **Forgot Password** & email verification screens.
- [ ] Persist session via `authContext` (+ secure storage) across app restarts.
- [ ] Trigger `updateLoginAndAddPoints` after successful login to award daily points.

## 3. Cloudinary / Media Uploads
- [ ] Create serverless/Edge function to sign Cloudinary uploads.
- [ ] Add RN helper to pick image & upload with progress.
- [ ] Store returned Cloudinary URLs in Supabase (`avatar_url`, `post_images`, etc.).

## 4. Job Posts
- [ ] Build *Create / Edit Job* form UI (category, budget, location, etc.).
- [ ] Add dedicated *Job Detail* screen with apply/bookmark actions.
- [ ] Implement search & filter (category, location, remote).
- [ ] Infinite scroll & pagination on post list.
- [ ] Handle status updates (open → in-progress → completed).

## 5. Messaging
- [ ] Model message schema in Supabase (tables + policies).
- [ ] Use Supabase Realtime channels for 1-to-1 chat.
- [ ] Build chat UI in `/messages` tab (typing indicator, optimistic send).
- [ ] Push notification on new message (Expo Push ≥ background data).

## 6. Points & Rank
- [ ] Show current points & rank on `/profile` page.
- [ ] Add progress bar to next rank (use `getPointsForNextRank`).
- [ ] Award points for *Received Job*, *Completed Job*, *Positive Review* events.
- [ ] Create standalone *Points History* screen (component exists).

## 7. Notifications
- [ ] Centralize `useNotifications` hook to dispatch `NotificationBanner` from anywhere.
- [ ] Integrate Expo push tokens & send push from Supabase trigger.
- [ ] Badge/unread count on *Messages* tab.

## 8. UI / UX Polish
- [ ] Replace placeholder images with final assets (see `/assets/images`).
- [ ] Implement global theming + dark mode (respect system color scheme).
- [ ] Smooth tab transitions & micro-interactions (Haptics already set up).

## 9. Testing & QA
- [ ] Unit tests for helpers (`pointsSystem`, `jobPostsHelper`, etc.).
- [ ] Component tests for new screens (React Native Testing Library).
- [ ] End-to-end flow tests with Detox.

## 10. Build & Deployment
- [ ] Configure GitHub Actions pipeline: lint → test → build (EAS/Expo Application Services).
- [ ] Generate and store Android keystore & iOS distribution certificates.
- [ ] Set up *Staging* Supabase project & EAS channel.

## 11. Bugs / House-Cleaning
- [ ] Search codebase for `TODO` and address outstanding comments.
- [ ] Remove unused assets & duplicate code.
- [ ] Resolve TypeScript/ESLint warnings reported by IDE. 