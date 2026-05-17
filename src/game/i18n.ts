export type Lang = 'cs' | 'en';

export const DEFAULT_LANG: Lang = 'cs';
export const SUPPORTED_LANGS: Lang[] = ['cs', 'en'];

const cs = {
  hud: { score: 'skóre', time: 'čas', best: 'rekord' },
  controls: {
    enableSound: 'Zapnout zvuk',
    muteSound: 'Ztlumit zvuk',
    pause: 'Pauza',
    resume: 'Pokračovat',
    switchLanguage: 'Přepnout do angličtiny',
    dash: 'BANG',
  },
  combo: 'combo',
  countdownGo: 'JEDEM!',
  finalRush: 'FINIŠ, MAKEJ!',
  defaultTagBanner: 'NAVRTÁNO!',
  menu: {
    eyebrow: 'mopsí orgie',
    title: 'Pug Banger Fiesta',
    lede: 'Silnější pes mrdá, tak vyraž na čubičky!',
    grid: {
      desktopLabel: 'Počítač',
      desktopValue: 'WASD / Šipky',
      desktopHint: 'Mezerník = výpad',
      mobileLabel: 'Mobil',
      mobileValue: 'Stick + Výpad',
      mobileHint: 'Prsty na to',
      roundLabel: 'Kolo',
      roundValue: '45 vteřin',
      roundHint: 'Rozbij rekord',
      tagLabel: 'Lap',
      tagValue: 'Naval se na ně',
      tagHint: 'Drž sérii, ty zvíře',
    },
    jerseyColor: 'Barva dresu',
    jerseySwatchLabel: (color: string) => `Použít dres ${color}`,
    jerseyCustom: 'Vyber vlastní barvu',
    voiceLabel: 'Hlas mopslíka',
    languageLabel: 'Jazyk',
    start: 'ZAHÁJIT HONITBU',
    bestSoFar: (n: number) => `Zatím nejvíc nalapaných: ${n} čubiček`,
    controlsMobileHint: 'Joystick · Šťouch na SKOK',
  },
  pause: {
    eyebrow: 'pauza',
    title: 'Vydechni, prevíte',
    lede: 'Lízni si pivko a vrať se honit dál.',
    resume: 'Šup zpátky!',
    quit: 'Padám pryč',
  },
  results: {
    eyebrow: 'konec mejdanu',
    suffix: 'nalapaných',
    newBest: 'NOVÝ REKORD — mopsí král!',
    tryAgain: 'Přitvrď timing a jdi po nich, lemro.',
    best: 'Rekord',
    topCombo: 'Nejlepší combo',
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
    nameHeader: 'mopsl',
    scoreHeader: 'sebrání',
    namePrompt: 'Tvý jméno do žebříčku:',
    namePlaceholder: 'Mopslík',
    submit: 'Zapsat se',
    submitting: 'Zapisuju…',
    submitted: 'Zapsáno do síně slávy!',
    skip: 'Přeskočit',
    showButton: 'Mopsíň slávy',
    hideButton: 'Skrýt mopsíň slávy',
    eyebrow: 'žebříček',
    back: 'Zpět do menu',
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
      'Máš 45 vteřin. Loupežně přiskoč na co nejvíc čubiček. Trojka i čtyřka jsou plus.',
    desktopHeading: '⌨️ Počítač',
    desktopBody:
      'WASD nebo šipky pro pohyb. Mezerník = SKOK na nejbližšího mopslíka v dosahu.',
    mobileHeading: '📱 Mobil',
    mobileBody:
      'Levý joystick pohyb, pravé tlačítko SKOK. Drž landscape, jak ti říkáme.',
    tipsHeading: '💡 Triky',
    tipsBody:
      'Skok se nabíjí (~0,4 s). Když trefíš víc mopslů v jednom skoku, hra to počítá jako trojku/čtyřku a hraje speciální hlášku. Streaky drží combo.',
    iosHeading: '🍎 iPhone fullscreen',
    iosBody:
      'Safari fullscreen na iOS nejde z webu. Sdílet → "Přidat na plochu" → spustit z ikony. Pojede bez baru, jako appka.',
  },
  multiTagPhrases: {
    2: 'Trojka!',
    3: 'Čtyřka, ty prase!',
  } as Partial<Record<number, string>>,
  tagPhrases: [
    'štěká, ale nekouše',
    'Haf haf, a je po ptákách!',
    'utrhnem se ze řetězu',
    'o jé!',
    'má naštěkáno do boudy!',
    'silnější pes mrdá',
    'beng beng beng, jak rej koranteng',
    'vrtí ocasem, ta to chce',
    'to je psina',
    'dáme pac, příště zas',
    'viděl jsem, štěknul jsem, prcnul jsem',
    'hlídej si ocas, jdu na věc',
    'rozjedem to na plný tlapky',
    'mrskej se ty čubičko',
    'štěňata se sama neudělaj!',
    'štěknem si',
    'epes rádes',
  ],
};

const en: typeof cs = {
  hud: { score: 'score', time: 'time', best: 'best' },
  controls: {
    enableSound: 'Enable sound',
    muteSound: 'Mute sound',
    pause: 'Pause round',
    resume: 'Resume round',
    switchLanguage: 'Switch to Czech',
    dash: 'DASH',
  },
  combo: 'combo',
  countdownGo: 'LET\'S GOOO',
  finalRush: 'FINAL RUSH!',
  defaultTagBanner: 'LATCHED!',
  menu: {
    eyebrow: 'pug orgy arcade',
    title: 'Pug Banger Fiesta',
    lede: 'Stick that snout out, time the pounce, hump the leaderboard.',
    grid: {
      desktopLabel: 'Desktop',
      desktopValue: 'WASD / Arrows',
      desktopHint: 'Space = pounce',
      mobileLabel: 'Mobile',
      mobileValue: 'Stick + Pounce',
      mobileHint: 'Thumb friendly',
      roundLabel: 'Round',
      roundValue: '45 seconds',
      roundHint: 'Smash the record',
      tagLabel: 'Latch',
      tagValue: 'Pounce on impact',
      tagHint: 'Hold the combo, freak',
    },
    jerseyColor: 'Jersey color',
    jerseySwatchLabel: (color: string) => `Use ${color} jersey`,
    jerseyCustom: 'Pick custom jersey color',
    voiceLabel: 'Pug voice',
    languageLabel: 'Language',
    start: 'UNLEASH ME!',
    bestSoFar: (n: number) => `Top score so far · ${n} latched`,
    controlsMobileHint: 'Joystick · Tap to dash',
  },
  pause: {
    eyebrow: 'paused',
    title: 'Catch your breath, stud',
    lede: 'Tap resume when you\'re ready to chase ass again.',
    resume: 'Back at it!',
    quit: 'Bail out',
  },
  results: {
    eyebrow: 'round complete',
    suffix: 'latched',
    newBest: 'NEW PERSONAL BEST — top pug supreme!',
    tryAgain: 'Tighten that timing and go pug yourself.',
    best: 'Best',
    topCombo: 'Top combo',
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
    namePrompt: 'Name for the leaderboard:',
    namePlaceholder: 'Pug master',
    submit: 'Submit',
    submitting: 'Submitting…',
    submitted: 'You\'re on the board!',
    skip: 'Skip',
    showButton: 'Hall of fame',
    hideButton: 'Hide hall of fame',
    eyebrow: 'leaderboard',
    back: 'Back to menu',
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
      'You have 45 seconds. Pounce on as many pugs as possible. Catching 2 or 3 at once counts extra.',
    desktopHeading: '⌨️ Desktop',
    desktopBody:
      'WASD or arrows to move. Space = DASH onto the nearest pug in range.',
    mobileHeading: '📱 Mobile',
    mobileBody:
      'Left joystick to move, right button to DASH. Keep the phone in landscape.',
    tipsHeading: '💡 Tips',
    tipsBody:
      'Dash has a short cooldown (~0.4 s). Land on multiple pugs in a single dash to trigger a threesome / foursome callout. Quick consecutive tags stack the combo.',
    iosHeading: '🍎 iPhone fullscreen',
    iosBody:
      'iOS Safari can\'t go fullscreen from the web. Tap Share → "Add to Home Screen" → launch from the icon. It runs without browser chrome, like an app.',
  },
  multiTagPhrases: {
    2: 'Threesome!',
    3: 'Foursome, you freak!',
  },
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
