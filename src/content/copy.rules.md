# THE COPY LAW

Every string a guest ever reads passes three gates, in order:

1. **Does this need to be said?** If no — delete it.
2. **Can it be three words instead of twelve?** If yes — do it.
3. **Can it be said without words?** If yes — do that.

## Rules

- All member-facing, staff-facing and transactional strings live in
  `src/content/copy.ts`. Nothing is hardcoded in a component — this is
  enforced by `src/content/copy.test.ts`.
- Canonical strings from `CLAUDE.md` §8 are used verbatim. Never paraphrase.
- New strings get a `// NEW` comment so they can be reviewed.
- Errors are short and human, never software:
  - wrong code → `NOT IT. TRY AGAIN.`
  - expired → `TOO LATE.`
  - rate limited → `SLOW DOWN.`
  - not found → `NOTHING HERE.`
  - "Something went wrong" is banned. So is "Please wait…", "successfully",
    and every word in `CLAUDE.md` §2.
- Nothing explains. If a string needs a second sentence, the screen is wrong.
- The chalk voice is UPPERCASE. The rare lowercase line
  (`We'll be in touch.`, `anything we should know?`) is deliberate — quiet,
  human, small. Do not add more without reason.

## Before adding a string, ask

_Would this be said out loud, once, in a private room in Beirut at 3AM?_
If it wouldn't — cut it.
