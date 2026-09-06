# 65 ROSES — PROJECT CONSTITUTION

This file is permanent memory. Read it before every task. Do not deviate from it.
If a request conflicts with this file, follow this file and say so.

---

## 0. WHAT THIS IS

65 ROSES is a private nightlife membership world in Beirut (later Madrid).
This repository is the membership infrastructure behind it.

It is **not** a ticketing site, not a promoter page, not a SaaS product.
It is a private world that happens to have a login.

The guest should feel:

> she has a Rose → she receives an invitation → she makes one decision → she arrives → we recognize her.

Everything else happens invisibly.

---

## 1. VOCABULARY — USE THESE WORDS ONLY

| Concept              | Correct term                           | Never write                 |
| -------------------- | -------------------------------------- | --------------------------- |
| Female member        | **Rose**                               | user, girl, VIP, guest      |
| Her gold pendant     | **the Rose**                           | merch, product, necklace ID |
| Her permanent number | **0065** format, 4 digits, zero-padded | ID, user #, customer number |
| Male guest           | **Stem**                               | plus one, +1, guest pass    |
| His bracelet         | **Stem credential**                    | wristband, ticket           |
| A night              | the woman's name — **SERENA**          | event 1, Friday, party      |
| Event index          | **001**, **002**                       | episode, edition            |
| Hours                | **00—05**                              | midnight to 5am, 12AM-5AM   |
| Home                 | **BEIRUT.**                            | Beirut, Lebanon             |
| Signature            | **0065**                               | any other number            |

`0065` is the only recurring serial signature. Never invent other numbers
(no 0067, no 1965, no 065). Event codes are `001`, `002`, `003`.

---

## 2. FORBIDDEN

Never render, in any UI, email, SMS, meta tag, alt text, or comment:

- VIP · elite · premium · exclusive · luxury · upscale · bespoke
- "Book now" · "Buy tickets" · "Get your spot" · "Limited spots"
- "Application submitted successfully" · "Your account has been approved"
- Early bird · table packages · bottle service · dress code · guestlist
- DJ lineup as a marketing proposition
- Ladies free before / girls enter free / hot girls / attractiveness anything
- Emoji in member-facing UI (one exception: the rose glyph 🌹 in YOUR NIGHTS)
- Loading spinners with text like "Please wait…"
- Toast notifications with checkmarks
- Any claim that olive oil affects hangovers or health

Never build, ever:

- attractiveness / beauty / rating / score fields on humans
- a public member directory
- a numeric Rose Health score visible to a member

---

## 3. COLOR

```css
--red-65: #4a0e14; /* oxblood — primary world */
--red-deep: #6b0f18; /* lift, used sparingly */
--chalk: #e8e2d6; /* dirty off-white — the voice */
--chalk-dim: rgba(232, 226, 214, 0.55);
--black: #0a0708; /* near-black, never #000 */
--gold: #b08d4f; /* muted antique gold — the Rose only */
```

Rules:

- Red is the world. Black is depth. Chalk is the voice. Gold is the object.
- Gold appears **only** on: the Rose render, the member number, and hairline
  dividers on the approval screen. Nowhere else. Gold is not a button color.
- No bright red (#FF0000 family). No gradients except a single very soft
  radial vignette. No pure white. No pure black.
- Admin surfaces may use near-black + chalk and are allowed to be plain.
  They must still never use blue/green/purple status chips.

---

## 4. TEXTURE

Every red surface carries:

1. An SVG `feTurbulence` grain overlay, opacity 0.05–0.09, `mix-blend-mode: overlay`.
2. A plaster/paper noise layer at very low opacity.
3. A soft radial vignette darkening the edges.

Implement once as `<Grain />` and `<Plaster />` components. Never re-roll per page.
Texture is a fixed-position overlay with `pointer-events: none`.

---

## 5. TYPE

Two voices only.

**CHALK** — headlines, all member-facing statements.

- A handwritten/marker face that looks like a human at 4AM, not a designer.
- Recommended: a variable "marker" or chalk webfont; fallback to a rough
  handwriting stack. Never Caveat, never Great Vibes, never a script wedding font.
- Always UPPERCASE. Letter-spacing slightly loose. Slight per-line rotation
  (−0.6° to +0.6°, deterministic per string hash, never random on re-render).
- Never justified. Never centered inside a box — centered on the page is fine.

**MONO** — numbers, serials, times, codes, admin.

- A clean monospace. Used for `0065`, `001`, `00—05`, OTP codes, `05:13`.
- Tracking wide. Small. Quiet.

Body text is rare. When needed, it is MONO at small size and low opacity.

Type scale is brutal: one huge thing, one tiny thing, nothing in between.

---

## 6. LAYOUT

- Negative space is the primary design element. If a screen looks empty, it is correct.
- Max one idea per screen. If there are two, it is two screens.
- Mobile-first. The entire member experience is used on a phone at night, one-handed.
- No cards. No shadows. No borders except hairlines at 8% chalk.
- Buttons are usually text with a chalk underline that extends on hover.
- The tiny `0065` sits bottom-center or bottom-left on most screens.

---

## 7. MOTION

- Fades only. 400–700ms. `cubic-bezier(0.22, 1, 0.36, 1)`.
- No bounce, no spring, no slide-in-from-right, no stagger cascades.
- Page transitions: crossfade through black.
- Respect `prefers-reduced-motion` everywhere.

---

## 8. THE COPY LAW

Before writing any string, run it through three gates:

1. **Does this need to be said?** If no — delete it.
2. **Can it be three words instead of twelve?** If yes — do it.
3. **Can it be said without words?** If yes — do that.

Canonical strings (use verbatim, do not paraphrase):

```
ENTER
FOR ROSES.
EVERY ROSE GETS A ROSE.
WHO GETS YOUR STEM?
HE CAN'T ASK US.
ASK HER.
00—05
BEIRUT.
REQUEST ACCESS
WE HAVE YOU.
We'll be in touch.
YOU'RE A ROSE.
SHE'S YOURS.
YOUR ROSE IS BEING MADE.
YOUR FIRST NIGHT IS COMING.
ENTER 65
YOUR NUMBER IS YOURS.
YOUR PHONE TELLS US IT'S YOU.
ENTER WHAT WE SENT YOU.
ARE YOU COMING?
YES
NOT THIS TIME
WE'LL SEE YOU.
ONE ROSE. ONE STEM.
YOUR STEM. YOUR DECISION.
SEND HIM HIS LINK
YOU'VE BEEN CHOSEN.
CONFIRM YOUR PLACE
YOU'RE HER STEM.
SEE YOU INSIDE.
KNOW A ROSE?
SEND HER @
We'll take it from here.
WHERE SHOULD YOUR ROSE FIND YOU?
SHE'S ON HER WAY.
SHE FOUND YOU.
DON'T LOSE HER.
FOR YOU.
YOURS.
SHOW US IT'S YOU.
YOU'RE IN.
WE MISSED YOU.
ARE YOU STILL WITH US?
YOUR ROSE IS QUIET.
WAKE MY ROSE
YOUR ROSE IS AWAKE AGAIN.
CAN'T MAKE IT? TELL US.
WE'LL SAVE YOUR ROSE FOR ANOTHER NIGHT.
YOUR NIGHTS
FULL.
COVER IT.
```

All member-facing copy lives in `src/content/copy.ts` as a typed const object.
Nothing is hardcoded in a component. This is enforced.

---

## 9. STATUS MODEL

Internal statuses: `ACTIVE` · `QUIET` · `AT_RISK` · `PAUSED` · `DECLINED` ·
`SUSPENDED` · `INACTIVE`.

What a member is ever shown is **only** one of three words:

`ACTIVE` · `QUIET` · `PAUSED`

`AT_RISK` maps to `QUIET` in the member DTO. She is never told she is at risk —
that is an operational label, not a message. Everything else maps to `PAUSED`.

Internally we compute `roseHealth` (0–100) from invited / confirmed / attended /
no-show / declined / last attendance / admin notes. **`roseHealth` is never
serialized to any member-facing API response.** Enforce with a DTO mapper, not
by remembering.

Weighting principle:

- Declining ahead of RSVP deadline: near-zero penalty. This is respectful behavior.
- Confirming then not arriving: heavy penalty. This is the only real offense.
- Long inactivity without invitations: no penalty.

The Rose object is hers forever. Access status is separate and mutable.
Never reclaim, never invalidate, never devalue the jewelry.

---

## 10. STEM MODEL

- One Rose → one Stem privilege → per event. Never transferable between events.
- She chooses him. We never surface a list of men to her.
- Stem credentials are event-scoped and expire at event end. Old bracelets die.
- Every event carries an `editionMark` (leaf / thorn / stamp / cord variation)
  stored on the event and stamped onto each `StemCredential`.
- A Stem sees only: event name, date, hours, her **first name**. Nothing else.
  No member number, no phone, no email, no last name, no other guests.

---

## 11. SECURITY BASELINE (non-negotiable)

- Argon2id password hashing. Never bcrypt-with-defaults, never SHA anything.
- OTP: 6 digits, 5-minute expiry, max 5 attempts, hashed at rest, single-use,
  rate-limited per phone AND per IP.
- Door codes: 4 digits, valid only within the event window, single-use.
- CSRF on all mutations. httpOnly + SameSite=Lax + Secure session cookies.
- Role-based access: `MEMBER` · `DOOR` · `ADMIN` · `OWNER`. Enforced in a single
  server-side guard, never in the component.
- Every admin read of PII and every status change writes an `AuditLog` row.
- Delivery addresses and phone numbers encrypted at rest (app-level AES-GCM
  with a key from env, or pgcrypto). Never logged.
- No PII in URLs. Stem links use a 10-char opaque token, never a database id.
- Zod-validate every input at the server boundary. No exceptions.
- 18+ confirmation is stored with timestamp and IP as consent evidence.
- Consent records for email/SMS are separate booleans with timestamps.
- Data export + deletion endpoints exist from Phase 1.

---

## 12. STACK

Next.js (App Router) · TypeScript strict · Tailwind · PostgreSQL · Prisma ·
Auth.js (credentials + custom OTP step) · Zod · Resend (email) · Twilio (SMS) ·
Stripe (payments).

**All three externals sit behind interfaces** in `src/lib/providers/`:

```ts
interface SMSProvider {
  send(to: string, body: string): Promise<SendResult>;
}
interface EmailProvider {
  send(msg: EmailMessage): Promise<SendResult>;
}
interface PaymentProvider {
  createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
  verifyWebhook(raw: string, sig: string): Promise<PaymentEvent>;
}
```

Twilio/Resend/Stripe are implementations selected by env var. A `ConsoleProvider`
implementation is used in dev and in tests. Whish (Lebanon) will be added later
as another `PaymentProvider` — no calling code may reference Stripe directly.

---

## 13. ROUTES

```
/                       landing
/apply                  application
/apply/received         WE HAVE YOU.
/enter                  login
/enter/verify           OTP
/welcome                SHE'S YOURS. (post-approval, one-time token)
/rose                   member home
/rose/nights            YOUR NIGHTS
/rose/nights/[slug]     one night — RSVP + Stem
/rose/stem/[eventId]    register her Stem
/rose/delivery          WHERE SHOULD YOUR ROSE FIND YOU?
/rose/circle            WhatsApp community (gated)
/rose/refer             KNOW A ROSE?
/s/[token]              Stem public page (no auth)
/door                   staff door interface
/atelier                admin (never /admin — the URL is part of the world)
```

`/atelier` is additionally protected by an allowlist + role check.

---

## 14. INSTAGRAM / PUBLIC SILENCE

The public site never lists: prices, DJs, venue, capacity, calendar, FAQ.
Venue is revealed by private message ~24h before. There is a `venueRevealAt`
field; the venue string is never included in any response before that timestamp.
Enforce server-side.

---

## 15. HOW TO WORK IN THIS REPO

- Never redesign the world. Extend it.
- Never add a UI element that requires an explanation.
- Every new member-facing string must be added to `copy.ts` and pass the copy law.
- Prefer deleting a feature over explaining it.
- When unsure whether something is on-brand, ask: _would this exist in a private
  room in Beirut at 3AM, or does it exist because software usually has it?_

---

`0065`
