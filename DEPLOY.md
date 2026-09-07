# Shipping it

What it takes to put this online with Google sign-in, notebooks, and ads —
split into *what you do* and *what I build*.

---

## 1. Stack

| | |
|---|---|
| Hosting | **Vercel** — free tier is fine, it is already a Next app |
| Auth | **Auth.js (NextAuth v5)**, Google provider only |
| Database | **Neon** or **Supabase** Postgres — both have free tiers |
| ORM | **Drizzle** (lighter) or Prisma |

The board is currently local-first: everything lives in IndexedDB. Adding
accounts means the document also syncs to Postgres, keyed by whiteboard.

## 2. Data model

```
User                     (created by Auth.js)
  └── Notebook           id · userId · name · createdAt
        └── Whiteboard   id · notebookId · name · doc (jsonb) · updatedAt
```

Two levels, as you described. `doc` is the JSON the store already persists, so
the board code barely changes — only *where* the array is read and written.

Images need to move too: blobs currently sit in IndexedDB, and on a server they
belong in **Vercel Blob** or **S3**, with the object storing a URL instead of a
local key.

## 3. Google sign-in — what you do

1. [console.cloud.google.com](https://console.cloud.google.com) → new project.
2. **APIs & Services → OAuth consent screen** → *External* → app name, your
   support email, and the `email` + `profile` scopes. Nothing else is needed.
3. **Credentials → Create credentials → OAuth client ID → Web application.**
4. Authorised redirect URIs — add both:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://yourdomain.com/api/auth/callback/google`
5. Copy the client ID and secret into `.env.local` and into Vercel's env vars:

```
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
AUTH_SECRET=...        # npx auth secret
DATABASE_URL=...       # from Neon or Supabase
```

While the consent screen is in *Testing*, only accounts you list can sign in.
Publishing it is a one-click change; Google only demands verification if you
request sensitive scopes, and `email` + `profile` are not sensitive.

---

## 4. Ads — read this part before you do it

You asked how. Here is how, and then here is why I would not start with it.

### What you do

1. **Get a real domain.** AdSense rarely approves a bare `*.vercel.app`.
2. **Write a privacy policy page.** Not optional — you would be serving
   personalised ads and setting cookies.
3. **Set up consent.** For EEA/UK visitors Google requires a certified
   Consent Management Platform. AdSense's own *Privacy & messaging* tool
   generates one; it must be live before you serve ads there.
4. Apply at [adsense.google.com](https://adsense.google.com), add the site, and
   paste their verification snippet into the document head.
5. **Wait.** Review takes days to weeks, and rejection for "low value content"
   is common for single-page apps with little text.
6. Once approved, create an ad unit and drop in its `<ins class="adsbygoogle">`
   snippet.

### What I build

Genuinely small — an hour, most of it waiting on you:

- the AdSense loader in `layout.tsx` via `next/script`
- `public/ads.txt` containing `google.com, pub-XXXX, DIRECT, f08c47fec0942fa0`
- a collapsible right rail that holds the unit without eating canvas
- the consent banner wiring

### Why I would not start here

Ad revenue tracks **pageviews**, and a canvas app is the worst possible shape
for that — someone opens one tab and leaves it open for an hour. That is one
pageview. A niche tool realistically earns **$1–5 per 1000 pageviews**, so a
good day on X — say 10,000 visitors — is on the order of **$10–30, once**.
Against that: a domain, a privacy policy, a consent platform, an approval
process that may say no, and a permanent rail eating the canvas of a tool whose
whole appeal is an uncluttered surface.

Cheaper things that make more, in order of effort:

1. **A "buy me a coffee" link.** Ten minutes, no approval, no cookie banner, no
   layout cost. For a beloved niche tool this reliably beats display ads.
2. **GitHub Sponsors** if it gets an audience among developers.
3. **A paid tier later** — local use free forever, a few dollars a month for
   cloud sync across devices. This is the one that actually scales, and you
   need the accounts from §3 for it anyway.

If it does blow up on X, put ads in then, once you know the traffic shape. The
work is an hour whenever you want it.

---

## 5. Open source first

The current plan. Nothing below is needed for that: the board is local-first
and fully static, so `vercel deploy` gives a working public link today, and the
repo is MIT licensed. Sharing works without accounts — a room link is enough
for two people to work together.

Accounts only become worth it when you want boards to follow you between
devices. Until then they are pure overhead.

## 6. Suggested order

1. **Deploy as-is, no accounts.** It already works fully local-first — push to
   Vercel and you have a shareable link today. Nothing below blocks this.
2. Buy the domain, add a coffee link.
3. Add Google sign-in + Postgres + notebooks, once you want cross-device.
4. Move images to blob storage.
5. Revisit ads only if traffic justifies it.

Step 1 needs nothing from you but a Vercel account.
