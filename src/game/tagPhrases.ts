export const TAG_PHRASES = [
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
];

export function pickRandomTagPhrase() {
  return TAG_PHRASES[Math.floor(Math.random() * TAG_PHRASES.length)];
}
