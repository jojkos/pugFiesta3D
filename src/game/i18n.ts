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
    teamModeStripe: 'S pruhem',
    start: 'ZAHÁJIT HONITBU',
    bestSoFar: (n: number) => `Zatím nejvíc nalapaných: ${n} čubiček`,
    controlsMobileHint: 'Joystick · Kliknutí na BANG',
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

export function getStrings(lang: Lang): Strings {
  return STRINGS[lang];
}

export function pickRandomTagPhrase(lang: Lang): string {
  const list = STRINGS[lang].tagPhrases;
  return list[Math.floor(Math.random() * list.length)];
}
