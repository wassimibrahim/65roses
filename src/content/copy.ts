// THE VOICE — every member-facing, staff-facing and transactional string in the product.
// Nothing is hardcoded in a component. Canonical strings from CLAUDE.md §8 are verbatim.
// Strings marked NEW were written here and must pass the three-gate law (see copy.rules.md).
// Templates use {placeholders}; fill() below renders them.

export const copy = {
  landing: {
    mark: "65",
    home: "BEIRUT.",
    enter: "ENTER",
    forRoses: "FOR ROSES.",
    everyRose: "EVERY ROSE GETS A ROSE.",
    whoGetsYourStem: "WHO GETS YOUR STEM?",
    hours: "00—05",
    requestAccess: "REQUEST ACCESS",
    privacy: "PRIVACY", // NEW
    terms: "TERMS", // NEW
  },

  apply: {
    fields: {
      firstName: "FIRST NAME", // NEW
      lastName: "LAST NAME", // NEW
      instagram: "@", // NEW
      email: "EMAIL", // NEW
      mobile: "MOBILE", // NEW
      dateOfBirth: "BORN", // NEW
      area: "WHERE?", // NEW
      howFound: "HOW DID YOU FIND US?",
      knowARose: "KNOW A ROSE?",
    },
    consent: {
      adult: "18+",
      houseRules: "HOUSE RULES", // NEW
      messaging: "WE MAY WRITE TO YOU", // NEW
      privacy: "PRIVACY", // NEW
    },
    submit: "REQUEST ACCESS",
    underage: "NOT YET.",
    errors: {
      required: "WE NEED THIS.", // NEW
      email: "NOT AN EMAIL.", // NEW
      phone: "NOT A NUMBER.", // NEW
      instagram: "JUST THE @.", // NEW
    },
  },

  applyReceived: {
    weHaveYou: "WE HAVE YOU.",
    inTouch: "We'll be in touch.",
  },

  welcome: {
    shesYours: "SHE'S YOURS.",
    youreARose: "YOU'RE A ROSE.",
    beingMade: "YOUR ROSE IS BEING MADE.",
    firstNight: "YOUR FIRST NIGHT IS COMING.",
    enter65: "ENTER 65",
  },

  account: {
    yourNumberIsYours: "YOUR NUMBER IS YOURS.",
    phoneTellsUs: "YOUR PHONE TELLS US IT'S YOU.",
    sendCode: "SEND CODE",
    forgot: "IF WE KNOW YOU, IT'S SENT.",
    out: "OUT", // NEW
    password: "PASSWORD", // NEW
    passwordAgain: "AGAIN", // NEW
    passwordShort: "LONGER.", // NEW
    passwordCommon: "NOT THAT ONE.", // NEW
    passwordMismatch: "NOT THE SAME.", // NEW
  },

  otp: {
    enterWhatWeSent: "ENTER WHAT WE SENT YOU.",
    resend: "AGAIN", // NEW
  },

  roseHome: {
    wellSeeYou: "WE'LL SEE YOU.",
    confirm: "CONFIRM",
    notThisTime: "NOT THIS TIME",
    chooseYourStem: "CHOOSE YOUR STEM",
    yourNights: "YOUR NIGHTS",
    roseIsQuiet: "YOUR ROSE IS QUIET.",
    wakeMyRose: "WAKE MY ROSE",
    awakeAgain: "YOUR ROSE IS AWAKE AGAIN.",
    nav: {
      nights: "NIGHTS", // NEW
      rose: "ROSE", // NEW
      circle: "CIRCLE", // NEW
      out: "OUT", // NEW
    },
  },

  night: {
    areYouComing: "ARE YOU COMING?",
    yes: "YES",
    notThisTime: "NOT THIS TIME",
  },

  rsvp: {
    confirmed: "WE'LL SEE YOU.",
    declined: "ANOTHER NIGHT.",
    savedForAnother: "WE'LL SAVE YOUR ROSE FOR ANOTHER NIGHT.",
    changedYourMind: "CHANGED YOUR MIND?",
    cantMakeIt: "CAN'T MAKE IT? TELL US.",
    full: "FULL.",
    nextTime: "WE'LL FIND YOU NEXT TIME.",
  },

  stem: {
    oneRoseOneStem: "ONE ROSE. ONE STEM.",
    yourDecision: "YOUR STEM. YOUR DECISION.",
    whoAreYouBringing: "WHO ARE YOU BRINGING?",
    howDoYouKnowHim: "HOW DO YOU KNOW HIM?",
    sendHimHisLink: "SEND HIM HIS LINK",
    chooseAgain: "CHOOSE AGAIN", // NEW — replace him until the deadline
    sms: "SMS", // NEW — the quiet secondary send
    heCantAskUs: "HE CAN'T ASK US.",
    askHer: "ASK HER.",
  },

  stemPublic: {
    chosen: "YOU'VE BEEN CHOSEN.",
    by: "BY:", // NEW
    confirmYourPlace: "CONFIRM YOUR PLACE",
    coverIt: "COVER IT.",
    youreHerStem: "YOU'RE HER STEM.",
    seeYouInside: "SEE YOU INSIDE.",
  },

  refer: {
    knowARose: "KNOW A ROSE?",
    sendHer: "SEND HER @",
    fromHere: "We'll take it from here.",
    anythingWeShouldKnow: "anything we should know?",
  },

  delivery: {
    whereShouldSheFindYou: "WHERE SHOULD YOUR ROSE FIND YOU?",
    send: "SEND",
    onHerWay: "SHE'S ON HER WAY.",
    sheFoundYou: "SHE FOUND YOU.",
    dontLoseHer: "DON'T LOSE HER.",
    forYou: "FOR YOU.",
    yours: "YOURS.",
    edit: "EDIT", // NEW
    recipient: "WHO SIGNS FOR HER", // NEW
    city: "CITY", // NEW
    area: "AREA", // NEW
    address: "ADDRESS", // NEW
    notes: "anything we should know?", // NEW — lowercase, a whisper
  },

  circle: {
    name: "ROSE CIRCLE",
    join: "JOIN",
    copy: "COPY", // NEW
  },

  nights: {
    yourNights: "YOUR NIGHTS",
  },

  // the only three words a member is ever shown — AT_RISK and the rest map in the DTO
  status: {
    active: "ACTIVE",
    quiet: "QUIET",
    paused: "PAUSED",
    pausedContact: "WRITE TO US.", // NEW
  },

  door: {
    rose: "ROSE", // NEW
    stem: "STEM", // NEW
    with: "WITH", // NEW
    rosesInside: "ROSES INSIDE", // NEW
    stemsInside: "STEMS INSIDE", // NEW
    total: "TOTAL", // NEW
    sendDoorCode: "SEND DOOR CODE", // NEW
    showUsItsYou: "SHOW US IT'S YOU.",
    youreIn: "YOU'RE IN.",
    notOnTheList: "NOT ON THE LIST.",
    alreadyIn: "ALREADY IN.",
    notPaid: "NOT PAID.",
    markPaid: "MARK PAID", // NEW
    askAHost: "ASK A HOST.",
    override: "OVERRIDE", // NEW
    manualEntry: "MANUAL ENTRY", // NEW
    search: "SEARCH", // NEW — phone, name, number
    back: "BACK", // NEW
    confirmed: "CONFIRMED", // NEW
    notConfirmed: "NO RSVP", // NEW
    paid: "PAID", // NEW
    bracelet: "BRACELET", // NEW
    reason: "REASON", // NEW
    name: "NAME", // NEW
    phone: "PHONE", // NEW
    add: "ADD", // NEW
    sent: "SENT.", // NEW
    offline: "NO SIGNAL", // NEW — a state, not an apology
    queued: "HELD", // NEW — check-ins waiting to reach us
    nothing: "NOTHING HERE.", // NEW
  },

  // staff-facing — the atelier is plain, dense, and still speaks quietly
  atelier: {
    title: "ATELIER", // NEW
    nav: {
      applications: "APPLICATIONS", // NEW
      events: "NIGHTS", // NEW — the atelier speaks the vocabulary too
      referrals: "REFERRALS", // NEW
      members: "ROSES", // NEW
      deliveries: "DELIVERIES", // NEW
      circle: "CIRCLE", // NEW
    },
    circle: {
      announcements: "ANNOUNCEMENTS", // NEW — we speak, she reads
      roses: "ROSES", // NEW — Roses speak to each other
      link: "LINK", // NEW
      rotate: "ROTATE", // NEW — the old one dies
      rotated: "ROTATED.", // NEW
      status: "STATUS", // NEW
      invited: "INVITED", // NEW
      joined: "JOINED", // NEW
      left: "LEFT", // NEW
      removed: "REMOVED", // NEW
      never: "NOT SET.", // NEW
      empty: "NOTHING HERE.",
    },
    members: {
      wakeQueue: "WAKE QUEUE", // NEW — she asked; someone answers
      wake: "WAKE", // NEW
      asked: "ASKED", // NEW
      number: "NUMBER", // NEW
      name: "NAME", // NEW
      status: "STATUS", // NEW
      health: "HEALTH", // NEW — staff only, never rendered to a Rose
      nights: "NIGHTS", // NEW
      lastSeen: "LAST SEEN", // NEW
      pause: "PAUSE", // NEW
      unpause: "UNPAUSE", // NEW
      empty: "NOTHING HERE.",
    },
    referrals: {
      invite: "INVITE", // NEW
      decline: "DECLINE", // NEW
      reviewing: "REVIEWING", // NEW
      link: "LINK", // NEW
      nights: "NIGHTS", // NEW — her attendance, inline
    },
    events: {
      create: "NEW NIGHT", // NEW
      name: "NAME", // NEW
      index: "INDEX", // NEW
      city: "CITY", // NEW
      date: "DATE", // NEW
      venue: "VENUE", // NEW
      address: "ADDRESS", // NEW
      notes: "NOTES", // NEW
      revealAt: "REVEAL AT", // NEW
      capacity: "CAPACITY", // NEW
      roses: "ROSES", // NEW
      stems: "STEMS", // NEW
      rsvpOpens: "RSVP OPENS", // NEW
      rsvpDeadline: "RSVP DEADLINE", // NEW
      stemsAllowed: "STEMS ALLOWED", // NEW
      stemPrice: "STEM PRICE", // NEW
      editionMark: "EDITION MARK", // NEW
      tables: "TABLES", // NEW
      tablesOutAt: "TABLES OUT AT", // NEW
      stats: {
        invited: "INVITED", // NEW
        confirmed: "CONFIRMED", // NEW
        declined: "DECLINED", // NEW
        noResponse: "NO RESPONSE", // NEW
        stemsRegistered: "STEMS REGISTERED", // NEW
        stemsPaid: "STEMS PAID", // NEW
      },
      stemsTable: {
        title: "STEMS", // NEW
        host: "WITH", // NEW
        refund: "REFUND", // NEW
      },
      invite: {
        title: "INVITATIONS", // NEW
        preview: "PREVIEW", // NEW
        send: "SEND", // NEW
        founding: "FOUNDING", // NEW
        invited: "INVITED", // NEW
      },
    },
    applications: {
      columns: {
        date: "DATE", // NEW
        name: "NAME", // NEW
        handle: "@", // NEW
        age: "AGE", // NEW
        city: "CITY", // NEW
        referral: "REFERRAL", // NEW
        status: "STATUS", // NEW
      },
      filters: {
        all: "ALL", // NEW
        pending: "PENDING", // NEW
        approved: "APPROVED", // NEW
        waitlist: "WAITLIST", // NEW
        declined: "DECLINED", // NEW
      },
      search: "SEARCH", // NEW
      approve: "APPROVE", // NEW
      waitlist: "WAITLIST", // NEW
      decline: "DECLINE", // NEW
      addNote: "ADD NOTE", // NEW
      copyDm: "COPY DM", // NEW
      copied: "ON YOUR CLIPBOARD.", // NEW
      number: "NUMBER", // NEW
      consent: "CONSENT", // NEW
      notes: "NOTES", // NEW
      trail: "TRAIL", // NEW
      welcome: "WELCOME LINK", // NEW
      empty: "NOTHING HERE.",
    },
    deliveries: {
      columns: {
        number: "NUMBER", // NEW
        member: "ROSE", // NEW
        area: "AREA", // NEW
        status: "STATUS", // NEW
        updated: "UPDATED", // NEW
        courier: "COURIER", // NEW
      },
      reveal: "REVEAL", // NEW — one click, one audit row
      manifest: "MANIFEST", // NEW
      print: "PRINT", // NEW
      advance: "ADVANCE", // NEW
      fail: "FAILED", // NEW
      reason: "REASON", // NEW
      courierRef: "TRACKING", // NEW
      save: "SAVE", // NEW
      selected: "SELECTED", // NEW
      replace: "REPLACE", // NEW
      replaceReason: "THEFT · DAMAGE · SAFETY", // NEW
      approve: "APPROVE", // NEW
      empty: "NOTHING HERE.",
    },
  },

  enter: {
    email: "EMAIL", // NEW
    password: "PASSWORD", // NEW
  },

  errors: {
    wrongCode: "NOT IT. TRY AGAIN.",
    failedLogin: "NOT IT.",
    expired: "TOO LATE.",
    rateLimited: "SLOW DOWN.",
    notFound: "NOTHING HERE.",
  },

  email: {
    applied: {
      subject: "65", // NEW
      lines: ["WE HAVE YOU.", "We'll be in touch."],
    },
    approval: {
      subject: "{memberNumber}",
      lines: ["SHE'S YOURS.", "YOU'RE A ROSE.", "YOUR NUMBER: {memberNumber}"],
      action: "ENTER 65",
      unsubscribe: "no more", // NEW — the one tiny required line
    },
    invitation: {
      subject: "{index}",
      lines: ["{index}", "{name}", "BEIRUT.", "00—05"],
      action: "ARE YOU COMING?",
    },
  },

  sms: {
    otp: "65 — {code}\nyours only.",
    invitation: "{index} — {name}. 00—05. {link}",
    doorCode: "{name}.\nYOUR CODE: {code}\nbring your phone.",
    venue: "{name}. {venue}", // NEW — the only message that ever carries the address
    stemLink: "{name}. 00—05.\n{link}",
    stemPaid: "{name}.", // NEW — her quiet notification: his first name, nothing else
    delivered: "SHE FOUND YOU.",
    missedYou: "WE MISSED YOU.",
    stillWithUs: "ARE YOU STILL WITH US?",
    roseQuiet: "YOUR ROSE IS QUIET.",
    awakeAgain: "YOUR ROSE IS AWAKE AGAIN.",
  },

  instagramDm: {
    approval: "YOU'RE A ROSE.\nYOUR NUMBER: {memberNumber}\n{welcomeUrl}",
  },
} as const;

export type Copy = typeof copy;

// render a template like "65 — {code}" with its values
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`);
}
