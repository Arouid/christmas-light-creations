// Everything the ad says and shows. Edit here (or in Remotion Studio's props panel, which
// starts from this object). Photo numbers are the ones in assets-source/ads/contact-sheet-index.txt;
// video/scripts/prepare-assets.mjs copies them into video/public/photos/<number>.jpg.
// focus: which point of the photo to keep in frame (fractions of width/height) when it's cropped.
// roofline: polylines (fractions) the design mock draws its light string along.

const data = {
  fps: 30,
  colors: {
    navy: '#050b1a',
    navyLight: '#0a1530',
    gold: '#ffcf4d',
    goldSoft: '#ffe08a',
    magenta: '#f038ee',
    green: '#5fe757',
    red: '#d7263d',
    white: '#f5f7fa',
  },
  photos: {
    switchOn: { number: 34, aspect: 2159 / 1486, focus: [0.52, 0.42] },
    headline: { number: 57, aspect: 2048 / 1263, focus: [0.5, 0.42] },
    estimate: { number: 60, aspect: 2048 / 1536, focus: [0.5, 0.45] },
    design: {
      number: 58,
      aspect: 2048 / 1536,
      focus: [0.5, 0.4],
      roofline: [
        [[0.094, 0.141], [0.478, 0.126], [0.489, 0.062], [0.7, 0.059], [0.767, 0.145], [0.889, 0.16]],
        [[0.02, 0.397], [0.124, 0.296], [0.367, 0.289], [0.506, 0.397]],
      ],
    },
    season: { number: 14, aspect: 4032 / 2268, focus: [0.5, 0.45] },
    offer: { number: 46, aspect: 2159 / 1214, focus: [0.5, 0.4] },
  },
  // Scene lengths in seconds. The composition's length is their sum (offer counts only when enabled).
  scenes: {
    switchOn: 4,
    headline: 4,
    estimate: 4,
    design: 4.5,
    season: 3.5,
    areas: 3,
    offer: 2,
    end: 4,
  },
  words: {
    headline: 'Christmas light installation',
    headlineSub: 'for homes and businesses around south Houston',
    estimateBig: '30',
    estimateUnit: 'min',
    estimateTitle: 'Free estimate',
    estimateSub: 'No ladder needed',
    designTitle: 'Design your lights online first',
    designUrl: 'christmas-light-creations.com/design',
    designButton: 'Add roofline',
    designDone: 'Looks like this',
    season: [
      { month: 'NOV', title: 'Installed', icon: 'bulb' },
      { month: 'DEC', title: 'Serviced all season', icon: 'wrench' },
      { month: 'JAN', title: 'Taken down', icon: 'box' },
    ],
    areasTitle: 'South Houston',
    areas: [
      { region: 'Pearland side', towns: ['Pearland', 'Friendswood', 'Brookside Village', 'League City', 'Webster'] },
      { region: 'Bay side', towns: ['Clear Lake', 'Pasadena', 'Deer Park', 'La Porte', 'Seabrook', 'El Lago', 'Kemah'] },
      { region: 'Galveston County & south', towns: ['Alvin', 'Manvel', 'Dickinson', 'Santa Fe', 'Texas City', 'Bacliff', 'San Leon', 'Galveston'] },
    ],
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
  // A licence-free music bed: drop the file into video/public/music/ and name it here (e.g. 'bed.mp3').
  // Empty = silent. Record the source and licence in assets-source/ads/video/README.md.
  music: { file: '', volume: 0.5 },
}

export default data
