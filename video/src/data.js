// Everything the ads say and show. Edit here (or in Remotion Studio's props panel, which
// starts from this object). Photo numbers are the ones in assets-source/ads/contact-sheet-index.txt;
// video/scripts/prepare-assets.mjs copies them into video/public/photos/<number>.jpg.
// focus: which point of the photo to keep in frame (fractions of width/height) when it's cropped.
// clip: optional real footage (file in assets-source/ads/clips/) shown instead of the photo.

const data = {
  fps: 30,
  colors: {
    navy: '#050b1a',
    navyLight: '#0a1530',
    navyMid: '#12214a',
    navyBubble: '#1c2f63',
    gold: '#ffcf4d',
    goldSoft: '#ffe08a',
    magenta: '#f038ee',
    green: '#5fe757',
    red: '#d7263d',
    white: '#f5f7fa',
  },
  // Type: the site's fonts (Fraunces extrabold, tight tracking, for headlines; Inter for the rest).
  type: { displayWeight: 800, displayTracking: '-0.02em' },
  photos: {
    // The reveal: what she sees when she turns onto the street.
    home: { number: 32, aspect: 1024 / 576, focus: [0.5, 0.45], clip: '' }, // owner's pick 2026-10-13 (small file, upscaled)
    // Behind the closing line.
    pitch: { number: 34, aspect: 2159 / 1486, focus: [0.52, 0.42] },
  },
  // Scene 1 of the 5-second ad: when the cottage switches on (seconds into the scene).
  intro: { onAt: 2.0 },
  // The 5-second ad (Teaser compositions): the cottage switching on, no music.
  teaser: { seconds: 5, onAt: 2.0 },
  // The story ad (Ad compositions). Scene lengths in seconds; the length is their sum minus the
  // 8-frame cross-dissolves between scenes.
  scenes: {
    thread1: 8.5,
    plan: 6.5,
    home: 11, // drive 2.5 s → reveal → reaction 2.2 s (6.5 without the clips)
    thread2: 4.5,
    pitch: 5,
    end: 4,
  },
  // The story: a husband texts the business to install while his wife is at work on her birthday.
  story: {
    // Text thread, part 1. from: 'them' (the customer, left, dark) or 'us' (right, gold).
    // at: seconds into the scene when the bubble lands (typing dots show for ~1 s before).
    thread1Header: 'Tuesday 8:14 pm',
    thread1: [
      { from: 'them', at: 1.2, text: 'Can you do my house Thursday while she’s at work? It’s her birthday 🎂' },
      { from: 'us', at: 3.8, text: 'Done by 4. We’ll be gone before she’s home.' },
      { from: 'them', at: 6.0, text: '🤫 She has no idea.' },
    ],
    // The plan: three beats, one after another. The cottage lights come on with the last one.
    plan: [
      { time: 'Thursday 9:02 am', line: 'Everyone’s gone.' },
      { time: '9:30 am', line: 'We’re on the roof.' },
      { time: '3:48 pm', line: 'Done. Timer set for dusk.' },
    ],
    homeTime: '5:41 pm',
    homeLine: 'She’s home.',
    thread2Header: 'Thursday 5:52 pm',
    thread2: [
      { from: 'them', at: 0.8, text: 'She cried. Thank you.' },
      { from: 'us', at: 2.8, text: 'Happy birthday to her. 🎄' },
    ],
    pitchLine: 'Surprise someone this year.',
    pitchSub: 'Free 30-minute estimate. We can keep a secret.',
  },
  words: {
    brand: 'Christmas Light Creations',
    brandSub: 'Christmas lights, installed · Pearland, TX',
    brandSite: 'christmas-light-creations.com',
    offerLine: '10% off installs done by October 31',
    phone: '281-819-0163',
    site: 'christmas-light-creations.com',
    endLine: 'Free 30-minute estimate',
  },
  // Turn off when the October offer ends: the offer line disappears from the closing scene.
  offer: { enabled: true },
  // Music bed: a file in assets-source/ads/music/ (copied to video/public/music/ by prepare-assets).
  // Source and licence go in assets-source/ads/video/README.md. Empty = silent.
  // startFrom: seconds into the track; the bed fades out over the last 2.5 s of the video.
  music: { file: 'anticipation-and-joy-giulio-fazio-main-version-29590-00-58.wav', volume: 0.6, startFrom: 4.4 },
  // Sound effects: files in assets-source/ads/sfx/. Empty = none. Each plays at its moment:
  // pop = a text bubble lands (both sides); typing = the dots start; lightsOn = the cottage flickers
  // on (plan beat 3, end card, the 5-second ad); lightsChime = a second layer as the glow settles;
  // car = start of the 5:41 pm scene; reveal = the house opens out of the dark; ambience = a soft
  // loop under the whole video (wind, snow, night).
  sfx: {
    pop: 'notification-bubble-pop-message-epic-stock-media-1-00-00.mp3',
    typing: 'smartphone-typing-message-gfx-sounds-2-2-00-04.mp3',
    lightsOn: 'switch-turned-on-epic-stock-media-1-00-00.wav', // the click as the cottage comes on (the flicker file was ~20 dB too quiet)
    lightsChime: 'alert-magic-chime-pluck-albert-behar-harp-chime-pluck-1-0m06s.wav', // the lights coming alive, right after the click (owner's pick over the whoosh sweep)
    car: '',
    reveal: 'harp-chime-alert-magical-bright-bosnow-harp-logo-with-chimes-impact-upbeat-1-0m03s.mp3',
    ambience: 'wind-ambience-howling-during-snowstorm-vincentmets-1-00-20.mp3',
    volume: 0.8,
    ambienceVolume: 0.12,
  },
  // Footage: files in assets-source/ads/clips/ (MP4, 1080p or 4K). Empty = the scene uses its
  // graphic or photo instead. texting = hands on a phone at night, behind the first thread;
  // drive = headlights on a dark street / through the windshield, opens the 5:41 pm scene;
  // reaction = her face lighting up, closes the 5:41 pm scene; snow = night snow or bokeh lights,
  // behind the second thread; plan = behind the plan beats; end = behind the end card (a snow
  // overlay on black works best: the black is blended away).
  clips: {
    texting: 'warm-golden-bokeh-background-55540-1080.mp4', // owner 2026-10-13: bokeh lights rather than the hands on a phone
    drive: 'person-smiling-in-car-at-night-red-light-105845-1080.mp4', // owner's pick 2026-10-13: same shoot as the reaction clip
    reaction: 'person-in-car-on-rainy-night-105878-1080-#1.mp4', // her, in the car, turning to look out (owner's pick)
    snow: 'shimmering-gold-bokeh-lights-54198-1080.mp4',
    plan: 'falling-snowflakes-on-dark-bokeh-background-114577-1080.mp4', // behind the plan beats (owner: no still background between footage)
    end: 'falling-snowflakes-overlay-86734-1080.mp4', // real snow behind the end card (black blended away)
    snowOverlay: 'falling-snowflakes-overlay-86734-1080.mp4', // falling snow in front of the footage and photos (owner: "snow that looks real")
  },
  // How strong the falling snow is over the 5:41 pm scene and the closing shot (0 = none), and the
  // thinner layer that falls in front of the cottage and the words on the end card and the 5-second ad.
  snowOverlayOpacity: 0.6,
  snowFrontOpacity: 0.35,
  // Seconds to skip at the start of a clip (so the best stretch plays).
  clipStart: { reaction: 2.4, drive: 0.5 },
  // The 5:41 pm scene: how long the drive clip plays before the house appears, and how long the
  // reaction clip holds at the end (only when those clips are set).
  home: { driveSeconds: 2.5, reactionSeconds: 2.2 },
  // Film look: grain strength (0 = off), vignette strength, and the grade over every clip and
  // photo so footage from different shoots feels like one film: saturate/contrast (CSS filter),
  // lift = how far blacks rise toward navy (0–1), warm = gold in the mids and highlights (0–1).
  look: { grain: 0.07, vignette: 0.55, grade: { saturate: 0.8, contrast: 1.06, lift: 0.55, warm: 0.22 } },
}

export default data
