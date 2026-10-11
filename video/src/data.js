// Everything the ad says and shows. Edit here (or in Remotion Studio's props panel, which
// starts from this object). Photo numbers are the ones in assets-source/ads/contact-sheet-index.txt;
// video/scripts/prepare-assets.mjs copies them into video/public/photos/<number>.jpg.
// focus: which point of the photo to keep in frame (fractions of width/height) when it's cropped.
// tints: bulb-colour variants prepare-assets makes for the design mock ('cool', 'red', 'green').
// clip: optional real footage (file in assets-source/ads/clips/) shown instead of the photo.

const data = {
  fps: 30,
  colors: {
    navy: '#050b1a',
    navyLight: '#0a1530',
    navyMid: '#12214a',
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
    hero: { number: 34, aspect: 2159 / 1486, focus: [0.52, 0.42], clip: '' },
    estimate: { number: 57, aspect: 2048 / 1263, focus: [0.5, 0.42] },
    design: { number: 58, aspect: 2048 / 1536, focus: [0.5, 0.42], tints: ['cool', 'red'] },
    season: { number: 14, aspect: 4032 / 2268, focus: [0.5, 0.45] },
    offer: { number: 46, aspect: 2159 / 1214, focus: [0.5, 0.4] },
  },
  // Scene lengths in seconds. The composition's length is their sum (offer counts only when
  // enabled) minus the 8-frame cross-dissolves between scenes.
  scenes: {
    intro: 5.5,
    headline: 4,
    estimate: 3.5,
    design: 4.5,
    season: 3,
    areas: 3,
    offer: 2,
    end: 4,
  },
  words: {
    brand: 'Christmas Light Creations',
    brandSub: 'Pearland, TX · since 2011',
    headline: 'Christmas light installation',
    headlineSub: 'for homes and businesses around south Houston',
    estimateBig: '30',
    estimateUnit: 'min',
    estimateTitle: 'Free estimate',
    estimateSub: 'No ladder needed',
    designTitle: 'Design your lights online first',
    designUrl: 'christmas-light-creations.com/design',
    designPanelTitle: 'Your lights',
    designOptions: ['Roofline', 'Windows', 'Trees'],
    designColours: [
      { key: 'warm', label: 'Warm white', swatch: '#ffe6a8' },
      { key: 'cool', label: 'Cool white', swatch: '#dbe9ff' },
      { key: 'red', label: 'Red', swatch: '#ff3b30' },
    ],
    designButton: 'Get my free estimate',
    season: [
      { month: 'NOV', title: 'Installed', icon: 'bulb' },
      { month: 'DEC', title: 'Serviced all season', icon: 'wrench' },
      { month: 'JAN', title: 'Taken down', icon: 'box' },
    ],
    areasTitle: 'South Houston',
    areasSub: 'Where we install',
    // Real positions (longitude, latitude) and where the label sits: r = right, l = left,
    // a = above, b = below (combine, e.g. 'rb'). Pearland is home (the pin).
    areas: [
      { name: 'Pearland', lon: -95.286, lat: 29.5636, side: 'l', home: true },
      { name: 'Friendswood', lon: -95.201, lat: 29.5294, side: 'lb' },
      { name: 'Brookside Village', lon: -95.3177, lat: 29.5897, side: 'la' },
      { name: 'League City', lon: -95.0949, lat: 29.5075, side: 'lb' },
      { name: 'Webster', lon: -95.1183, lat: 29.5377, side: 'l' },
      { name: 'Clear Lake', lon: -95.0966, lat: 29.5733, side: 'la' },
      { name: 'Pasadena', lon: -95.2091, lat: 29.6911, side: 'l' },
      { name: 'Deer Park', lon: -95.1238, lat: 29.7052, side: 'a' },
      { name: 'La Porte', lon: -95.0194, lat: 29.6658, side: 'r' },
      { name: 'Seabrook', lon: -95.0255, lat: 29.5641, side: 'r' },
      { name: 'El Lago', lon: -95.045, lat: 29.5725, side: 'a' },
      { name: 'Kemah', lon: -95.0199, lat: 29.5427, side: 'rb' },
      { name: 'Alvin', lon: -95.2441, lat: 29.4238, side: 'lb' },
      { name: 'Manvel', lon: -95.358, lat: 29.4627, side: 'l' },
      { name: 'Dickinson', lon: -95.0513, lat: 29.4608, side: 'lb' },
      { name: 'Santa Fe', lon: -95.1058, lat: 29.378, side: 'lb' },
      { name: 'Texas City', lon: -94.9027, lat: 29.3838, side: 'rb' },
      { name: 'Bacliff', lon: -94.9908, lat: 29.5077, side: 'r' },
      { name: 'San Leon', lon: -94.933, lat: 29.4844, side: 'rb' },
      { name: 'Galveston', lon: -94.7977, lat: 29.3013, side: 'r' },
    ],
    // Landmarks drawn faintly for orientation (not served).
    landmarks: [{ name: 'Houston', lon: -95.3698, lat: 29.7604 }],
    // Galveston Bay, as a rough outline (lon, lat), drawn as water.
    bay: [[-94.99, 29.77], [-94.9, 29.77], [-94.82, 29.69], [-94.75, 29.57], [-94.71, 29.46], [-94.76, 29.34], [-94.88, 29.3], [-94.95, 29.4], [-94.99, 29.47], [-95.0, 29.53], [-95.03, 29.6], [-95.02, 29.7]],
    offerBig: '10%',
    offerSmall: 'OFF',
    offerLine: 'Installs done by October 31',
    offerMonth: 'OCT',
    offerDay: '31',
    phone: '281-819-0163',
    site: 'christmas-light-creations.com',
    endLine: 'Free 30-minute estimate',
  },
  // Turn off when the October offer ends: the scene is dropped and the video gets 2 s shorter.
  offer: { enabled: true },
  // Music bed (file in video/public/music/; source and licence in assets-source/ads/video/README.md).
  // startFrom: seconds into the track; the bed fades out over the last 2 s of the video.
  music: { file: 'carol-of-the-bells-juliush.mp3', volume: 0.6, startFrom: 0 },
  // Film look: grain strength (0 = off) and vignette strength.
  look: { grain: 0.07, vignette: 0.55 },
}

export default data
