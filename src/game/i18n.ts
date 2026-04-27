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
    dash: 'SKOK',
  },
  combo: 'combo',
  countdownGo: 'TEĎ',
  finalRush: 'finiš',
  defaultTagBanner: 'Sebráno!',
  menu: {
    eyebrow: 'arkádová honička',
    title: 'Pug Fiesta',
    lede: 'Stříhej úhel. Načasuj skok. Naval co nejvíc, než dojde čas.',
    grid: {
      desktopLabel: 'Počítač',
      desktopValue: 'WASD / Šipky',
      desktopHint: 'Mezerník = skok',
      mobileLabel: 'Mobil',
      mobileValue: 'Stick + Skok',
      mobileHint: 'Funguje na dotyk',
      roundLabel: 'Kolo',
      roundValue: '45 sekund',
      roundHint: 'Překonej rekord',
      tagLabel: 'Sebrání',
      tagValue: 'Skoč na ně',
      tagHint: 'Drž sérii',
    },
    jerseyColor: 'Barva dresu',
    jerseySwatchLabel: (color: string) => `Použít dres ${color}`,
    jerseyCustom: 'Vyber vlastní barvu',
    voiceLabel: 'Hlas mopslíka',
    languageLabel: 'Jazyk',
    start: 'HRAJ',
    bestSoFar: (n: number) => `Nejlepší zatím · ${n} sebrání`,
  },
  pause: {
    eyebrow: 'pauza',
    title: 'Vydechni',
    lede: 'Pokračuj, až budeš připravený honit dál.',
    resume: 'Pokračovat',
  },
  results: {
    eyebrow: 'konec kola',
    suffix: 'sebrání',
    newBest: 'Nový rekord — příště ho překonej.',
    tryAgain: 'Přitvrď timing a jdi po nich.',
    best: 'Rekord',
    topCombo: 'Nejlepší combo',
    pace: 'Tempo',
    paceUnit: '/s',
    again: 'HRÁT ZNOVU',
  },
  rotate: {
    title: 'Otoč zařízení',
    body: 'Pug Fiesta jede naležato. Otoč mobil bokem a běž do toho.',
  },
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
  countdownGo: 'GO',
  finalRush: 'final rush',
  defaultTagBanner: 'Nice latch',
  menu: {
    eyebrow: 'arcade chase',
    title: 'Pug Fiesta',
    lede: 'Cut the angle. Time the pounce. Stack tags before the clock dies.',
    grid: {
      desktopLabel: 'Desktop',
      desktopValue: 'WASD / Arrows',
      desktopHint: 'Space to dash',
      mobileLabel: 'Mobile',
      mobileValue: 'Stick + Dash',
      mobileHint: 'Touch friendly',
      roundLabel: 'Round',
      roundValue: '45 seconds',
      roundHint: 'Beat your best',
      tagLabel: 'Tag',
      tagValue: 'Latch on impact',
      tagHint: 'Hold the combo',
    },
    jerseyColor: 'Jersey color',
    jerseySwatchLabel: (color: string) => `Use ${color} jersey`,
    jerseyCustom: 'Pick custom jersey color',
    voiceLabel: 'Pug voice',
    languageLabel: 'Language',
    start: 'Start round',
    bestSoFar: (n: number) => `Best so far · ${n} tags`,
  },
  pause: {
    eyebrow: 'paused',
    title: 'Take a breath',
    lede: 'Resume when you are ready to chase again.',
    resume: 'Resume',
  },
  results: {
    eyebrow: 'round complete',
    suffix: 'tags',
    newBest: 'New personal best — push it further next round.',
    tryAgain: 'Tighten the timing and beat the line.',
    best: 'Best',
    topCombo: 'Top combo',
    pace: 'Pace',
    paceUnit: '/s',
    again: 'Play again',
  },
  rotate: {
    title: 'Rotate your device',
    body: 'Pug Fiesta plays best in landscape. Turn your phone sideways to start chasing.',
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
