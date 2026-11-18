// Every tuning number, name and story beat in one place. Solmar Bay is a fictional
// sun-soaked coastal city: a road grid by the sea, a marina, a hotel strip, docks and
// a downtown of towers. Nothing here is copied from any commercial game.

export const STEP = 1 / 60;
export const SAVE_KEY = 'solmar-bay.save.v1';

export const CITY = {
  pitch: 52,          // distance between street centre lines
  streets: 7,         // streets each way: indices -3..3
  roadWidth: 13,
  block: 39,          // buildable block size between roads
  bound: 195,         // half-extent of the drivable city
  seaX: 205,          // the sea starts east of this x
};

export const PLAYER = {
  walkSpeed: 8,
  runSpeed: 13,
  radius: 0.55,
  health: 100,
  turnSpeed: 3.4,
};

export const CAR = {
  accel: 22,
  brake: 34,
  maxSpeed: 30,
  maxReverse: 9,
  steer: 2.1,
  drag: 0.6,
};

export const POLICE = {
  maxSpeed: 33,
  accel: 26,
  ramDamage: 8,
  spawnDistance: 55,
};

export const WANTED = {
  steal: 2,
  shoot: 1,
  hitPed: 1,
  decaySeconds: 26,
};

export const PALETTE = {
  sky: 0x87c5e8,
  sea: 0x1f7fb8,
  sand: 0xe8d29a,
  asphalt: 0x33363d,
  sidewalk: 0x9aa0a8,
  grass: 0x4d8f4a,
  buildingA: 0xd9c9a8,
  buildingB: 0xb8c4d4,
  buildingC: 0xe0a37e,
  buildingD: 0x8fb8a8,
};

export const CAR_MODELS = [
  { name: 'Marlin Sedan', color: 0x3a6fd8, speed: 27, value: 400 },
  { name: 'Coral Coupe', color: 0xd83a3a, speed: 31, value: 900 },
  { name: 'Palm Taxi', color: 0xf2c230, speed: 25, value: 250 },
  { name: 'Harbor Van', color: 0x7a8899, speed: 22, value: 350 },
  { name: 'Sunset Convertible', color: 0xe87ec0, speed: 29, value: 1200 },
  { name: 'Dune Pickup', color: 0x4a7a3a, speed: 26, value: 600 },
];

export const PED_NAMES = ['Mara', 'Tito', 'June', 'Sal', 'Bea', 'Omar', 'Lena', 'Kai', 'Rosa', 'Nico'];

// Missions: title, who gives it, the story beat, stages and reward. Each stage is a
// place to reach (and, for pickup stages, a short wait) before the next one opens.
export const MISSIONS = [
  {
    id: 'courier',
    title: 'Mission 1 — Sunset Courier',
    giver: 'Dana at the Marina',
    intro: 'Dana needs a parcel from the marina slip run to the Grand Palms hotel before sunset. Take any car — borrowed is fine.',
    reward: 300,
    stages: [
      { kind: 'goto', label: 'Pick up the parcel at the Marina', pos: [150, 0, -130], radius: 6 },
      { kind: 'goto', label: 'Deliver the parcel to the Grand Palms Hotel', pos: [-78, 0, 130], radius: 6 },
    ],
  },
  {
    id: 'collector',
    title: 'Mission 2 — The Collector',
    giver: 'Old Sal at the Docks',
    intro: 'Sal hid three lockboxes around the city before the PD swept the docks. Find all three and bring them in. The police will not like it.',
    reward: 500,
    stages: [
      { kind: 'collect', label: 'Find lockbox 1 of 3 — behind the market', pos: [26, 0, -78], radius: 5 },
      { kind: 'collect', label: 'Find lockbox 2 of 3 — by the park', pos: [-130, 0, -26], radius: 5 },
      { kind: 'collect', label: 'Find lockbox 3 of 3 — near the beach road', pos: [130, 0, 78], radius: 5 },
      { kind: 'goto', label: 'Return the lockboxes to Old Sal at the Docks', pos: [130, 0, -130], radius: 6 },
    ],
  },
  {
    id: 'heist',
    title: 'Mission 3 — Harbor Heist',
    giver: 'The Crew',
    intro: 'A Coral Coupe worth a fortune sits on the docks, guarded and alarmed. Steal it, outrun the PD at 3 stars, and bring it to the garage on Palm Row.',
    reward: 900,
    stages: [
      { kind: 'steal', label: 'Steal the Coral Coupe from the docks', pos: [150, 0, -104], radius: 5 },
      { kind: 'deliver', label: 'Escape the police and deliver the Coupe to the Palm Row garage', pos: [-26, 0, 78], radius: 7 },
    ],
  },
  {
    id: 'finale',
    title: 'Mission 4 — The Mayor\'s Gala',
    giver: 'Dana at the Marina',
    intro: 'One last job: lift the mayor\'s ledger from the gala at the Grand Palms, then lose the heat and meet Dana at the marina. Solmar Bay is yours after this.',
    reward: 1500,
    stages: [
      { kind: 'goto', label: 'Reach the Grand Palms gala', pos: [-78, 0, 130], radius: 6 },
      { kind: 'collect', label: 'Grab the mayor\'s ledger', pos: [-52, 0, 104], radius: 5 },
      { kind: 'goto', label: 'Lose the police, then meet Dana at the Marina', pos: [150, 0, -130], radius: 6 },
    ],
  },
];

export const STORY_INTRO =
  'Rex Marlowe, driver for hire. Four jobs stand between you and owning Solmar Bay. ' +
  'Follow the gold markers, earn the cash, and keep the PD off your tail.';
