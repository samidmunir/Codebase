import { setting, type SettingsRegistry, type SettingsValues } from './definitions';

/**
 * Bump when a stored setting is renamed or changes meaning, and add a
 * migration. Adding or removing settings needs no bump: stored settings are
 * resolved leniently (new keys get defaults, unknown keys are dropped).
 */
export const SETTINGS_VERSION = 1;

/** Preferences saved to the player's account. They apply to every session. */
export const USER_SETTINGS = {
  // ---- Display -------------------------------------------------------------
  'display.brightness': setting.number({
    category: 'display',
    label: 'Scope brightness',
    description: 'Overall brightness of the radar scope.',
    min: 20,
    max: 100,
    step: 5,
    unit: '%',
    default: 100,
  }),
  'display.dataBlockStyle': setting.select({
    category: 'display',
    label: 'Data block style',
    description:
      'Expanded: callsign, altitude with full ground speed, then type and destination. STARS: the real two-line format, ground speed in tens of knots, time-shared with type and destination.',
    options: [
      { value: 'expanded', label: 'Expanded' },
      { value: 'stars', label: 'STARS' },
    ],
    default: 'expanded',
  }),
  'display.dataBlockFontSize': setting.number({
    category: 'display',
    label: 'Data block font size',
    description: 'Text size of aircraft data blocks.',
    min: 10,
    max: 20,
    step: 1,
    unit: 'px',
    default: 13,
  }),
  'display.historyTrailLength': setting.number({
    category: 'display',
    label: 'History trail length',
    description: 'Number of previous radar positions shown behind each target.',
    min: 0,
    max: 10,
    step: 1,
    default: 5,
  }),
  'display.leaderLineLength': setting.number({
    category: 'display',
    label: 'Leader line length',
    description: 'Length of the line connecting a target to its data block.',
    min: 0,
    max: 7,
    step: 1,
    default: 2,
  }),
  'display.headingVector': setting.boolean({
    category: 'display',
    label: 'Heading vector',
    description: 'Show a short line from each target in the direction it is heading.',
    default: true,
  }),
  'display.rangeRings': setting.boolean({
    category: 'display',
    label: 'Range rings',
    description: 'Show range rings around the scope center.',
    default: true,
  }),
  'display.rangeRingSpacingNm': setting.select({
    category: 'display',
    label: 'Range ring spacing',
    description: 'Distance between range rings.',
    options: [
      { value: 5, label: '5 NM' },
      { value: 10, label: '10 NM' },
      { value: 20, label: '20 NM' },
    ],
    default: 10,
  }),
  'display.sweepEffect': setting.boolean({
    category: 'display',
    label: 'Radar sweep effect',
    description: 'Show the animated radar sweep.',
    default: true,
  }),
  'display.uiAnimations': setting.select({
    category: 'display',
    label: 'UI animations',
    description: 'Amount of motion in menus and transitions.',
    options: [
      { value: 'full', label: 'Full' },
      { value: 'reduced', label: 'Reduced' },
      { value: 'off', label: 'Off' },
    ],
    default: 'full',
  }),
  'display.color.mapLines': setting.color({
    category: 'display',
    label: 'Map line color',
    description: 'Color of video map lines.',
    default: '#2c5b4b',
  }),
  'display.color.targets': setting.color({
    category: 'display',
    label: 'Target color',
    description: 'Color of aircraft targets you control.',
    default: '#4cf2a0',
  }),
  'display.color.dataBlocks': setting.color({
    category: 'display',
    label: 'Data block color',
    description: 'Color of data blocks for aircraft you control.',
    default: '#b8f5d8',
  }),

  // ---- Map layers ----------------------------------------------------------
  'map.runways': setting.boolean({
    category: 'map',
    label: 'Runways',
    description: 'Show airport runways.',
    default: true,
  }),
  'map.airportLabels': setting.boolean({
    category: 'map',
    label: 'Airport labels',
    description: 'Show airport identifiers.',
    default: true,
  }),
  'map.finalApproachCourses': setting.boolean({
    category: 'map',
    label: 'Final approach courses',
    description: 'Show extended centerlines for active runways.',
    default: true,
  }),
  'map.fixes': setting.boolean({
    category: 'map',
    label: 'Fixes',
    description: 'Show navigation fixes and their names.',
    default: true,
  }),
  'map.classB': setting.boolean({
    category: 'map',
    label: 'Class B airspace',
    description: 'Show New York Class B airspace boundaries.',
    default: true,
  }),
  'map.sectorBoundary': setting.boolean({
    category: 'map',
    label: 'Sector boundary',
    description: 'Show the boundary of your airspace.',
    default: true,
  }),
  'map.geography': setting.boolean({
    category: 'map',
    label: 'Coastline and rivers',
    description: 'Show coastlines, shorelines and major rivers.',
    default: true,
  }),
  'map.minimumVectoringAltitudes': setting.boolean({
    category: 'map',
    label: 'Minimum vectoring altitudes',
    description: 'Show MVA sectors and their minimum altitudes.',
    default: false,
  }),
  'map.basemap': setting.boolean({
    category: 'map',
    label: 'Real-world map',
    description: 'Show a real map (terrain, roads, cities) underneath the radar display.',
    default: false,
  }),
  'map.basemapOpacity': setting.number({
    category: 'map',
    label: 'Real-world map opacity',
    description: 'How strongly the real-world map shows through.',
    min: 5,
    max: 100,
    step: 5,
    unit: '%',
    default: 35,
  }),

  // ---- Audio ---------------------------------------------------------------
  'audio.masterVolume': setting.number({
    category: 'audio',
    label: 'Master volume',
    description: 'Overall volume of all sounds.',
    min: 0,
    max: 100,
    step: 5,
    unit: '%',
    default: 70,
  }),
  'audio.conflictAlert': setting.boolean({
    category: 'audio',
    label: 'Conflict Alert sound',
    description: 'Play an alert tone when aircraft are in conflict.',
    default: true,
  }),
  'audio.uiSounds': setting.boolean({
    category: 'audio',
    label: 'Interface sounds',
    description: 'Play subtle sounds for menus and selections.',
    default: true,
  }),

  // ---- Controls ------------------------------------------------------------
  'controls.zoomSensitivity': setting.number({
    category: 'controls',
    label: 'Zoom sensitivity',
    description: 'How fast the scroll wheel or trackpad zooms the scope.',
    min: 0.25,
    max: 3,
    step: 0.25,
    unit: 'x',
    default: 1,
  }),
  'controls.commandMenuStyle': setting.select({
    category: 'controls',
    label: 'Command menu style',
    description: 'How aircraft command menus open.',
    options: [
      { value: 'radial', label: 'Radial' },
      { value: 'list', label: 'List' },
    ],
    default: 'radial',
  }),
  'controls.keys.togglePause': setting.keybinding({
    category: 'controls',
    label: 'Pause / resume',
    description: 'Pause or resume the simulation.',
    default: 'Space',
  }),
  'controls.keys.simSpeedUp': setting.keybinding({
    category: 'controls',
    label: 'Increase sim speed',
    description: 'Switch to the next faster sim speed.',
    default: 'Period',
  }),
  'controls.keys.simSpeedDown': setting.keybinding({
    category: 'controls',
    label: 'Decrease sim speed',
    description: 'Switch to the next slower sim speed.',
    default: 'Comma',
  }),
  'controls.keys.zoomIn': setting.keybinding({
    category: 'controls',
    label: 'Zoom in',
    description: 'Zoom the scope in.',
    default: 'Equal',
  }),
  'controls.keys.zoomOut': setting.keybinding({
    category: 'controls',
    label: 'Zoom out',
    description: 'Zoom the scope out.',
    default: 'Minus',
  }),
  'controls.keys.centerScope': setting.keybinding({
    category: 'controls',
    label: 'Center scope',
    description: 'Recenter the scope on the airspace.',
    default: 'KeyC',
  }),
  'controls.keys.toggleCommsLog': setting.keybinding({
    category: 'controls',
    label: 'Toggle comms log',
    description: 'Show or hide the communications log.',
    default: 'KeyL',
  }),
  'controls.keys.toggleDepartureQueue': setting.keybinding({
    category: 'controls',
    label: 'Toggle departure queues',
    description: 'Show or hide the departure queue panel.',
    default: 'KeyQ',
  }),
  'controls.keys.toggleMapLayers': setting.keybinding({
    category: 'controls',
    label: 'Map layers',
    description: 'Open the map layers panel.',
    default: 'KeyM',
  }),
  'controls.keys.openSettings': setting.keybinding({
    category: 'controls',
    label: 'Open settings',
    description: 'Open the settings screen.',
    default: 'KeyO',
  }),
  'controls.keys.saveSession': setting.keybinding({
    category: 'controls',
    label: 'Save session',
    description: 'Save the session (the sim pauses first).',
    default: 'Shift+KeyS',
  }),
  'controls.keys.closeMenu': setting.keybinding({
    category: 'controls',
    label: 'Close menu',
    description: 'Close the open menu or panel.',
    default: 'Escape',
  }),
} satisfies SettingsRegistry;

/** Gameplay and realism settings, chosen when a session is created and saved with it. */
export const SESSION_SETTINGS = {
  // ---- Traffic (difficulty presets set these together) ---------------------
  'traffic.arrivalRatePerHour': setting.number({
    category: 'traffic',
    label: 'Arrival rate',
    description: 'Arrivals per hour into each airport.',
    min: 0,
    max: 40,
    step: 1,
    unit: '/hr per airport',
    default: 10,
  }),
  'traffic.departureRatePerHour': setting.number({
    category: 'traffic',
    label: 'Departure rate',
    description: 'Departures per hour from each airport.',
    min: 0,
    max: 40,
    step: 1,
    unit: '/hr per airport',
    default: 10,
  }),
  'traffic.maxDepartureQueue': setting.number({
    category: 'traffic',
    label: 'Max departure queue',
    description:
      'Departures that can wait at each airport. When full, new departures are held at the gate.',
    min: 1,
    max: 20,
    step: 1,
    default: 5,
  }),
  'traffic.fleetMix': setting.select({
    category: 'traffic',
    label: 'Airline and aircraft mix',
    description:
      "Realistic follows each airport's real traffic. Varied mixes in more airlines and types.",
    options: [
      { value: 'realistic', label: 'Realistic' },
      { value: 'varied', label: 'Varied' },
    ],
    default: 'realistic',
  }),

  // ---- Weather -------------------------------------------------------------
  'weather.windMode': setting.select({
    category: 'weather',
    label: 'Wind',
    description: 'Random generates realistic New York wind. Manual uses the values below.',
    options: [
      { value: 'random', label: 'Random (realistic)' },
      { value: 'manual', label: 'Manual' },
    ],
    default: 'random',
  }),
  'weather.manualWindDirectionDeg': setting.number({
    category: 'weather',
    label: 'Manual wind direction',
    description: 'Direction the wind blows from (magnetic). Used when wind is Manual.',
    min: 10,
    max: 360,
    step: 10,
    unit: '°',
    default: 310,
  }),
  'weather.manualWindSpeedKts': setting.number({
    category: 'weather',
    label: 'Manual wind speed',
    description: 'Wind speed. Used when wind is Manual.',
    min: 0,
    max: 40,
    step: 1,
    unit: 'kts',
    default: 12,
  }),
  'weather.maxTailwindKts': setting.number({
    category: 'weather',
    label: 'Max tailwind for active runways',
    description: 'Runways with more tailwind than this are not used.',
    min: 0,
    max: 15,
    step: 1,
    unit: 'kts',
    default: 5,
  }),
  'weather.maxCrosswindKts': setting.number({
    category: 'weather',
    label: 'Max crosswind for active runways',
    description: 'Runways with more crosswind than this are not used.',
    min: 10,
    max: 35,
    step: 1,
    unit: 'kts',
    default: 20,
  }),

  // ---- Separation ----------------------------------------------------------
  'separation.lateralNm': setting.number({
    category: 'separation',
    label: 'Lateral separation',
    description: 'Minimum horizontal distance between aircraft.',
    min: 2.5,
    max: 10,
    step: 0.5,
    unit: 'NM',
    default: 3,
  }),
  'separation.verticalFt': setting.number({
    category: 'separation',
    label: 'Vertical separation',
    description: 'Minimum vertical distance between aircraft.',
    min: 500,
    max: 2000,
    step: 100,
    unit: 'ft',
    default: 1000,
  }),
  'separation.conflictAlertLookaheadSec': setting.number({
    category: 'separation',
    label: 'Conflict Alert look-ahead',
    description:
      'How far ahead Conflict Alert predicts a loss of separation. 0 alerts only on actual losses.',
    min: 0,
    max: 120,
    step: 5,
    unit: 's',
    default: 40,
  }),

  // ---- Radar ---------------------------------------------------------------
  'radar.sweepIntervalSec': setting.number({
    category: 'radar',
    label: 'Radar update interval',
    description:
      'How often targets update on the scope. Real terminal radar updates about every 4.8 s.',
    min: 1,
    max: 12,
    step: 0.1,
    unit: 's',
    default: 4.8,
  }),

  // ---- Pilots --------------------------------------------------------------
  'pilots.responseDelaySec': setting.range({
    category: 'pilots',
    label: 'Pilot response delay',
    description:
      'How long pilots take to start following an instruction (random within this range).',
    min: 0,
    max: 15,
    step: 0.5,
    unit: 's',
    default: [2, 6],
  }),
  'pilots.readbackDetail': setting.select({
    category: 'pilots',
    label: 'Readback detail',
    description: 'How completely pilots read back instructions.',
    options: [
      { value: 'full', label: 'Full' },
      { value: 'brief', label: 'Brief' },
    ],
    default: 'full',
  }),

  // ---- Departures ----------------------------------------------------------
  'departures.radarContactAltitudeFt': setting.number({
    category: 'departures',
    label: 'Radar contact altitude',
    description: 'Altitude at which Tower transfers departures to you.',
    min: 500,
    max: 3000,
    step: 100,
    unit: 'ft',
    default: 1500,
  }),

  // ---- Approaches ----------------------------------------------------------
  'approaches.maxInterceptAngleDeg': setting.number({
    category: 'approaches',
    label: 'Max intercept angle',
    description: 'Largest angle to the localizer at which a pilot accepts the approach.',
    min: 10,
    max: 45,
    step: 5,
    unit: '°',
    default: 30,
  }),
  'approaches.interceptDistanceNm': setting.range({
    category: 'approaches',
    label: 'Intercept distance',
    description: 'Distance from the runway within which a pilot accepts the approach.',
    min: 3,
    max: 30,
    step: 1,
    unit: 'NM',
    default: [5, 25],
  }),
  'approaches.stabilizedGateFt': setting.number({
    category: 'approaches',
    label: 'Stabilized approach gate',
    description:
      'Height above the runway by which an approach must be stabilized, or the aircraft goes around.',
    min: 500,
    max: 1500,
    step: 100,
    unit: 'ft',
    default: 1000,
  }),
  'approaches.goArounds': setting.boolean({
    category: 'approaches',
    label: 'Automatic go-arounds',
    description: 'Aircraft go around when an approach is not stabilized.',
    default: true,
  }),
  'approaches.showEligibility': setting.boolean({
    category: 'approaches',
    label: 'Show approach eligibility',
    description:
      'Player aid: show in the command menu whether an aircraft can accept the approach.',
    default: false,
  }),

  // ---- Sim -----------------------------------------------------------------
  'sim.availableSpeeds': setting.multiSelect({
    category: 'sim',
    label: 'Available sim speeds',
    description: 'Sim speeds you can switch between.',
    options: [
      { value: 1, label: '1x' },
      { value: 2, label: '2x' },
      { value: 4, label: '4x' },
      { value: 8, label: '8x' },
    ],
    default: [1, 2, 4],
  }),
} satisfies SettingsRegistry;

export type UserSettings = SettingsValues<typeof USER_SETTINGS>;
export type SessionSettings = SettingsValues<typeof SESSION_SETTINGS>;

export const SETTINGS_REGISTRIES = {
  user: USER_SETTINGS,
  session: SESSION_SETTINGS,
} as const;

export type SettingsScope = keyof typeof SETTINGS_REGISTRIES;

export type SettingsFor<S extends SettingsScope> = S extends 'user'
  ? UserSettings
  : SessionSettings;
