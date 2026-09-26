export type SimEvent =
  | { type: 'aircraftAdded'; aircraftId: string }
  | { type: 'aircraftRemoved'; aircraftId: string }
  | { type: 'altitudeReached'; aircraftId: string; altitudeFt: number }
  | { type: 'headingReached'; aircraftId: string; headingDeg: number }
  | { type: 'speedReached'; aircraftId: string; iasKts: number };

export type SimEventListener = (event: SimEvent, tick: number) => void;
