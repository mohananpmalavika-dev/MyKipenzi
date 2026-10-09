import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BATTERY_THRESHOLDS,
  isBatteryDying,
  getBatteryCareAlert,
  getBatteryStatusText,
  getBatteryColor,
  BATTERY_NUDGE_PRESETS,
  initBatteryMonitoring,
} from '../src/batteryService.js';

test('BATTERY_THRESHOLDS accurately defines critical dying threshold at 5% and low at 20%', () => {
  assert.equal(BATTERY_THRESHOLDS.DYING, 5);
  assert.equal(BATTERY_THRESHOLDS.LOW, 20);
});

test('isBatteryDying detects critical dying battery when <= 5% and not charging', () => {
  assert.equal(isBatteryDying(4, false), true);
  assert.equal(isBatteryDying(5, false), true);
  assert.equal(isBatteryDying(1, false), true);
  assert.equal(isBatteryDying(0, false), true);

  // If charging, it is safe even if at 4%
  assert.equal(isBatteryDying(4, true), false);
  assert.equal(isBatteryDying(5, true), false);

  // If above 5%, it is not in dying state
  assert.equal(isBatteryDying(6, false), false);
  assert.equal(isBatteryDying(20, false), false);
  assert.equal(isBatteryDying(80, false), false);
  assert.equal(isBatteryDying(null, false), false);
});

test('getBatteryCareAlert produces exact required cute alert when battery is dying (<= 5%)', () => {
  const alert4 = getBatteryCareAlert(4, false);
  assert.ok(alert4);
  assert.equal(alert4.type, 'dying');
  assert.equal(alert4.level, 4);
  assert.equal(alert4.title, "Her battery is dying (4%)! Don't worry if she doesn't reply 🤍");
  assert.ok(alert4.titleMl.includes('4%'));
  assert.ok(alert4.titleMl.includes('ഓഫ് ആവാൻ പോകുന്നു'));
  assert.equal(alert4.severity, 'critical');

  const alert5 = getBatteryCareAlert(5, false);
  assert.ok(alert5);
  assert.equal(alert5.title, "Her battery is dying (5%)! Don't worry if she doesn't reply 🤍");

  // When 4% but charging
  const chargingAlert = getBatteryCareAlert(4, true);
  assert.ok(chargingAlert);
  assert.equal(chargingAlert.type, 'charging_low');
  assert.ok(chargingAlert.title.includes('plugged in'));
  assert.equal(chargingAlert.severity, 'charging');

  // When normal battery (e.g. 75%), returns null or charging status if charging
  assert.equal(getBatteryCareAlert(75, false), null);
  const normalCharging = getBatteryCareAlert(75, true, 'Ammu');
  assert.ok(normalCharging);
  assert.ok(normalCharging.title.includes('Ammu is charging (75%)'));
});

test('getBatteryStatusText generates concise status indicators for chat header', () => {
  assert.equal(getBatteryStatusText(85, false), '🔋 85%');
  assert.equal(getBatteryStatusText(85, true), '⚡ 85% Charging');
  assert.equal(getBatteryStatusText(15, false), '⚠️ 15% Low');
  assert.equal(getBatteryStatusText(4, false), '🪫 4% Dying');
  assert.equal(getBatteryStatusText(4, true), '⚡ 4% Charging');
});

test('getBatteryColor maps battery levels to visual colors', () => {
  assert.equal(getBatteryColor(4, false), '#ef4444'); // Dying Red
  assert.equal(getBatteryColor(15, false), '#f59e0b'); // Low Amber
  assert.equal(getBatteryColor(85, false), '#10b981'); // Full Green
  assert.equal(getBatteryColor(4, true), '#10b981');  // Charging Green
});

test('BATTERY_NUDGE_PRESETS contains loving reminders with Malayalam translations', () => {
  assert.ok(Array.isArray(BATTERY_NUDGE_PRESETS));
  assert.ok(BATTERY_NUDGE_PRESETS.length >= 3);
  BATTERY_NUDGE_PRESETS.forEach(preset => {
    assert.ok(preset.id);
    assert.ok(preset.labelMl);
    assert.ok(preset.labelEn);
    assert.ok(preset.message.includes('[Battery Care'));
  });
});

test('initBatteryMonitoring safely no-ops in Node environment without throwing', async () => {
  const cleanup = await initBatteryMonitoring(() => {});
  assert.equal(typeof cleanup, 'function');
  assert.doesNotThrow(() => cleanup());
});
