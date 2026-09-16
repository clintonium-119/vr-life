# Town map

One continuous space. Coordinates are metres; +x is east, −z is north
(the player's house faces −z, toward the avenue). Everything is built by
the district builders from `src/townPlan.ts`; move a district by editing
its numbers there.

## Streets

| Road              | Runs                     | Where                                      |
| ----------------- | ------------------------ | ------------------------------------------ |
| The avenue        | along x from −175 to 185 | z = −15.5 (in front of the player's house) |
| Main cross street | along z from 12 to −155  | x = 55                                     |
| North avenue      | along x from 10 to 125   | z = −105 (through the civic district)      |

Roads are 8 m wide with 2 m sidewalks; the ground is one grass slab.

## Districts and places

| Place                    | Position (x, y, z)     | Notes                                                                         |
| ------------------------ | ---------------------- | ----------------------------------------------------------------------------- |
| Player's bedroom (spawn) | 0, 0.5, 2.4            | house at the origin, front door toward −z                                     |
| Bus stop                 | 30, 0.12, −22.8        | across the avenue, 35 m from the door                                         |
| Residential              | x −75..75, z −30..15   | six neighbour shells, fences, trees, power poles, drainpipes on every house   |
| Water tower (hub)        | 40, 14, −40            | ladder to the deck; the rooftop route's hub                                   |
| Grocery                  | 85, 0, −47             | 32 × 22 × 6 hall, aisles, parking                                             |
| Convenience store        | 85, 0, −86             | 12 × 9                                                                        |
| Office (peak, 20 m)      | 25, 0, −62             | five storeys, atrium lattice, fire escape; roof spawn `officeRoof`            |
| Police                   | 25, 0, −122            | two storeys, cells                                                            |
| Fire department          | 25, 0, −148            | 9 m engine bay, two 5 × 5 m doors, poles                                      |
| Hospital (peak, 12 m)    | 95, 0, −113            | 40 × 30 × 3, wards, helipad; roof spawn `hospitalRoof`                        |
| School                   | 140, 0, −24            | three classrooms, lockers, ramps; drop-off canopy on the avenue               |
| Gym                      | 176, 0, −40            | 24 × 14 × 8 hall, hoop and goal placeholders                                  |
| Farm                     | −110, 0, −8            | farmhouse, barn with hayloft, 12 m silo with ladder, fields, sheds            |
| Forest                   | x −120..120, z 28..130 | four chunks of jittered trees, two clearings                                  |
| Haunted cabin            | 40, 0, 95              | unmarked, > 40 m from any road, ringed by trees; trapdoor over a cellar chest |

## Rooftop layer

Roofs are nodes; a hop is natural when the gap is ≤ 4 m and the rise ≤ 2.5 m
(dropping is free). The planner adds plank catwalks (with rails) between the
closest roofs until the house roofs reach the office and the office reaches
the hospital. Climb aids per building: drainpipes (houses, shops, police,
school), fire escapes (office, hospital), ladders (fire station, silo,
water tower, barn loft), the shed by the driveway, stacked crates.

## Visibility

Chunks (districts and interiors) are drawn within `viewDistanceM` (120 m);
interiors only inside their building plus `interiorDoorMarginM` (2.5 m).
All colliders are always loaded through the spatial grid.

`?spawn=<place>` (dev) puts the player at any place above; names are the
keys of `PLACES` in `src/townPlan.ts`.
