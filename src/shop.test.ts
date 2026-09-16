import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { Progress } from './progress';
import { Prop } from './props';
import { shopDefinitions, shouldRecall, tryPurchase } from './shop';
import { tuning } from './movementTuning';

describe('tryPurchase', () => {
  it('pays for unlocked goods with enough money, refuses poor or locked', () => {
    const p = new Progress();
    p.money = 100;
    expect(tryPurchase(p, { price: 10, effect: { kind: 'snack' } })).toEqual({ ok: true });
    expect(tryPurchase(p, { price: 40, effect: { kind: 'dye', color: 1 } })).toEqual({ ok: true });
    expect(tryPurchase(p, { price: 40, effect: { kind: 'dye', color: 5 } })).toEqual({
      ok: false,
      reason: 'locked',
    });
    expect(
      tryPurchase(p, { price: 60, effect: { kind: 'accessory', slot: 0, item: 'cap' } }),
    ).toEqual({ ok: false, reason: 'locked' });
    p.money = 5;
    expect(tryPurchase(p, { price: 10, effect: { kind: 'snack' } })).toEqual({
      ok: false,
      reason: 'poor',
    });
    for (let i = 0; i < 4; i++) p.award(['math', 'science', 'history', 'gym'][i] as 'math', 50);
    expect(p.level).toBe(4);
    expect(
      tryPurchase(p, { price: 60, effect: { kind: 'accessory', slot: 1, item: 'scarf' } }),
    ).toEqual({ ok: true });
  });
});

describe('shop definitions', () => {
  const shops = shopDefinitions(tuning);
  it('keep every item and the pay zone inside the shop, priced per the economy', () => {
    for (const shop of shops) {
      expect(shop.items.length).toBeGreaterThan(5);
      for (const item of shop.items) {
        expect(
          shop.bounds.containsPoint(new Vector3(...item.home)),
          `${item.id} on the shelf`,
        ).toBe(true);
        const price = item.spec.price;
        expect([tuning.priceSnack, tuning.priceDye, tuning.priceAccessory]).toContain(price);
      }
      expect(shop.bounds.containsPoint(shop.payZone.getCenter(new Vector3()))).toBe(true);
      expect(shop.bounds.containsPoint(new Vector3(...shop.keeper))).toBe(true);
    }
  });

  it('recalls unpaid goods that leave the shop, and only those', () => {
    const shop = shops[0];
    const item = shop.items[0];
    const prop = new Prop(item.spec, new Vector3(...item.home));
    expect(shouldRecall(prop, shop)).toBe(false);
    prop.position.set(0, 1, 0);
    expect(shouldRecall(prop, shop)).toBe(true);
    prop.paid = true;
    expect(shouldRecall(prop, shop)).toBe(false);
    prop.paid = false;
    prop.state = 'held';
    expect(shouldRecall(prop, shop)).toBe(false);
  });
});
