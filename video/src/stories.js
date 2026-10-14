// The "We can keep a secret" ads: named cuts built from the same pieces as the story ad. Each
// entry overrides data.js one level deep (scenes, story, home, music, adMix, endCard), so the
// words, the timings and the sound of every cut live here; everything else comes from data.js.
// Every cut ends on the same card, the same way: the cottage pops on, the line lands, the number.
// Compositions: <Name>16x9 / 9x16 / 1x1 (Root.jsx); files: clc-<file>-<shape>.mp4 (render-all.mjs).

export const STORIES = {
  // 6 s, the YouTube bumper (6 s max): one bubble, then the card. No music: the pop, the switch
  // click and the harp carry it, at the 5-second ad's levels.
  bumper: {
    label: 'We can keep a secret · 6 s bumper',
    file: 'clc-bumper-6s',
    scenes: { thread1: 2.6, plan: 0, home: 0, thread2: 0, ask: 0, pitch: 0, end: 3.67 },
    story: { thread1Header: '', thread1: [{ from: 'them', at: 1.0, text: '🤫 She has no idea.' }] },
    endCard: { compact: true }, // the line, the number, the site; the words land faster
    music: { file: '' },
    adMix: { pop: 1, typing: 0, lightsOn: 1, car: 0, reveal: 0, revealClick: 0, ambience: 0, beds: 0 },
  },
  // 15 s, the non-skippable slot (15 s max): two texts, her in the car, the house opens out of the
  // dark, "She's home.", the ask card, the closing card. The music's first swell lands on the house.
  short: {
    label: 'We can keep a secret · 15 s story',
    file: 'clc-short-15s',
    scenes: { thread1: 4.2, plan: 0, home: 6.4, thread2: 0, ask: 1.6, pitch: 0, end: 3.6 },
    story: {
      thread1: [
        { from: 'them', at: 1.0, text: 'Can you do my house Thursday while she’s at work? It’s her birthday 🎂' },
        { from: 'us', at: 3.0, text: 'Done by 4. We’ll be gone before she’s home.' },
      ],
    },
    home: { driveSeconds: 1.6, reactionSeconds: 0, doorSeconds: 0, secondSlamFromEnd: 0 },
    music: { startFrom: 8.7 }, // Sugar Plum's first swell (14.5 s in the file) as the house appears (5.7 s in); the waltz: 3.8
  },
  // 15 s, the humorous one (owner's clip, 2026-10-13): a perfume-ad close-up, he whispers, the
  // words land one at a time: "I booked the lights." Her eyes open, the smile. Cut: the house opens
  // out of the dark with the timer's click, then the card. The joke: her reaction is to a chore.
  whisper: {
    label: 'We can keep a secret · the whisper (15 s)',
    file: 'clc-whisper-15s',
    scenes: { whisper: 6.3, thread1: 0, plan: 0, home: 4.3, thread2: 0, ask: 0, pitch: 0, end: 4.93 },
    story: { whisperLine: 'I booked the lights.', whisperAt: 1.4, whisperStep: 0.55, homeTime: '', homeLine: '' },
    clips: { whisper: 'intimate-whisper-4k.mp4', drive: '' },
    clipStart: { whisper: 0 },
    home: { driveSeconds: 0, reactionSeconds: 0, doorSeconds: 0, secondSlamFromEnd: 0 },
    endCard: { classy: true }, // the perfume-ad close: the lights come up slowly, the line, the name small, the site and number quiet
    adMix: { lightsOn: 0 }, // no switch, no harp at the close (owner): the music alone
    music: { startFrom: 1.7 }, // Sugar Plum's quiet celesta under the whisper; its rise under the house; the 14.5 s swell on the card's switch-on
  },
}

// data.js with one cut's overrides laid over it (one level deep for objects).
export function withStory(base, over) {
  const out = { ...base }
  for (const [k, v] of Object.entries(over)) {
    const plain = (x) => x && typeof x === 'object' && !Array.isArray(x)
    out[k] = plain(v) && plain(base[k]) ? { ...base[k], ...v } : v
  }
  return out
}

export const storyId = (name) => name.charAt(0).toUpperCase() + name.slice(1)
