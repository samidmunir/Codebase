import { useMemo, useState } from 'react';
import {
  assessHandoff,
  formatFrequency,
  handoffBoundaryName,
  headingDifference,
  routeExitFix,
  type AircraftState,
} from '@vector/sim-core';
import {
  altitudeOptions,
  centerHandoff,
  planningNotes,
  directToGroups,
  ilsClearance,
  ilsRunways,
  isDeparting,
  minimumVectoringAltitude,
  speedOptions,
} from '../../../commands/command-options';
import {
  draftCommands,
  EMPTY_DRAFT,
  isEmptyDraft,
  transmissionText,
  type InstructionDraft,
} from '../../../commands/draft';
import type { LeaderDirection } from '../../../scope/render/traffic-layer';
import { useUserSettings } from '../../../settings/user-settings-store';
import type { ScopeSession } from '../../../sim/scope-session';
import { formatAltitudeLabel } from '../format';
import { HeadingDial } from './HeadingDial';

type Tab = 'heading' | 'altitude' | 'speed' | 'direct' | 'approach' | 'handoff';

interface CommandPanelProps {
  session: ScopeSession;
  aircraft: Readonly<AircraftState>;
  draft: InstructionDraft;
  onDraftChange: (draft: InstructionDraft) => void;
  /** The data block position the player chose; undefined when placed automatically. */
  leaderDirection: LeaderDirection | undefined;
  onLeaderDirectionChange: (direction: LeaderDirection | undefined) => void;
  /** A direct-to fix is hovered or focused (undefined when it no longer is). */
  onFixHover?: (ident: string | undefined) => void;
  onClose: () => void;
}

const DIRECTION_LABELS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
/** 3×3 grid positions of the 8 data block directions (center is the aircraft). */
const DIRECTION_GRID: (LeaderDirection | null)[] = [7, 0, 1, 6, null, 2, 5, 4, 3];

const formatFeet = (ft: number) => ft.toLocaleString('en-US');

export function CommandPanel(props: CommandPanelProps) {
  const { session, aircraft, draft, onDraftChange } = props;
  const settings = useUserSettings();
  const { pack } = session;
  const performance = session.engine.performance.get(aircraft.aircraftType);
  const owned = aircraft.owner === session.engine.playerId;
  const pending = session.engine.pendingInstructions(aircraft.id).length > 0;

  const departing = isDeparting(pack, aircraft);
  const runways = useMemo(() => ilsRunways(pack, aircraft), [pack, aircraft]);
  const tabs: { id: Tab; label: string }[] = [
    { id: 'heading', label: 'Heading' },
    { id: 'altitude', label: 'Altitude' },
    { id: 'speed', label: 'Speed' },
    { id: 'direct', label: 'Direct' },
    ...(runways.length > 0 ? [{ id: 'approach' as const, label: 'Approach' }] : []),
    ...(departing ? [{ id: 'handoff' as const, label: 'Handoff' }] : []),
  ];
  const [tab, setTab] = useState<Tab>('heading');
  const activeTab = tabs.some((t) => t.id === tab) ? tab : 'heading';

  const commands = draftCommands(draft, pack, aircraft);
  const check = commands.length > 0 ? session.checkInstruction(aircraft.id, commands) : undefined;
  const update = (patch: Partial<InstructionDraft>) => onDraftChange({ ...draft, ...patch });

  const transmit = () => {
    const result = session.issueInstruction(aircraft.id, commands);
    if (result.ok) onDraftChange(EMPTY_DRAFT);
  };

  const altitudeLabel = (altitudeFt: number) =>
    formatAltitudeLabel(altitudeFt, pack.airspace.transitionAltitudeFt);

  const owner =
    aircraft.owner === session.engine.playerId
      ? 'Your frequency'
      : pack.isCenter(aircraft.owner)
        ? pack.centers.find((center) => center.id === aircraft.owner)!.callsign
        : aircraft.owner.endsWith('_TWR')
          ? `${pack.airport(aircraft.owner.replace('_TWR', '')).towerCallsign}`
          : aircraft.owner;

  return (
    <aside className="command-panel" aria-label={`Instructions for ${aircraft.callsign}`}>
      <header className="command-panel__header">
        <div className="command-panel__identity">
          <h2>{aircraft.callsign}</h2>
          <span className="command-panel__telephony">{aircraft.telephony ?? ''}</span>
          <span className="command-panel__route">
            {aircraft.aircraftType} · {aircraft.flightPlan.origin} →{' '}
            {aircraft.flightPlan.destination}
            {aircraft.flightPlan.requestedAltitudeFt !== undefined && (
              <span className="command-panel__requested" title="Requested cruising altitude">
                Requests {altitudeLabel(aircraft.flightPlan.requestedAltitudeFt)}
              </span>
            )}
          </span>
        </div>
        <button
          type="button"
          className="scope-panel__close"
          onClick={props.onClose}
          aria-label="Deselect aircraft"
        >
          ×
        </button>
      </header>

      <dl className="command-panel__state">
        <div>
          <dt>Alt</dt>
          <dd>
            {altitudeLabel(aircraft.altitudeFt)}
            {aircraft.targets.altitudeFt !== Math.round(aircraft.altitudeFt) && (
              <span className="command-panel__target">
                {' '}
                → {altitudeLabel(aircraft.targets.altitudeFt)}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>Spd</dt>
          <dd>
            {Math.round(aircraft.iasKts)}
            <span className="command-panel__target">
              {aircraft.targets.speedMode === 'normal'
                ? ' normal'
                : ` → ${aircraft.targets.iasKts}`}
            </span>
          </dd>
        </div>
        <div>
          <dt>Hdg</dt>
          <dd>
            {String(Math.round(aircraft.headingDeg) % 360 || 360).padStart(3, '0')}
            <span className="command-panel__target">
              {aircraft.navigation.mode === 'direct'
                ? ` → ${aircraft.navigation.fix}`
                : aircraft.navigation.mode === 'approach'
                  ? ` · ILS ${aircraft.navigation.clearance.runway}`
                  : ''}
            </span>
          </dd>
        </div>
      </dl>

      <ul className="command-panel__plan" aria-label="Planning">
        {planningNotes(pack, aircraft, altitudeLabel, session.engine.settings).map((note) => (
          <li key={note.label} data-tone={note.tone}>
            <span>{note.label}</span> {note.value}
          </li>
        ))}
      </ul>

      <div className="command-panel__status">
        <span className={owned ? 'status-chip status-chip--owned' : 'status-chip'}>{owner}</span>
        {pending && <span className="status-chip status-chip--pending">Awaiting readback</span>}
        <div className="leader-picker" role="group" aria-label="Data block position">
          {DIRECTION_GRID.map((direction, i) =>
            direction === null ? (
              <button
                key={i}
                type="button"
                className="leader-picker__center"
                aria-label="Place data block automatically"
                title="Automatic"
                aria-pressed={props.leaderDirection === undefined}
                onClick={() => props.onLeaderDirectionChange(undefined)}
              />
            ) : (
              <button
                key={i}
                type="button"
                aria-label={`Data block ${DIRECTION_LABELS[direction]}`}
                aria-pressed={props.leaderDirection === direction}
                onClick={() => props.onLeaderDirectionChange(direction)}
              />
            ),
          )}
        </div>
      </div>

      {!owned ? (
        <p className="command-panel__notice">
          {aircraft.callsign} is talking to {owner}. You can instruct it once it is on your
          frequency.
        </p>
      ) : (
        <>
          <nav className="command-tabs" aria-label="Instruction type">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={activeTab === t.id}
                className={isTabSet(t.id, draft) ? 'command-tabs__set' : undefined}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="command-panel__body">
            {activeTab === 'heading' && (
              <HeadingTab aircraft={aircraft} draft={draft} update={update} />
            )}

            {activeTab === 'altitude' && (
              <AltitudeTab
                label={altitudeLabel}
                requested={aircraft.flightPlan.requestedAltitudeFt}
                options={altitudeOptions(pack, performance)}
                mva={minimumVectoringAltitude(pack, aircraft.position)}
                current={aircraft.targets.altitudeFt}
                selected={draft.altitudeFt}
                onSelect={(altitudeFt) =>
                  update({ altitudeFt: draft.altitudeFt === altitudeFt ? undefined : altitudeFt })
                }
              />
            )}

            {activeTab === 'speed' && (
              <div className="option-grid option-grid--speeds">
                {speedOptions(
                  performance,
                  Math.max(aircraft.altitudeFt, draft.altitudeFt ?? 0),
                ).map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    aria-pressed={draft.speed === speed}
                    className={
                      aircraft.targets.speedMode === 'assigned' && aircraft.targets.iasKts === speed
                        ? 'option--current'
                        : undefined
                    }
                    onClick={() => update({ speed: draft.speed === speed ? undefined : speed })}
                  >
                    {speed}
                  </button>
                ))}
                <button
                  type="button"
                  className="option-grid__wide"
                  aria-pressed={draft.speed === 'normal'}
                  onClick={() => update({ speed: draft.speed === 'normal' ? undefined : 'normal' })}
                >
                  Resume normal speed
                </button>
              </div>
            )}

            {activeTab === 'direct' && (
              <div className="fix-groups">
                {directToGroups(pack, aircraft, settings['controls.directToRingNm']).map(
                  (group) => (
                    <section key={group.title} className="fix-group" aria-label={group.title}>
                      <h3 className="fix-group__title">{group.title}</h3>
                      <ul className="fix-list">
                        {group.fixes.map(({ fix, distanceNm, bearingDeg }) => (
                          <li key={fix.ident}>
                            <button
                              type="button"
                              aria-pressed={draft.directTo === fix.ident}
                              onMouseEnter={() => props.onFixHover?.(fix.ident)}
                              onMouseLeave={() => props.onFixHover?.(undefined)}
                              onFocus={() => props.onFixHover?.(fix.ident)}
                              onBlur={() => props.onFixHover?.(undefined)}
                              onClick={() =>
                                update({
                                  directTo: draft.directTo === fix.ident ? undefined : fix.ident,
                                  heading: undefined,
                                })
                              }
                            >
                              <span className="fix-list__ident">{fix.ident}</span>
                              {fix.kind !== 'waypoint' && (
                                <span className="fix-list__tag">{fix.kind.toUpperCase()}</span>
                              )}
                              <span className="fix-list__detail">
                                {String(bearingDeg).padStart(3, '0')}° · {distanceNm.toFixed(1)} NM
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ),
                )}
              </div>
            )}

            {activeTab === 'approach' && (
              <ApproachTab
                session={session}
                aircraft={aircraft}
                runways={runways}
                draft={draft}
                update={update}
              />
            )}

            {activeTab === 'handoff' && (
              <HandoffTab session={session} aircraft={aircraft} draft={draft} update={update} />
            )}
          </div>

          <footer className="command-panel__footer">
            <p
              className={isEmptyDraft(draft) ? 'transmission transmission--empty' : 'transmission'}
            >
              {isEmptyDraft(draft)
                ? 'Choose an instruction to build the transmission.'
                : transmissionText(commands, aircraft)}
            </p>
            {check && !check.ok && <p className="transmission__error">{check.reason}</p>}
            <div className="command-panel__actions">
              <button
                type="button"
                className="scope-button"
                disabled={isEmptyDraft(draft)}
                onClick={() => onDraftChange(EMPTY_DRAFT)}
              >
                Clear
              </button>
              <button
                type="button"
                className="transmit-button"
                disabled={!check?.ok}
                onClick={transmit}
              >
                Transmit
              </button>
            </div>
          </footer>
        </>
      )}
    </aside>
  );
}

function isTabSet(tab: Tab, draft: InstructionDraft): boolean {
  switch (tab) {
    case 'heading':
      return draft.heading !== undefined;
    case 'altitude':
      return draft.altitudeFt !== undefined;
    case 'speed':
      return draft.speed !== undefined;
    case 'direct':
      return draft.directTo !== undefined;
    case 'approach':
      return draft.ilsRunway !== undefined;
    case 'handoff':
      return draft.handoff === true;
  }
}

function HeadingTab({
  aircraft,
  draft,
  update,
}: {
  aircraft: Readonly<AircraftState>;
  draft: InstructionDraft;
  update: (patch: Partial<InstructionDraft>) => void;
}) {
  const selected = draft.heading;
  // The turn follows the shorter way until the player picks a direction themselves.
  const [turnChosen, setTurnChosen] = useState(false);
  const choose = (headingDeg: number) => {
    const shorter = headingDifference(aircraft.headingDeg, headingDeg % 360) < 0 ? 'left' : 'right';
    const turn = turnChosen && selected ? selected.turn : shorter;
    update({ heading: { headingDeg, turn }, directTo: undefined });
  };

  return (
    <div className="heading-tab">
      <HeadingDial
        currentDeg={aircraft.headingDeg}
        selectedDeg={selected?.headingDeg}
        onSelect={choose}
      />
      <div className="segmented-control" role="group" aria-label="Turn direction">
        {(
          [
            ['left', 'Turn left'],
            ['shortest', 'Fly heading'],
            ['right', 'Turn right'],
          ] as const
        ).map(([turn, label]) => (
          <button
            key={turn}
            type="button"
            disabled={!selected}
            aria-pressed={selected?.turn === turn}
            onClick={() => {
              if (!selected) return;
              setTurnChosen(true);
              update({ heading: { ...selected, turn } });
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {selected && (
        <button
          type="button"
          className="link-button"
          onClick={() => {
            setTurnChosen(false);
            update({ heading: undefined });
          }}
        >
          Remove heading
        </button>
      )}
    </div>
  );
}

function AltitudeTab(props: {
  label: (altitudeFt: number) => string;
  requested: number | undefined;
  options: number[];
  mva: number | undefined;
  current: number;
  selected: number | undefined;
  onSelect: (altitudeFt: number) => void;
}) {
  return (
    <div className="altitude-tab">
      <div className="option-grid option-grid--altitudes">
        {[...props.options].reverse().map((altitude) => (
          <button
            key={altitude}
            type="button"
            aria-pressed={props.selected === altitude}
            className={[
              props.current === altitude ? 'option--current' : '',
              props.requested === altitude ? 'option--requested' : '',
              props.mva !== undefined && altitude < props.mva ? 'option--below-mva' : '',
            ].join(' ')}
            title={
              props.mva !== undefined && altitude < props.mva
                ? 'Below the minimum vectoring altitude here'
                : props.requested === altitude
                  ? 'Requested cruising altitude'
                  : undefined
            }
            onClick={() => props.onSelect(altitude)}
          >
            {props.label(altitude)}
          </button>
        ))}
      </div>
      {props.mva !== undefined && (
        <p className="command-panel__hint">
          Minimum vectoring altitude here: {formatFeet(props.mva)} ft
        </p>
      )}
    </div>
  );
}

function HandoffTab({
  session,
  aircraft,
  draft,
  update,
}: {
  session: ScopeSession;
  aircraft: Readonly<AircraftState>;
  draft: InstructionDraft;
  update: (patch: Partial<InstructionDraft>) => void;
}) {
  const { pack, engine } = session;
  const settings = engine.settings;
  const handoff = centerHandoff(pack, aircraft, settings);
  if (!handoff || handoff.type !== 'handoff')
    return <p className="command-panel__hint">No Center frequency nearby.</p>;
  const assessment = assessHandoff(pack, aircraft, settings);
  const label = (ft: number) => formatAltitudeLabel(ft, pack.airspace.transitionAltitudeFt);
  const requested = aircraft.flightPlan.requestedAltitudeFt;
  const exitFix = routeExitFix(pack, aircraft);
  const departure = pack.airspace.airports.includes(aircraft.flightPlan.origin);
  const base = departure
    ? settings['scoring.departureHandoffRp']
    : settings['scoring.transitHandoffRp'];
  const checks: { label: string; met: boolean; note: string }[] = [
    {
      label: `Within ${settings['center.handoffWindowNm']} NM of the ${handoffBoundaryName(pack)}`,
      met: assessment.withinWindow,
      note:
        assessment.toBoundaryNm === undefined
          ? 'not heading out'
          : `${Math.round(assessment.toBoundaryNm)} NM to go`,
    },
    {
      label: `At or above ${label(assessment.minimumAltitudeFt)}`,
      met: assessment.highEnough,
      note: label(aircraft.altitudeFt),
    },
  ];
  const bonuses: { label: string; met: boolean; rp: number }[] = [
    {
      label: exitFix
        ? `Flew ${departure ? 'its gate' : 'its exit fix'} ${exitFix.ident}`
        : 'Flew its route',
      met: engine.routeFlown(aircraft.id),
      rp: settings['scoring.routeFlownBonusRp'],
    },
    {
      label: requested
        ? `Cleared to requested ${label(requested)}`
        : 'Cleared to its requested level',
      met:
        requested !== undefined &&
        (aircraft.targets.altitudeFt === requested ||
          Math.abs(aircraft.altitudeFt - requested) < 300),
      rp: settings['scoring.requestedLevelBonusRp'],
    },
  ];
  return (
    <div className="handoff-tab">
      <button
        type="button"
        className="handoff-option"
        aria-pressed={draft.handoff === true}
        disabled={!assessment.ok}
        onClick={() => update({ handoff: !draft.handoff })}
      >
        <span className="handoff-option__facility">{handoff.facility}</span>
        <span className="handoff-option__frequency">{formatFrequency(handoff.frequencyMhz)}</span>
      </button>
      <ul className="handoff-checks" aria-label="Center accepts the handoff when">
        {checks.map((check) => (
          <li key={check.label} data-met={check.met}>
            <span aria-hidden="true">{check.met ? '✓' : '○'}</span> {check.label}
            <small>{check.note}</small>
          </li>
        ))}
      </ul>
      <ul className="handoff-checks handoff-checks--bonus" aria-label="RP for this handoff">
        <li data-met>
          <span aria-hidden="true">+</span> Handoff <small>{base} RP</small>
        </li>
        {bonuses.map((bonus) => (
          <li key={bonus.label} data-met={bonus.met}>
            <span aria-hidden="true">{bonus.met ? '+' : '○'}</span> {bonus.label}
            <small>{bonus.rp} RP</small>
          </li>
        ))}
      </ul>
      {!assessment.ok && <p className="command-panel__hint">{assessment.reason}.</p>}
    </div>
  );
}

function ApproachTab({
  session,
  aircraft,
  runways,
  draft,
  update,
}: {
  session: ScopeSession;
  aircraft: Readonly<AircraftState>;
  runways: string[];
  draft: InstructionDraft;
  update: (patch: Partial<InstructionDraft>) => void;
}) {
  const destination = aircraft.flightPlan.destination;
  const inUse = session.engine.activeRunways[destination]?.arrivals ?? [];
  const showEligibility = session.engine.settings['approaches.showEligibility'];
  // Runways in use first.
  const ordered = [...runways].sort(
    (a, b) => Number(inUse.includes(b)) - Number(inUse.includes(a)),
  );

  return (
    <div className="approach-tab">
      <div className="option-grid option-grid--runways">
        {ordered.map((runway) => {
          const clearance = ilsClearance(session.pack, destination, runway);
          const eligibility =
            showEligibility && clearance
              ? session.engine.ilsEligibility(aircraft.id, clearance)
              : undefined;
          return (
            <button
              key={runway}
              type="button"
              aria-pressed={draft.ilsRunway === runway}
              className={inUse.includes(runway) ? 'option--in-use' : undefined}
              title={
                eligibility && !eligibility.ok
                  ? `Pilot would be unable: ${eligibility.reason}`
                  : undefined
              }
              onClick={() => update({ ilsRunway: draft.ilsRunway === runway ? undefined : runway })}
            >
              <span className="option__caption">{inUse.includes(runway) ? 'IN USE' : 'ILS'}</span>
              {runway}
              {eligibility && (
                <span
                  className={eligibility.ok ? 'option__eligible' : 'option__ineligible'}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
      <p className="command-panel__hint">
        {showEligibility
          ? 'Green: the pilot can accept the approach from here. Red: the pilot would be unable (hover for why).'
          : 'The pilot accepts the approach only from a position they can fly it; otherwise they reply unable.'}
      </p>
    </div>
  );
}
