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
  // The photoreal cottage (Gemini render of the logo, in assets-source/Gemini/): used by the 5-second
  // ad, the end card, the banner and the profile picture. Empty = the vector logo.
  cottageImage: 'Gemini_Generated_Image_1oiptx1oiptx1oip.jpg',
  // The 16:9 render: fills the wide (16:9) teaser and end card, cottage right of centre, words on
  // the dark sky to its left. Empty = the square render feathered in, as in the other shapes.
  cottageImageWide: 'Gemini_Generated_Image_9rw9cv9rw9cv9rw9.jpg',
  // true = the end card shows the cottage already lit (when it pops on earlier in the ad);
  // false = the end card flickers it on.
  endCardLit: false, // the cottage no longer pops on in the plan scene, so the end card does it
  // true = one closing card: the ask ("Surprise someone this year."), the offer and the estimate
  // pills, the number and the site on the cottage card, and the stone-house pitch scene is skipped
  // (Gemini's review 2026-10-13, via the owner: the two closing screens "stutter"). false = the
  // pitch scene over the stone house, then the number card.
  endCardAsk: true,
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
  // Trimmed 2026-10-13 to about 30 s (Gemini's review via the owner): was 8.5 / 2.6 / 12 / 4.5 / 5 / 4.
  scenes: {
    thread1: 7.6,
    plan: 2.4, // the time card (6.5 with three beats and the cottage)
    home: 11.4, // drive 2.5 s → reveal → reaction 1.2 s → door 2.6 s (6.5 without the clips)
    thread2: 4.2,
    pitch: 5, // skipped while endCardAsk is true
    end: 6, // the one closing card (4 when the pitch scene is on)
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
    // One time card now (owner 2026-10-13: the three-beat scene with the cottage "feels so forced
    // into it"). More entries bring the beats back, one after another.
    plan: [
      { time: 'Thursday 3:48 pm', line: 'Done. Timer set for dusk.' },
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
    // The campaign line (owner 2026-10-13: "We can keep a secret is the whole idea"): the headline of the
    // closing card, with the ask under it. Empty = the ask alone as the headline.
    tagline: 'We can keep a secret.',
  },
  // Turn off when the October offer ends: the offer line disappears from the closing scene.
  offer: { enabled: true },
  // Music bed: a file in assets-source/ads/music/ (copied to video/public/music/ by prepare-assets).
  // Source and licence go in assets-source/ads/video/README.md. Empty = silent.
  // startFrom: seconds into the track; the bed fades out over the last 2.5 s of the video.
  // Wintertime Waltz: quiet for 6 s under the first texts, builds through the time card, its 15 s peak
  // lands as the house appears (startFrom lines them up: house at ~12.2 s into the video since the trim; it was 13.2 s at startFrom 1.8). Others on disk: 'dance-of-the-sugar-plum-fairies-kevin-macleod-main-version-9984-01-46.wav'
  // (quiet 9 s, playful from 17 s), 'anticipation-and-joy-giulio-fazio-main-version-29590-00-58.wav' (swell at 22 s: startFrom 4.3).
  // To try another track without editing this: node scripts/render-all.mjs ad 16x9 --music=<file> --start=<s> --volume=<v> --suffix=<name>
  // Two more on disk (owner 2026-10-13, upbeat): 'a-little-christmas-ben-johnson-main-version-10155-02-35.wav'
  // (sleigh-bell stabs at 11.6 / 14.6 / 17.6 / 20.5 s, full band from 22 s; loud: volume ~0.25, startFrom 2.45 puts a
  // stab on the house) and 'guess-who-flew-in-for-christmas-sky-toes-main-version-02-23-10383.wav' (near-silent start,
  // builds, lifts at 17.8 s, hit at 20 s; volume ~0.45, startFrom 5.6 puts the lift on the house).
  music: { file: 'wintertime-waltz-albert-behar-main-version-46196-02-05.wav', volume: 0.6, startFrom: 2.9 },
  // Sound effects: files in assets-source/ads/sfx/. Empty = none. Each plays at its moment:
  // pop = a text bubble lands (both sides); typing = the dots start; lightsOn = the cottage flickers
  // on (plan beat 3, end card, the 5-second ad); lightsChime = a second layer as the glow settles;
  // car = a car door, just before the house appears (she gets out); reveal = the house opens out of the dark; ambience = a soft
  // loop under the whole video (wind, snow, night).
  sfx: {
    pop: 'notification-bubble-pop-message-epic-stock-media-1-00-00.mp3',
    typing: 'smartphone-typing-message-gfx-sounds-2-2-00-04.mp3',
    lightsOn: 'switch-turned-on-epic-stock-media-1-00-00.wav', // the click as the cottage comes on (the flicker file was ~20 dB too quiet)
    lightsChime: 'alert-magic-chime-pluck-albert-behar-harp-chime-pluck-1-0m06s.wav', // the lights coming alive, right after the click (owner's pick over the whoosh sweep)
    car: 'car-door-slammed-shut-fascinatedsound-1-00-01.wav', // she gets out, just before the house appears
    reveal: 'harp-chime-alert-magical-bright-bosnow-harp-logo-with-chimes-impact-upbeat-1-0m03s.mp3',
    ambience: 'wind-ambience-howling-during-snowstorm-vincentmets-1-00-20.mp3',
    // Beds under the real footage so it sounds like a place: inside the car (her driving, her
    // reaction) and outside at night (the house appearing, the closing house). Looped, faded.
    carInterior: 'windshield-wipers-jeff-kaale-1-00-07.wav', // rain on her windows in the car shots: wipers
    nightOutside: 'city-street-ambience-light-wind-traffic-jam-fx-quiet-park-ambience-on-a-spring-morning-1-0m13s.wav', // a quiet street at night
    bedVolume: 0.35,
    wipersVolume: 0.7, // the wipers under her driving shot, clearly audible (about level with the music)
    volume: 1.0, // effects level (owner 2026-10-13: louder, everything but the ambience)
    ambienceVolume: 0.12,
  },
  // How loud each effect is in the full ad, under the music, as a share of its level above (0 = off).
  // The 5-second ad has no music and uses the levels above as they are.
  // revealClick = the switch click as the house appears (the dusk timer), no harp (Gemini's note, 2026-10-13).
  adMix: { pop: 0.6, typing: 0, lightsOn: 0.85, car: 1, reveal: 0, revealClick: 0.45, ambience: 0, beds: 1 },
  // Footage: files in assets-source/ads/clips/ (MP4, 1080p or 4K). Empty = the scene uses its
  // graphic or photo instead. texting = hands on a phone at night, behind the first thread;
  // drive = headlights on a dark street / through the windshield, opens the 5:41 pm scene;
  // reaction = her face lighting up, closes the 5:41 pm scene; snow = night snow or bokeh lights,
  // behind the second thread; plan = behind the plan beats; end = behind the end card (a snow
  // overlay on black works best: the black is blended away).
  clips: {
    texting: 'warm-golden-bokeh-background-55540-1080.mp4', // owner 2026-10-13: bokeh lights rather than the hands on a phone
    drive: 'person-smiling-in-car-at-night-red-light-105845-1080.mp4', // owner's pick 2026-10-13: same shoot as the reaction clip
    door: 'person-closes-car-door-at-night-105855-1080.mp4', // she closes the car door (same shoot), with the slam
    reaction: 'person-in-car-on-rainy-night-105878-1080-#1.mp4', // her, in the car, turning to look out (same woman as the drive)
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
  clipStart: { reaction: 2.4, drive: 0.5, door: 0.9 },
  // The plan scene shows the cottage popping on beside the beats only when planCottage is true.
  planCottage: false,
  // The 5:41 pm scene: how long the drive clip plays, then the door clip, before the house appears,
  // and how long the reaction clip holds at the end (only when those clips are set).
  // Order: drive → the house → her reaction in the car → the door closes as she gets out (the slam
  // lands doorSlamAt seconds into that last shot).
  // secondSlamFromEnd: a second door closing this many seconds before the scene cuts away (two of
  // them got out). 0 = none. The slam file's bang sits 0.33 s in, so the sound lands that much later.
  home: { driveSeconds: 2.5, doorSeconds: 2.6, doorSlamAt: 0.6, reactionSeconds: 1.2, secondSlamFromEnd: 0.9 },
  // Film look: grain strength (0 = off), vignette strength, and the grade over every clip and
  // photo so footage from different shoots feels like one film: saturate/contrast (CSS filter),
  // lift = how far blacks rise toward navy (0–1), warm = gold in the mids and highlights (0–1).
  look: { grain: 0.07, vignette: 0.55, grade: { saturate: 0.8, contrast: 1.06, lift: 0.55, warm: 0.22 } },
}

export default data
