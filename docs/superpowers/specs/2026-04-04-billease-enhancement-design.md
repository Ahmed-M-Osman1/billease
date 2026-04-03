# BillEase Full Enhancement — Design Spec

## Context

BillEase is an AI-powered restaurant bill-splitting app built with Next.js 16, Tailwind CSS, Shadcn/ui, and Google Gemini AI. Currently it's a single-page client-only tool with no authentication, no database, and no bill persistence. The goal is to transform it into a production-quality, portfolio-worthy, full-featured product with:

- Supabase backend (auth, database, real-time, storage)
- Multi-page app with sidebar navigation
- Step-by-step bill-splitting wizard
- Social features (sharing, collaboration, friends)
- History and analytics
- Smart features (multi-currency, tips, templates, PWA)
- Clean & Professional UI (Stripe/Linear aesthetic)
- Responsive mobile-first design

## Decisions Made

- **UI Direction**: Clean & Professional (white space, subtle shadows, clear typography)
- **Navigation**: Sidebar (collapsible icon nav, drawer on mobile)
- **Workflow**: Step-by-Step Wizard (Upload → People → Assign → Summary)
- **Backend**: Supabase (Auth + PostgreSQL + Real-time + Storage)
- **Approach**: Full Rewrite (preserve AI flows and core logic, rebuild everything else)

---

## 1. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16 (App Router) | Keep current |
| UI | Tailwind CSS + Shadcn/ui | Keep current |
| Animation | Framer Motion | Add — page transitions, micro-interactions |
| State | Zustand | Replace Context — better for multi-page + persistence middleware |
| Backend | Supabase | Auth, PostgreSQL, Real-time subscriptions, Storage |
| AI | Genkit + Google Gemini | Keep current flows |
| Charts | Recharts | Already installed, activate for analytics |
| Forms | React Hook Form + Zod | Keep current |
| Icons | Lucide React | Keep current |
| Export | html2canvas | Keep for PNG export, add PDF generation |

### Dependencies to Add
- `@supabase/supabase-js` — Supabase client
- `@supabase/ssr` — Supabase SSR helpers for Next.js
- `zustand` — State management
- `framer-motion` — Animations
- `jspdf` — PDF export

### Dependencies to Remove
- `firebase` — Replaced by Supabase
- `@tanstack-query-firebase/react` — No longer needed
- `@tanstack/react-query` — Evaluate; may keep for server state caching

---

## 2. Database Schema (Supabase PostgreSQL)

### `profiles`
```sql
id          UUID PRIMARY KEY REFERENCES auth.users(id)
full_name   TEXT NOT NULL
avatar_url  TEXT
currency    TEXT DEFAULT 'EGP'
theme       TEXT DEFAULT 'system' -- 'light' | 'dark' | 'system'
created_at  TIMESTAMPTZ DEFAULT now()
updated_at  TIMESTAMPTZ DEFAULT now()
```

### `friends`
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE
friend_id   UUID REFERENCES profiles(id) ON DELETE CASCADE
nickname    TEXT
created_at  TIMESTAMPTZ DEFAULT now()
UNIQUE(user_id, friend_id)
```

### `groups`
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE
name        TEXT NOT NULL
created_at  TIMESTAMPTZ DEFAULT now()
```

### `group_members`
```sql
group_id    UUID REFERENCES groups(id) ON DELETE CASCADE
profile_id  UUID REFERENCES profiles(id) ON DELETE CASCADE
PRIMARY KEY (group_id, profile_id)
```

### `bills`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE
title           TEXT NOT NULL -- restaurant name or custom title
image_url       TEXT -- stored in Supabase Storage
date            DATE DEFAULT CURRENT_DATE
currency        TEXT DEFAULT 'EGP'
subtotal        DECIMAL(10,2) DEFAULT 0
vat             DECIMAL(10,2) DEFAULT 0
service_charge  DECIMAL(10,2) DEFAULT 0
delivery        DECIMAL(10,2) DEFAULT 0
tip             DECIMAL(10,2) DEFAULT 0
tip_mode        TEXT DEFAULT 'none' -- 'none' | 'pre_tax' | 'post_tax'
status          TEXT DEFAULT 'draft' -- 'draft' | 'active' | 'settled'
share_token     TEXT UNIQUE -- for shareable links
is_collaborative BOOLEAN DEFAULT false
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```

### `bill_participants`
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
bill_id     UUID REFERENCES bills(id) ON DELETE CASCADE
profile_id  UUID REFERENCES profiles(id) -- NULL if guest (non-registered)
name        TEXT NOT NULL
color       TEXT -- hex color for visual identification
is_settled  BOOLEAN DEFAULT false
settled_at  TIMESTAMPTZ
```

### `bill_items`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
bill_id         UUID REFERENCES bills(id) ON DELETE CASCADE
name            TEXT NOT NULL
price           DECIMAL(10,2) NOT NULL
quantity        INTEGER DEFAULT 1
assigned_to     UUID REFERENCES bill_participants(id) -- NULL = unassigned
assignment_type TEXT DEFAULT 'individual' -- 'individual' | 'shared_all' | 'shared_group'
shared_group_id UUID -- references a custom split group within the bill
```

### `bill_split_groups`
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
bill_id     UUID REFERENCES bills(id) ON DELETE CASCADE
name        TEXT NOT NULL
```

### `bill_split_group_members`
```sql
group_id        UUID REFERENCES bill_split_groups(id) ON DELETE CASCADE
participant_id  UUID REFERENCES bill_participants(id) ON DELETE CASCADE
PRIMARY KEY (group_id, participant_id)
```

### `settlements`
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
bill_id     UUID REFERENCES bills(id) ON DELETE CASCADE
from_id     UUID REFERENCES bill_participants(id)
to_id       UUID REFERENCES bill_participants(id)
amount      DECIMAL(10,2) NOT NULL
is_paid     BOOLEAN DEFAULT false
paid_at     TIMESTAMPTZ
```

### Row Level Security
- Users can only read/write their own bills, profiles, friends
- Bills with `share_token` are readable by anyone with the token
- Collaborative bills are writable by participants

---

## 3. Pages & Routes

### Sidebar Navigation
- Collapsible sidebar with icon + label (collapsed = icon only)
- Active page highlighted with primary color background
- User avatar + name at bottom of sidebar
- Mobile: overlay drawer triggered by hamburger icon in top-left
- Mobile: floating action button (FAB) for "New Bill" — always visible

### Route Structure

```
/                       → Dashboard
/bill/new               → New Bill Wizard (4 steps)
/bill/[id]              → Bill Detail (view/edit saved bill)
/bill/[id]/collaborate  → Collaborative view (shared via link)
/history                → Bill History
/analytics              → Spending Analytics
/friends                → Friends & Groups
/settings               → User Settings
/auth/login             → Login page
/auth/signup            → Sign up page
/auth/callback          → Supabase auth callback
```

---

## 4. Bill-Splitting Wizard (`/bill/new`)

### Progress Indicator
- Horizontal stepper bar at top: 4 numbered circles connected by lines
- Completed steps: filled primary color with checkmark
- Current step: filled primary with number
- Future steps: gray outline
- Step labels below: Upload → People → Assign → Summary

### Step 1: Upload & Extract
- **Upload zone**: Dashed border, drag-and-drop (desktop), tap to select file
- **Camera button**: Opens device camera (mobile), environment-facing
- **Image preview**: Shows uploaded image with crop/rotate controls
- **Bill metadata**: Restaurant name (auto-detected or manual input), date picker, currency selector
- **OCR mode toggle**: Unit price vs. total price interpretation
- **"Extract Items" button**: Triggers Gemini OCR, shows skeleton loading for items
- **Extracted items list**: Inline editable — name, price, quantity per item
- **"Add item manually" button**: For items OCR missed
- **Multi-bill**: "Add another page" button for long receipts
- **Navigation**: "Next" button (disabled until at least 1 item exists)

### Step 2: People & Groups
- **Quick add**: Text input + "Add" button, press Enter to add
- **Friends list**: Toggle to show saved friends, one-tap to add
- **Recent groups**: Suggested groups from recent bills
- **Person cards**: Name, assigned color/avatar, remove button
- **Custom split groups**: Create named groups, select members via checkboxes
- **Invite link**: "Invite others" button generates shareable link
- **Minimum**: At least 2 people required to proceed
- **Navigation**: "Back" and "Next" buttons

### Step 3: Assign Items
- **Desktop**: 
  - Left panel: Unassigned items list (draggable)
  - Right panel: Grid of person drop zones + shared zones
  - Drag item → drop on person/group
  - Framer Motion: item animates to target zone
- **Mobile**:
  - Item list with tap-to-assign
  - Bottom sheet appears with people chips
  - Tap person chip → item assigned with animation
- **Visual feedback**: 
  - Items show colored avatar dot of assignee
  - Shared items show split icon + participant count
  - Unassigned items badge/counter with warning color
- **AI auto-suggest**: "Auto-assign with AI" button → suggests assignments → accept/reject each
- **Split options per item**: 
  - Assign to one person
  - Share among all
  - Share among custom group
  - Split by custom percentage
- **Navigation**: "Back" and "Next" (warns if unassigned items remain)

### Step 4: Summary & Share
- **Per-person breakdown cards**:
  - Person name + avatar/color
  - Direct items list with prices
  - Shared items with split amounts
  - VAT share (proportional)
  - Service charge share (proportional)
  - Tip share (if tip added)
  - **Total due** (bold, prominent)
- **Bill distribution chart**: Pie chart (Recharts) showing each person's share
- **Tip calculator**:
  - Toggle: No tip / Pre-tax / Post-tax
  - Percentage buttons: 10%, 15%, 20%, Custom
  - Split mode: Even or proportional
- **Totals summary**: Subtotal, VAT, Service, Tip, Grand Total
- **Export options**:
  - Download as PNG (current html2canvas)
  - Download as PDF (jspdf)
  - Copy summary text
  - Share via WhatsApp (pre-formatted message with link)
  - Share bill link (read-only view for others)
- **Settle up**: Mark individual participants as "paid"
- **Save bill**: Saves to Supabase, appears in History
- **New bill**: "Split another bill" button

---

## 5. Dashboard (`/`)

- **Header**: "Welcome back, {name}" with date
- **Quick stats row** (4 cards):
  - Bills this month (count)
  - Total spent this month
  - Average bill size
  - Most frequent dining buddy
- **Pending settlements**: Cards showing outstanding balances (who owes you / you owe)
- **Recent bills**: Last 5 bills — card format with restaurant, date, total, avatar stack, your share
- **Quick start**: Large "Split a New Bill" CTA button
- **Favorite groups**: Chips for saved groups — tap to start new bill with that group

---

## 6. History (`/history`)

- **Search bar**: Full-text search across restaurant name, people, items
- **Filter bar**: Date range, amount range, people count, status (draft/active/settled)
- **Sort dropdown**: Date (newest/oldest), amount (high/low), people count
- **Bill list**: Card or row format with:
  - Restaurant name + icon
  - Date
  - Total amount
  - Avatar stack (participants)
  - Your share
  - Status badge (draft/active/settled)
- **Empty state**: Illustrated empty state with CTA to split first bill
- **Infinite scroll** with skeleton loading
- **Swipe actions** (mobile): Swipe left to delete, right to duplicate
- **Bulk select**: Checkbox mode for multi-delete or CSV export

---

## 7. Analytics (`/analytics`)

- **Period selector**: Week / Month / Year / Custom range (tabs or dropdown)
- **Spending over time**: Line chart — total spending per period
- **Bill distribution**: Pie chart — your typical share vs. others
- **Top restaurants**: Horizontal bar chart — most visited places with amounts
- **Spending by person**: Bar chart — who you split with most
- **Who owes whom**: Net balance table — across all bills, net amount per friend
- **Monthly comparison**: Card showing this month vs. last month (% change)
- **All charts**: Recharts with Tailwind-themed colors, tooltips, responsive

---

## 8. Friends & Groups (`/friends`)

### Friends Tab
- **Add friend**: Search by email or username, send invite
- **Friends list**: Avatar, name, shared bill count, net balance
- **Friend detail**: Tap to see shared history, settle up option

### Groups Tab
- **Create group**: Name + select friends
- **Group list**: Name, member count, mini avatar stack
- **Quick action**: "New bill with this group" button
- **Edit/delete** groups

---

## 9. Settings (`/settings`)

- **Profile section**: Name, email (read-only), avatar upload (Supabase Storage)
- **Preferences**: 
  - Default currency (dropdown with common currencies)
  - Theme: Light / Dark / System (toggle or radio)
  - Language: English (Arabic future-ready)
- **Data**: 
  - Export all data as JSON
  - Export bills as CSV
  - Delete account (with confirmation)
- **About**: App version, feedback link, changelog

---

## 10. Authentication

### Login Page (`/auth/login`)
- Email + password form
- Social login: Google OAuth (via Supabase Auth)
- "Forgot password" link
- "Sign up" link
- Clean, centered card layout

### Sign Up Page (`/auth/signup`)
- Name, email, password form
- Social signup: Google OAuth
- Email verification flow
- Redirect to dashboard after verification

### Auth Flow
- Supabase Auth with `@supabase/ssr` for Next.js middleware
- Protected routes: all except `/auth/*` and shared bill links
- Session stored in cookies (httpOnly, secure)
- Auto-refresh tokens

---

## 11. UI/UX Polish

### Design System
- **Color palette**: Blue primary (#3b82f6), clean whites/grays, subtle accent colors
- **Typography**: Geist Sans (current), clear hierarchy (h1-h4, body, caption)
- **Spacing**: Consistent 4px grid (p-1 = 4px, p-2 = 8px, etc.)
- **Border radius**: 8px for cards, 6px for inputs, 12px for modals
- **Shadows**: Subtle — `shadow-sm` for cards, `shadow-md` for elevated elements
- **Dark mode**: Full dark theme, toggleable, respects system preference

### Animations (Framer Motion)
- **Page transitions**: Slide/fade between routes
- **Wizard steps**: Slide left/right between steps
- **Item assignment**: Item flies from source to target with spring animation
- **Card interactions**: Scale on hover (1.02), press (0.98)
- **List items**: Staggered fade-in on load
- **Loading**: Skeleton screens with shimmer effect on all data fetches
- **Toasts**: Slide in from top-right with progress bar

### Responsive Design
- **Desktop (≥1024px)**: Full sidebar + content area
- **Tablet (768-1023px)**: Collapsed sidebar (icons only) + full content
- **Mobile (<768px)**: 
  - Sidebar → overlay drawer
  - Bottom FAB for new bill
  - Bottom sheets instead of dialogs
  - Swipe gestures for wizard steps
  - 48px minimum touch targets
  - Full-width cards and inputs

### Empty States
- Custom illustrations for: no bills, no friends, no history, no analytics data
- Each includes a helpful description and CTA button

### Onboarding
- First-time users see a 3-step tooltip tour:
  1. "Upload your bill here"
  2. "Add the people you're splitting with"
  3. "Check your analytics over time"
- Dismissable, doesn't show again

### Accessibility
- Full ARIA labels on all interactive elements
- Focus management for modals and wizard steps
- Keyboard navigation: Tab, Enter, Escape
- Skip-to-content link
- Color-blind safe palette (don't rely solely on color)
- Screen reader announcements for dynamic content
- Reduced motion support (respects `prefers-reduced-motion`)

---

## 12. Smart Features

### Multi-Currency
- Currency selector in bill creation and user settings
- Support: EGP, USD, EUR, GBP, SAR, AED, KWD (expandable)
- Stored per-bill and as user default
- Currency symbol displayed throughout

### Tip Calculator
- Integrated in wizard Step 4
- Modes: No tip, Pre-tax percentage, Post-tax percentage, Custom amount
- Quick buttons: 10%, 15%, 20%
- Split: Even across all, or proportional to share

### Receipt Gallery
- All uploaded bill images stored in Supabase Storage
- Viewable from bill detail page
- Zoomable image viewer

### Offline Support (PWA)
- Service worker for offline access
- Cache: app shell, recent bills, friends list
- Queue: new bills created offline sync when online
- Manifest for "Add to Home Screen"

---

## 13. Real-Time Collaboration

### How It Works
1. Bill creator clicks "Invite others" → generates share link with `share_token`
2. Link recipient opens bill in browser
3. If logged in: auto-added as participant
4. If not logged in: enters name as guest
5. All participants see real-time updates via Supabase Realtime
6. "Claim your items" mode: each person selects their own items
7. Creator sees assignments update live
8. Creator finalizes and shares summary

### Technical
- Supabase Realtime subscriptions on `bill_items` and `bill_participants` tables
- Optimistic UI updates with conflict resolution
- Presence indicators (who's currently viewing)

---

## 14. Verification Plan

### Manual Testing
1. Auth: Sign up, log in, log out, password reset, Google OAuth
2. Wizard: Complete full flow — upload image → OCR → add people → assign → summary
3. Persistence: Save bill, refresh page, verify data persists
4. History: View past bills, search, filter, sort
5. Analytics: Verify charts render with real data
6. Sharing: Generate share link, open in incognito, verify read-only view
7. Collaboration: Two browsers, real-time item claiming
8. Responsive: Test all pages on mobile (375px), tablet (768px), desktop (1440px)
9. Dark mode: Toggle theme, verify all pages
10. Export: Download PNG, PDF, WhatsApp share
11. Offline: Disconnect network, verify cached pages work

### Automated Testing (Future)
- Unit tests for calculation logic (proportional splits, tip distribution)
- Component tests for wizard step rendering
- E2E tests for critical flows (Playwright)
