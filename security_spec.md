# DramaWin Coins Security Specification

## 1. Data Invariants
1. **PII Isolation**: Player contact info (`email` or `WhatsApp number`) resides exclusively in `/playerPrivate/{playerId}` and is readable/writable only by the owning player (`request.auth.uid == playerId`) or an administrator. Public leaderboard entries in `/leaderboard/{playerId}` contain zero PII.
2. **Identity & Ownership**: A player can only create or modify their own `/leaderboard/{playerId}` and `/playerPrivate/{playerId}` document, and `uid` inside the payload must strictly match `request.auth.uid`.
3. **Immutable Fields**: `uid` and `createdAt` are immutable once written.
4. **Server Timestamps**: All `createdAt` and `updatedAt` fields must equal `request.time`.
5. **Admin Governance**: Modifying `/episodes/{episodeId}`, `/appConfig/{configId}`, resolving `/support_messages/{messageId}`, or another player's coin balance is restricted strictly to verified admins (`gerinaicker04@gmail.com` with `email_verified == true` or verified `/admins/{uid}` unlocked with the Admin Studio passcode).
6. **Bounded Payloads**: Every string field enforces explicit `.size()` bounds; arrays (`claimedDays` <= 7, `watchedEpisodeIds` <= 100) are strictly bounded; coin balances are bounded (`0 <= coins <= 100000000`) and non-admin coin increments per write are capped (`<= 1000` per action) to prevent arbitrary client-side balance inflation.
7. **Support & Prize Win PII Protection**: `/prize_wins/{winId}` and `/support_messages/{messageId}` are readable only by the owning player (`uid == request.auth.uid`) or verified admin (`isAdmin()`). On creation, `support_messages` must have `status == 'open'` and `uid == request.auth.uid`.
8. **Admin-Only Mail Relay Lock**: `/mail/{mailId}` strictly enforces `to == ['gerinaicker04@gmail.com']` (size 1) on create so verified clients cannot use the Firebase Trigger Email extension as an open email relay to third-party recipients; only verified admins may read/list `/mail`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection on Leaderboard Create**: `{ uid, username, coins: 0, ..., isAdmin: true }` -> `PERMISSION_DENIED` (blocked by `hasOnly`).
2. **Identity Spoofing**: User A creates `/leaderboard/userB` with `uid: 'userB'` -> `PERMISSION_DENIED` (`playerId == request.auth.uid` and `uid == request.auth.uid`).
3. **PII Scraping**: User A reads `/playerPrivate/userB` -> `PERMISSION_DENIED`.
4. **Unverified Email Spoofing**: Request with `email: 'gerinaicker04@gmail.com'` and `email_verified: false` -> `PERMISSION_DENIED`.
5. **Arbitrary Coin Inflation by Player**: User A updates `/leaderboard/userA` setting `coins: 9999999` -> `PERMISSION_DENIED` (non-admin delta cap `<= 600`).
6. **Immutable Field Tampering**: User A updates `createdAt` or `uid` on `/leaderboard/userA` -> `PERMISSION_DENIED`.
7. **ID Poisoning**: Document ID with 1,500 chars or invalid characters (`/leaderboard/bad$id!`) -> `PERMISSION_DENIED` (`isValidId`).
8. **Fake Server Timestamp**: `updatedAt` set to client date instead of `request.time` -> `PERMISSION_DENIED`.
9. **Unauthorized Episode Creation**: Non-admin attempts to create `/episodes/ep_hack` -> `PERMISSION_DENIED`.
10. **Unauthorized Sponsor URL Hijack**: Non-admin updates `/appConfig/global` `sponsorAdUrl` -> `PERMISSION_DENIED`.
11. **Array Exhaustion**: `claimedDays` with 50 items or `watchedEpisodeIds` with 500 items -> `PERMISSION_DENIED`.
12. **Wrong Admin Passcode**: Non-admin attempts to create `/admins/{uid}` with `passcode: 'wrong'` -> `PERMISSION_DENIED`.
