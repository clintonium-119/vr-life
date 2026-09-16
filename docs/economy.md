# Economy

Money is earned by objectives and spent in the two shops; level rises with
objectives completed and unlocks cosmetics. All numbers are tuning knobs in
`src/movementTuning.ts` (payouts, prices) and `src/unlocks.ts` (tiers).

## Earning (per school day)

| Objective               | Money   | Level step   |
| ----------------------- | ------- | ------------ |
| Backpack grabbed        | 0       | +1 objective |
| Bus boarded             | 0       | +1           |
| Math passed (3 correct) | 50      | +1           |
| Science passed          | 50      | +1           |
| History passed          | 50      | +1           |
| Gym passed (3 scores)   | 50      | +1           |
| **Full day**            | **200** | level 5      |

Level = objectives completed, by thresholds `[0, 1, 2, 3, 4, 6]` → levels 0–5.

## Spending

| Item          | Price | Effect                                       | Where                            |
| ------------- | ----- | -------------------------------------------- | -------------------------------- |
| Snack         | 10    | yours to keep (and throw)                    | grocery (4), convenience (4)     |
| Dye can       | 40    | body colour → the can's palette colour       | grocery (all 6), convenience (2) |
| Accessory box | 60    | equips cap / band (slot A) or scarf (slot B) | grocery (3), convenience (1)     |

A full day (200) buys one accessory plus a dye and a couple of snacks, or
two dyes and snacks: one or two purchases, as the roadmap wants.

## Unlocks by level

| Level | Colours | Slots |
| ----- | ------- | ----- |
| 0     | 0, 1    | none  |
| 1     | + 2     | none  |
| 2     | + 3     | A     |
| 3     | + 4     | A     |
| 4     | + 5     | A, B  |
| 5     | all     | A, B  |

## How buying works

Take the item off the shelf (grip), carry it to the counter, and let go
over the counter in front of the shopkeeper. The cash chime means it is
paid; a low buzz means refused (not enough money, or locked) and the item
pops back to its shelf. Unpaid goods carried out of the shop return to the
shelf by themselves.

## Device tuning

Record on the headset: how many purchases a full day tempts, whether the
pay zone reads at arm's length, and whether refusals are understood without
text.
