# Airspace data pipeline

Builds the airspace packs in `data/airspaces/` from public-domain US government data.
Raw downloads are cached in `data/.cache/` (git-ignored), so rebuilds are fast and reproducible.

```sh
npm run data:new-york                          # build data/airspaces/new-york/
npm run data:preview -- new-york               # render data/.cache/preview-new-york.svg
npm run data:preview -- new-york 40.64 -73.78 10   # zoomed preview (lat, lon, radius NM)
```

## Sources

| Source                                                                                                              | Used for                                                                                   |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [FAA CIFP](https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/cifp/) (ARINC 424)                  | Airports, runways, ILS, fixes, navaids, arrival (STAR), departure (SID) and ILS procedures |
| [FAA NASR](https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/) (FRQ, AFF)             | Tower frequencies (per runway where split), New York Center radio sites                    |
| [FAA Class Airspace](https://adds-faa.opendata.arcgis.com/)                                                         | New York Class B                                                                           |
| [FAA MVA charts](https://aeronav.faa.gov/MVA_Charts/) (AIXM)                                                        | N90 minimum vectoring altitudes                                                            |
| [US Census TIGER/Line](https://www.census.gov/geographies/mapping-files.html) area water + 1:500k county boundaries | Shoreline                                                                                  |

All sources are US government works in the public domain. The FAA data is **not for
navigation**: Vector is a simulation.

## Hand-authored files

`data/airspaces/<id>/traffic.json` is curated rather than built: runway configurations
(common real-world flows, in order of preference), airline and aircraft mixes per
airport, destinations and their departure gates, and initial departure altitudes. The
build reads its departure gate fixes and adds them to the navdata. The airspace pack
tests cross-check it (runways exist, arrival runways have an ILS, gate fixes exist).

`data/airlines/airlines.json` holds airline radio names (telephony) and flight number ranges.

## Updating to a new FAA cycle

The FAA publishes new CIFP and NASR data every 28 days. In `build-new-york.ts`, update
`CIFP_CYCLE`, `NASR_EDITION` and `NASR_CSV_EDITION` together (current editions are
listed on the CIFP and NASR pages above), run `npm run data:new-york`, then
`npm test` — the airspace pack tests cross-check the result.

## How the shoreline is built

TIGER water polygons are very detailed but are split at county lines, and counties
extend 3 NM out to sea. The builder:

1. Starts from ocean, bay/sound and river polygons, then adds any water polygon that
   shares an edge with them. TIGER codes some tidal water as lakes or reservoirs (e.g.
   Grassy Bay and Mill Basin in Jamaica Bay), and this keeps them while leaving isolated
   inland lakes off the map.
2. Drops edges shared by two polygons (county seams through water).
3. Drops edges with water on both sides (offshore county limits), using the Census
   1:500k county outlines, which are clipped to the shoreline, as a land mask.
4. Chains the remaining edges into lines and simplifies them (15 m tolerance).

## Known approximations

- **Sector boundary.** N90's real lateral limits aren't published. The playable
  boundary is a 45 NM circle around the three airports (ceiling 17,000 ft). Arrival
  routes start 40–130 NM out, so arrivals will appear where their route crosses it.
- **Departure procedures.** CIFP only codes RNAV/pilot-navigation SIDs (8 here). The
  radar-vector SIDs most New York departures actually fly are text-only, so runways
  without a coded SID toward a departure's gate fly runway heading to their initial
  altitude and expect radar vectors.
- **Center frequencies.** Which New York Center sector takes a departure isn't
  published. The pack includes ZNY's real radio sites and frequencies, and handoffs
  can use the nearest site on the right altitude band.
- **Airport reference fixes.** Some STARs end with a heading leg that names the airport
  as a reference only; those legs keep their heading and drop the fix.
