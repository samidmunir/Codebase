import type { AircraftState, AirspacePack } from '@vector/sim-core';
import { holdFixOptions, holdSummary } from '../../../commands/command-options';
import type { HoldDraft, InstructionDraft } from '../../../commands/draft';

/** Expect-further-clearance choices, in minutes from now. */
const EFC_MINUTES = [5, 10, 15, 20, 30];
const DEFAULT_EFC_MINUTES = 10;

/**
 * Hold an aircraft at a fix, as published or as described, with an expect
 * further clearance time; or, while it holds on a procedure, resume it.
 */
export function HoldTab({
  pack,
  aircraft,
  draft,
  update,
  utcAtTick,
  onFixHover,
}: {
  pack: AirspacePack;
  aircraft: Readonly<AircraftState>;
  draft: InstructionDraft;
  update: (patch: Partial<InstructionDraft>) => void;
  utcAtTick: (tick: number) => Date;
  onFixHover?: ((ident: string | undefined) => void) | undefined;
}) {
  const navigation = aircraft.navigation;
  const holding = navigation.mode === 'hold' ? navigation : undefined;
  const options = holdFixOptions(pack, aircraft);
  const hold = draft.hold;
  const setHold = (patch: Partial<HoldDraft>) => update({ hold: { ...hold!, ...patch } });

  const choose = (ident: string) => {
    if (hold?.fix === ident) return update({ hold: undefined });
    const option = options.find((o) => o.fix.ident === ident)!;
    update({
      hold: {
        fix: ident,
        published: option.published !== undefined,
        // Described holds default to the course the aircraft arrives on, right turns.
        inboundCourseDeg: Math.round(option.bearingDeg / 10) * 10 || 360,
        turn: 'right',
        efcMinutes: hold?.efcMinutes ?? DEFAULT_EFC_MINUTES,
      },
    });
  };
  const selected = hold ? options.find((o) => o.fix.ident === hold.fix) : undefined;

  return (
    <div className="hold-tab">
      {holding && (
        <div className="hold-tab__status">
          <span>
            Holding at <b>{holding.fix}</b>
            {holding.published ? ' (published)' : ''} ·{' '}
            {holdSummary({
              inboundCourseDeg: holding.inboundCourseDeg,
              turn: holding.turn,
              legNm: holding.legNm,
            })}
          </span>
          {holding.efcTick !== undefined && (
            <span>
              EFC {utcAtTick(holding.efcTick).toISOString().slice(11, 16)}Z · lap {holding.laps + 1}
            </span>
          )}
          {holding.resume && (
            <button
              type="button"
              className="descend-via"
              aria-pressed={draft.resume === true}
              onClick={() => update({ resume: draft.resume ? undefined : true, hold: undefined })}
            >
              <span className="descend-via__title">Resume {holding.resume.name}</span>
              <span className="descend-via__detail">
                leave the hold and continue on the procedure
              </span>
            </button>
          )}
        </div>
      )}

      <ul className="fix-list">
        {options.map(({ fix, distanceNm, bearingDeg, onRoute, published }) => (
          <li key={fix.ident}>
            <button
              type="button"
              aria-pressed={hold?.fix === fix.ident}
              onMouseEnter={() => onFixHover?.(fix.ident)}
              onMouseLeave={() => onFixHover?.(undefined)}
              onClick={() => choose(fix.ident)}
              title={published ? `Published hold: ${holdSummary(published)}` : undefined}
            >
              <span className="fix-list__ident">{fix.ident}</span>
              {onRoute && <span className="fix-list__tag">ROUTE</span>}
              {published && <span className="fix-list__tag">PUB</span>}
              <span className="fix-list__detail">
                {String(bearingDeg).padStart(3, '0')}° · {distanceNm.toFixed(1)} NM
              </span>
            </button>
          </li>
        ))}
      </ul>

      {hold && selected && (
        <div className="hold-tab__options">
          {selected.published && (
            <div className="segmented-control" role="radiogroup" aria-label="Hold">
              <button
                type="button"
                role="radio"
                aria-checked={hold.published}
                onClick={() => setHold({ published: true })}
              >
                As published
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={!hold.published}
                onClick={() => setHold({ published: false })}
              >
                Describe
              </button>
            </div>
          )}
          {hold.published && selected.published ? (
            <p className="command-panel__hint">{holdSummary(selected.published)}</p>
          ) : (
            <div className="hold-tab__describe">
              <span>Inbound</span>
              <button
                type="button"
                onClick={() =>
                  setHold({ inboundCourseDeg: ((hold.inboundCourseDeg + 340) % 360) + 10 })
                }
                aria-label="Inbound course 10° less"
              >
                −
              </button>
              <b>{String(hold.inboundCourseDeg).padStart(3, '0')}°</b>
              <button
                type="button"
                onClick={() => setHold({ inboundCourseDeg: (hold.inboundCourseDeg % 360) + 10 })}
                aria-label="Inbound course 10° more"
              >
                +
              </button>
              <div className="segmented-control" role="radiogroup" aria-label="Turns">
                {(['left', 'right'] as const).map((turn) => (
                  <button
                    key={turn}
                    type="button"
                    role="radio"
                    aria-checked={hold.turn === turn}
                    onClick={() => setHold({ turn })}
                  >
                    {turn === 'left' ? 'Left turns' : 'Right turns'}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="hold-tab__efc">
            <span>Expect further clearance in</span>
            <div
              className="segmented-control"
              role="radiogroup"
              aria-label="Expect further clearance"
            >
              {EFC_MINUTES.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  role="radio"
                  aria-checked={hold.efcMinutes === minutes}
                  onClick={() => setHold({ efcMinutes: minutes })}
                >
                  {minutes}m
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {options.length === 0 && <p className="command-panel__hint">No fixes to hold at nearby.</p>}
    </div>
  );
}
