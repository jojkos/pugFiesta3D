export type Lang = 'cs' | 'en';

export const DEFAULT_LANG: Lang = 'cs';
export const SUPPORTED_LANGS: Lang[] = ['cs', 'en'];

const cs = {
  controls: {
    enableSound: 'Zapnout zvuk',
    muteSound: 'Ztlumit zvuk',
    pause: 'Pauza',
    resume: 'Pokračovat',
    dash: 'BANG',
    fullscreen: 'Celá obrazovka',
  },
  countdownGo: 'JEDEM!',
  menu: {
    eyebrow: 'mopsí orgie',
    lede: 'Silnější pes mrdá, tak vyraž obskočit co nejvíc čubiček!',
    teamBadgeLabel: (name: string) => `Vybrat tým ${name}`,
    teamCustom: 'Vlastní',
    teamTuning: 'Doladění',
    teamPrimaryLabel: 'Barva',
    teamAccentLabel: 'Pruh',
    teamModeSolid: 'Jednobarevný',
    teamModeStripe: 'Dvoubarevný',
    start: 'ZAHÁJIT HONITBU',
    bestSoFar: (n: number) => `Zatím nejvíc nalapaných: ${n} čubiček`,
    controlsMobileHint: 'Joystick · Kliknutí na BANG',
    install: 'Nainstalovat',
    installed: 'Nainstalováno',
  },
  install: {
    title: 'Přidat na plochu',
    intro: 'Spustíš mopsy jedním klepnutím a poběží jako appka — bez baru prohlížeče.',
    iosHeading: '🍎 iPhone / iPad (Safari)',
    iosBody: 'Klepni na ikonu Sdílet (čtvereček se šipkou) → "Přidat na plochu" → Přidat.',
    androidHeading: '🤖 Android (Chrome)',
    androidBody: 'V menu prohlížeče (︙) zvol "Přidat na plochu" nebo "Nainstalovat aplikaci".',
    desktopHeading: '🖥️ Počítač',
    desktopBody: 'V Chrome/Edge klikni v adresním řádku na ikonu instalace (︙ → Nainstalovat).',
    close: 'Zavřít',
  },
  iosNudge: {
    title: 'Nainstaluj na plochu',
    body: 'Safari neumí fullscreen z webu. Přidej hru na plochu a hraj naplno, bez baru.',
    cta: 'Jak na to',
    dismiss: 'Možná později',
  },
  pause: {
    eyebrow: 'pauza',
    title: 'Vydejchej se',
    lede: 'Lízni si pivko a vrať se honit dál.',
    resume: 'Šup zpátky!',
  },
  results: {
    eyebrow: 'a je hotovo',
    suffix: 'nalapaných',
    newBest: 'NOVÝ REKORD — mopsí král!',
    tryAgain: 'Štěkals, ale nekousal.',
    best: 'Rekord',
    pace: 'Tempo',
    paceUnit: '/s',
    again: 'JEŠTĚ JEDNOU!',
  },
  leaderboard: {
    title: 'Mopsíň slávy',
    empty: 'Zatím prázdno. Buď první mopsí legenda.',
    loading: 'Načítám…',
    error: 'Žebříček nedostupný.',
    rankHeader: '#',
    nameHeader: 'mops',
    scoreHeader: 'lapnutí',
    namePlaceholder: 'Mopsík',
    submit: 'Zapsat se',
    submitting: 'Zapisuju…',
    submitted: 'Zapsáno do síně slávy!',
    showButton: 'Mopsíň slávy',
    eyebrow: 'žebříček',
    back: 'Zpět do menu',
    you: 'TY',
  },
  mainMenu: 'Hlavní menu',
  rotate: {
    title: 'Otoč zařízení',
    body: 'Pug Banger Fiesta jede naležato. Otoč mobil bokem a běž do toho.',
  },
  help: {
    button: 'Jak na to',
    title: 'Jak na to',
    close: 'Zavřít',
    goalHeading: '🎯 Cíl',
    goalBody:
      'Máš 45 vteřin. Obskoč co nejvíce čubiček. Když trefíš víc čubiček naráz, je z toho trojka nebo grupáč. Trefa v brance je za dva body.',
    desktopHeading: '⌨️ Počítač',
    desktopBody:
      'WASD nebo šipky pro pohyb. Mezerník = BANG na nejbližšího mopsíka v dosahu.',
    mobileHeading: '📱 Mobil',
    mobileBody:
      'Levý joystick pohyb, pravé tlačítko BANG. Drž telefon naležato.',
    iosHeading: '🍎 iPhone fullscreen',
    iosBody:
      'Safari fullscreen na iOS nejde z webu. Sdílet → "Přidat na plochu" → spustit z ikony. Pojede bez baru, jako appka.',
  },
  multiTagPhrases: {
    2: 'Trojka!',
    3: 'Grupáč!',
  } as Partial<Record<number, string>>,
  goalShout: 'Skóruje!',
  tagPhrases: [
    'štěká, ale nekouše',
    'utrhnem se ze řetězu',
    'má naštěkáno do boudy!',
    'silnější pes mrdá',
    'beng beng beng, jak rej koranteng',
    'vrtí ocasem, ta to chce',
    'to je psina',
    'viděl jsem, štěknul jsem, prcnul jsem',
    'hlídej si ocas, jdu na věc',
    'mrskej se ty čubičko!',
    'štěknem si',
    'epes rádes',
  ],
};

const en: typeof cs = {
  controls: {
    enableSound: 'Enable sound',
    muteSound: 'Mute sound',
    pause: 'Pause round',
    resume: 'Resume round',
    dash: 'DASH',
    fullscreen: 'Fullscreen',
  },
  countdownGo: 'LET\'S GOOO',
  menu: {
    eyebrow: 'pug orgy arcade',
    lede: 'Stick that snout out, time the pounce, hump the leaderboard.',
    teamBadgeLabel: (name: string) => `Pick team ${name}`,
    teamCustom: 'Custom',
    teamTuning: 'Tweak',
    teamPrimaryLabel: 'Color',
    teamAccentLabel: 'Stripe',
    teamModeSolid: 'Solid',
    teamModeStripe: 'Stripe',
    start: 'UNLEASH ME!',
    bestSoFar: (n: number) => `Top score so far · ${n} latched`,
    controlsMobileHint: 'Joystick · Tap to dash',
    install: 'Install',
    installed: 'Installed',
  },
  install: {
    title: 'Add to home screen',
    intro: 'Launch the pugs with one tap and play like an app — no browser chrome.',
    iosHeading: '🍎 iPhone / iPad (Safari)',
    iosBody: 'Tap the Share icon (square with an arrow) → "Add to Home Screen" → Add.',
    androidHeading: '🤖 Android (Chrome)',
    androidBody: 'Open the browser menu (︙) and pick "Add to Home screen" or "Install app".',
    desktopHeading: '🖥️ Desktop',
    desktopBody: 'In Chrome/Edge, click the install icon in the address bar (or ︙ → Install).',
    close: 'Close',
  },
  iosNudge: {
    title: 'Install on home screen',
    body: 'iOS Safari can\'t go fullscreen from the web. Add the game to your home screen and play with no browser chrome.',
    cta: 'How to',
    dismiss: 'Maybe later',
  },
  pause: {
    eyebrow: 'paused',
    title: 'Catch your breath, stud',
    lede: 'Tap resume when you\'re ready to chase ass again.',
    resume: 'Back at it!',
  },
  results: {
    eyebrow: 'round complete',
    suffix: 'latched',
    newBest: 'NEW PERSONAL BEST — top pug supreme!',
    tryAgain: 'Tighten that timing and go pug yourself.',
    best: 'Best',
    pace: 'Pace',
    paceUnit: '/s',
    again: 'ONE MORE!',
  },
  leaderboard: {
    title: 'Pug hall of fame',
    empty: 'Empty so far. Be the first legend.',
    loading: 'Loading…',
    error: 'Leaderboard unavailable.',
    rankHeader: '#',
    nameHeader: 'pug',
    scoreHeader: 'latched',
    namePlaceholder: 'Pug master',
    submit: 'Submit',
    submitting: 'Submitting…',
    submitted: 'You\'re on the board!',
    showButton: 'Hall of fame',
    eyebrow: 'leaderboard',
    back: 'Back to menu',
    you: 'YOU',
  },
  mainMenu: 'Main menu',
  rotate: {
    title: 'Rotate your device',
    body: 'Pug Banger Fiesta plays best in landscape. Turn your phone sideways to start chasing.',
  },
  help: {
    button: 'How to play',
    title: 'How to play',
    close: 'Close',
    goalHeading: '🎯 Goal',
    goalBody:
      'You have 45 seconds. Pounce on as many pugs as possible. Dash takes a moment to recharge, so save it for pugs in range. Land on multiple pugs at once for a threesome or gangbang bonus. A latch inside the goal is worth double points.',
    desktopHeading: '⌨️ Desktop',
    desktopBody:
      'WASD or arrows to move. Space = DASH onto the nearest pug in range.',
    mobileHeading: '📱 Mobile',
    mobileBody:
      'Left joystick to move, right button to DASH. Keep the phone in landscape.',
    iosHeading: '🍎 iPhone fullscreen',
    iosBody:
      'iOS Safari can\'t go fullscreen from the web. Tap Share → "Add to Home Screen" → launch from the icon. It runs without browser chrome, like an app.',
  },
  multiTagPhrases: {
    2: 'Threesome!',
    3: 'Gangbang!',
  },
  goalShout: 'Score!',
  tagPhrases: [
    'Sit, stay... slay',
    'Hot dog incoming!',
    'Boss bitch',
    'Sniffed it, liked it, marked it',
    'Wiggle wiggle wiggle',
    'Scooby dooby doo',
    'Go pug yourself',
    'Who let the dogs out',
    'doggy style',
    'Certified stud magnet',
    'Not in heat, just hot as hell',
    'hump first, ask names later',
    'No leash, no shame, all stamina',
  ],
};

export const STRINGS = { cs, en } as const;

export type Strings = typeof cs;

export function getStrings(lang: Lang, isKidFriendly = false): Strings {
  const base = STRINGS[lang];
  if (!isKidFriendly) {
    return base;
  }

  // Sanitized overrides for kid-friendly mode
  if (lang === 'en') {
    return {
      ...base,
      menu: {
        ...base.menu,
        eyebrow: 'pug party arcade',
        lede: 'Stick that snout out, time the pounce, hug the leaderboard.',
        bestSoFar: (n: number) => `Top score so far · ${n} hugged`,
      },
      pause: {
        ...base.pause,
        title: 'Catch your breath, master',
        lede: 'Tap resume when you\'re ready to chase high scores again.',
      },
      results: {
        ...base.results,
        suffix: 'hugged',
        tryAgain: 'Tighten that timing and keep on hugging!',
      },
      leaderboard: {
        ...base.leaderboard,
        scoreHeader: 'hugged',
      },
      help: {
        ...base.help,
        goalBody: 'You have 45 seconds. Hug as many pugs as possible. Dash takes a moment to recharge, so save it for pugs in range. Land on multiple pugs at once for a double or triple hug bonus. A hug inside the goal is worth double points.',
      },
      multiTagPhrases: {
        2: 'Double Hug!',
        3: 'Pug Party!',
      },
      tagPhrases: [
        'Sit, stay... play!',
        'Hot dog incoming!',
        'Boss pup',
        'Sniffed it, liked it, marked it',
        'Wiggle wiggle wiggle',
        'Scooby dooby doo',
        'You are awesome!',
        'Who let the dogs out',
        'Cuddle supreme',
        'No leash, no shame, all fun',
      ],
    };
  } else {
    // cs - Czech
    return {
      ...base,
      menu: {
        ...base.menu,
        eyebrow: 'mopsí párty',
        lede: 'Vyraž ven a obejmi co nejvíce mopsích kamarádů!',
        start: 'ZAHÁJIT HRU',
        bestSoFar: (n: number) => `Zatím nejvíc obejmutých: ${n} kamarádů`,
      },
      pause: {
        ...base.pause,
        lede: 'Dej si limču a pojď si zase hrát.',
      },
      results: {
        ...base.results,
        suffix: 'obejmutých',
        tryAgain: 'Haf haf! Zkus to znovu!',
      },
      leaderboard: {
        ...base.leaderboard,
        scoreHeader: 'objetí',
      },
      help: {
        ...base.help,
        goalBody: 'Máš 45 vteřin. Obejmi co nejvíce mopsíků. Když trefíš víc mopsíků naráz, získáš bonus za kombo. Trefa v brance je za dva body.',
      },
      multiTagPhrases: {
        2: 'Dvojité objetí!',
        3: 'Mopsí párty!',
      },
      tagPhrases: [
        'štěká, ale nekouše',
        'utrhnem se ze řetězu',
        'má naštěkáno do boudy!',
        'beng beng beng',
        'vrtí ocasem, má radost',
        'to je psina',
        'hlídej si ocas, jdu na věc',
        'mopsí kamarád!',
        'štěknem si',
        'epes rádes',
      ],
    };
  }
}

export function pickRandomTagPhrase(lang: Lang, isKidFriendly = false): string {
  const strings = getStrings(lang, isKidFriendly);
  const list = strings.tagPhrases;
  return list[Math.floor(Math.random() * list.length)];
}

