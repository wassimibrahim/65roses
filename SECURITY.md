# SECURITY

What this system protects, from whom, and what happens to the data it holds.

`0065`

---

## 1. WHAT WE ARE PROTECTING

Not a balance and not a password. A list of women, where they live, what
nights they went to, and who they brought. In Beirut that list is the asset and
the liability at once, and the threat model follows from it.

**The worst outcome is not a breach of the site. It is one Rose learning
something about another Rose.** Every design decision below is downstream of
that sentence.

---

## 2. WHO WE DEFEND AGAINST

| Adversary | Has | Wants | Answer |
| --- | --- | --- | --- |
| A stranger with a browser | nothing | the venue, the list, a name | no public directory, no venue before the reveal, a 404 for everything they are not part of |
| A Stem with his link | one opaque token | her last name, her number, her address, the other guests | his page selects her first name and nothing else — asserted in `tests/privacy/stem-page.test.ts` |
| A Rose, signed in | her own session | another Rose's nights, status, or standing | no member-facing route takes a member id; every query is keyed by the session |
| A host at the door | a phone in a dark room, passed around | the roster, phone numbers, addresses | four digits of a phone, no addresses, no standing, one night, one city |
| An admin | the atelier | addresses, exports | address reveals and exports are owner-gated and every read writes a row |
| Someone holding the database | ciphertext and hashes | phones, addresses, door codes | AES-256-GCM at rest; codes are HMACs under a pepper held only in the environment |

---

## 3. IDENTITY AND ACCESS

**Passwords** are argon2id. Never bcrypt, never a bare SHA. A short list of
common passwords is refused at the boundary.

**Her phone is the second factor.** A password alone reaches nothing: the
session is not complete until a 6-digit code sent to her number is entered.
`requireVerifiedPhone` reads that flag from the database rather than from the
token, so verification — and revocation — take effect on the next request
rather than the next login.

**OTP**: 6 digits, 5-minute expiry, 5 attempts, hashed at rest under the
pepper, single-use, purpose-scoped (a login code cannot verify a phone), and
rate limited per phone *and* per IP.

**Door codes**: 4 digits, hashed under the pepper with a context binding them
to one person at one night, single-use, and valid only from two hours before
the doors to an hour after they close. Three wrong attempts rest that record
for sixty seconds — walking the 10,000-code space would take over a day per
person, and the correct code is refused during the lockout too.

**Roles** — `MEMBER` · `DOOR` · `ADMIN` · `OWNER` — are enforced in one
server-side guard, never in a component. The matrix is in
`src/lib/auth/guards.test.ts`.

- `DOOR` reaches `/door` and nothing else. A host's phone is the least
  protected device in the world; it is passed between people in a dark room.
- `ADMIN` reaches the atelier but not settings, not address exports, and not
  rose replacement approval.
- `OWNER` reaches everything.
- `/atelier` carries a second lock beyond the role: an email allowlist from the
  environment. An empty allowlist closes the atelier rather than opening it.

**Every refusal is a 404.** We do not confirm that a route exists to someone
who should not know it does.

---

## 4. DATA AT REST

Encrypted with AES-256-GCM under a key derived from `FIELD_ENCRYPTION_KEY`:

- `phone` — on members, applications and Stems
- `addressLine` — her delivery address
- `notes` — the delivery note, because "the blue door behind the pharmacy" is
  her address written another way

Encryption is deterministic (SIV-style: the IV is an HMAC of the plaintext) so
unique constraints and equality lookups still work. **Accepted trade-off:**
equal plaintexts produce equal ciphertexts, so someone holding the database can
see that two rows share a phone number without learning it.

Applied by a Prisma client extension, so it is on every path by construction
rather than by remembering. Query *directives* — `orderBy`, `distinct`,
aggregate selectors — are passed through untouched; their leaves are keywords,
not values.

Never encrypted, deliberately: `area` and `city`, which the atelier needs for
routing and which identify a neighbourhood rather than a door.

---

## 5. WHAT IS NEVER SENT

- **`roseHealth`** and every counter it is computed from. It is an operational
  judgement, not her data. Enforced by a whitelist DTO that picks fields and
  never spreads, with `FORBIDDEN_MEMBER_KEYS` asserted in tests.
- **`AT_RISK`** — mapped to `QUIET` before it reaches her. She is never told
  she is at risk; that is a label for us, not a message for her.
- **The venue**, before `venueRevealAt`. Enforced server-side in the event DTO,
  and structurally in the invitation, which is composed only from the index,
  the name and the link — there is no venue field for it to leak through.
- **Anyone else's anything.** There is no public member directory and no
  member-facing route that takes another person's id.

---

## 6. PII IN THE WRONG PLACES

- **Logs.** A phone reaches a log only as its last three digits
  (`•••••812`). `MessageLog` stores that redaction, never the number. A test
  scans every `console.*` call in the source for phones, addresses and codes.
- **URLs.** No PII in a path or a query string. Stem links use a 10-character
  opaque token from an alphabet with no `0`, `O`, `1`, `I` or `l`, never a
  database id.
- **The audit trail.** It records *that* an address was read and by whom, never
  the address. A walk-in keeps four digits of a phone, because the trail is a
  log and a full number never goes in a log.
- **Errors.** Every failure answers with one of a handful of fixed lines. No
  stack, no field name, no id, and nothing that distinguishes a duplicate
  application from a new one.

---

## 7. PAYMENTS

No file outside `src/lib/providers/payment` may import a payment SDK; ESLint
enforces it. Stripe, Whish, cash and comp are implementations behind one
interface.

**A payment becomes PAID only through a verified webhook.** The idempotency key
is an HMAC of the token and the event id, so a replayed webhook produces
exactly one payment and one credential.

**A lapsed payment changes nothing.** It does not alter her status, does not
stop her invitations, and never touches her Rose. It appears in the atelier for
a person to decide about. The module's own tests fail if it writes to her
profile.

---

## 8. THE AUDIT TRAIL

Every admin read of PII and every status change writes an `AuditLog` row with
the actor, the action, the entity, the before and after, the IP and the user
agent.

It is read-only in the interface and there is no delete path behind it. An
erasure does not touch it. **A log an operator can edit is not a log.**

---

## 9. RETENTION

| Data | Kept | Why |
| --- | --- | --- |
| Member profile | while she is a member | the membership |
| Delivery address | until erasure | the Rose has to reach her |
| Door codes | replaced each night, dead at the window's end | a code outside its night is not a code |
| Stem records | the night, then the credential expires | old bracelets die |
| `MessageLog` | indefinitely, redacted | proving what was sent, and to how many |
| `AuditLog` | indefinitely | accountability outlives the account |
| Payments | indefinitely | financial records |
| `RoseCredential` | forever | the object is hers |

---

## 10. HER RIGHTS

**Export** — `GET /api/me/data`, authenticated as her.

Returns everything we hold about her as JSON: her profile, her application and
its consent record, her address in full, her Rose, every night with its
outcome, every Stem she brought, every arrival, every delivery, every message
we sent her, her payments, and the referrals she made. It is the one response
in the system permitted to carry her address and her whole phone number,
because it is going to her. Never cached.

It does not include `roseHealth`. That is an operational judgement rather than
her personal data; if she asks about it, a person answers.

**Erasure** — `POST /api/me/delete`, confirmed by typing her own member number.

Immediate and irreversible.

*Removed:* her name, phone, email, instagram handle, area, the consent IP, her
delivery address (deleted outright), the note she wrote about her Stem, and the
notes on referrals she made. Her sessions are revoked and her password is
cleared; because `phoneVerified` is read from the database, a session issued a
minute earlier stops working on the next request rather than at the next login.

*Kept, and why:*

- **The audit trail.** It carries no name and it is the record of what was
  done, not of who she was.
- **Payments.** Financial records.
- **Her member number, retired.** It was never going to be given to anyone
  else, and her leaving does not change that.
- **Her Rose.** The object was always hers. Leaving does not make it ours.

Both paths write an audit row before they act.

---

## 11. SECRETS

`FIELD_ENCRYPTION_KEY`, `CODE_HASH_PEPPER`, `AUTH_SECRET`, `CRON_SECRET`,
`DATABASE_URL` and `ATELIER_ALLOWLIST` are server-only and never reach a client
bundle; a test asserts that no `"use client"` module reads anything but
`NEXT_PUBLIC_` values.

**Rotating `CODE_HASH_PEPPER` invalidates every outstanding OTP and door code.**
Do it between nights, never during one.

**Rotating `FIELD_ENCRYPTION_KEY` requires re-encrypting every affected row.**
There is no dual-key read path today; adding one is the prerequisite for a
rotation.

---

## 12. KNOWN LIMITS

Written down rather than discovered later.

1. **Deterministic encryption** reveals equality. Someone with the database can
   tell that two rows hold the same phone number without learning it.
2. **Offline door entries skip the code.** With no signal, the interface admits
   a Rose on the cached roster and records the entry as `OFFLINE`, which is
   legible afterwards as exactly what it was: a host who could not check a code
   and used the list instead. Shipping code material to a phone in a nightclub
   would have been the worse trade.
3. **The atelier allowlist is an environment variable.** Adding an admin is a
   deploy. That is deliberate for now.
4. **Rate limits are per-process rows in Postgres**, not a distributed counter.
   They are correct under normal load; a determined attacker with many IPs is
   slowed rather than stopped.
5. **Export and erasure are endpoints without a member-facing screen.** They
   work and they are tested; a Rose currently reaches them through a person.
   Giving them a screen is a design decision, not a technical one.

---

## 13. REPORTING

Something wrong here does not go in a public issue. It goes to the owner
directly.

`0065`
