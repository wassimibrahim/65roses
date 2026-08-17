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
