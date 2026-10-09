/**
 * Partner Battery & Charging Alert Service (ബാറ്ററി & ചാർജിംഗ് കെയർ 🔋⚡)
 * Real-time battery state management, Battery Status API integration,
 * loving status alerts, and caring reminders for couples.
 */

export const BATTERY_THRESHOLDS = {
  DYING: 5,     // <= 5%: Critical care alert ("Her battery is dying (4%)! Don't worry if she doesn't reply 🤍")
  LOW: 20,      // <= 20%: Low battery warning
  NORMAL: 60,   // Normal battery
  FULL: 100,    // Full charge
};

/**
 * Checks if battery is in critical dying state (<= 5% and not currently charging)
 */
export function isBatteryDying(level, isCharging = false) {
  if (level === null || level === undefined) return false;
  return Number(level) <= BATTERY_THRESHOLDS.DYING && !isCharging;
}

/**
 * Returns caring alert information based on battery level & charging status.
 * Specifically handles the cute care alert when battery is 5% or below.
 */
export function getBatteryCareAlert(level, isCharging = false, partnerName = 'Her') {
  if (level === null || level === undefined) return null;
  const numLevel = Math.max(0, Math.min(100, Math.round(Number(level))));

  // Critical dying state (<= 5% and unplugged)
  if (numLevel <= BATTERY_THRESHOLDS.DYING && !isCharging) {
    return {
      type: 'dying',
      level: numLevel,
      isCharging: false,
      title: `Her battery is dying (${numLevel}%)! Don't worry if she doesn't reply 🤍`,
      titleMl: `പങ്കാളിയുടെ ഫോൺ ഓഫ് ആവാൻ പോകുന്നു (${numLevel}%). റിപ്ലൈ തരാൻ വൈകിയാലും വിഷമിക്കേണ്ട 🤍`,
      subtitle: `Her phone is about to turn off. She loves you—no need to worry about quick replies!`,
      subtitleMl: `ഫോൺ ഉടൻ സ്വിച്ച് ഓഫ് ആയേക്കാം. ടെൻഷൻ വേണ്ട, സ്നേഹത്തോടെ കാത്തിരിക്കൂ 🌸`,
      severity: 'critical',
      badgeColor: '#ef4444',
      badgeBg: 'rgba(239, 68, 68, 0.15)',
      emoji: '🪫',
    };
  }

  // Critical but plugged in (<= 5% and charging)
  if (numLevel <= BATTERY_THRESHOLDS.DYING && isCharging) {
    return {
      type: 'charging_low',
      level: numLevel,
      isCharging: true,
      title: `She plugged in just in time (${numLevel}%) ⚡ Charging safely now 🤍`,
      titleMl: `ഫോൺ ചാർജ് ചെയ്യാൻ കുത്തിയിട്ടുണ്ട് (${numLevel}%). ഉടൻ പവർഫുൾ ആയി തിരിച്ചെത്തും ⚡🤍`,
      subtitle: `Phone is on charger now! Good news, won't turn off.`,
      subtitleMl: `ചാർജ് ആകുന്നുണ്ട്! ഫോൺ ഓഫ് ആവില്ല, ആശ്വസിക്കാം.`,
      severity: 'charging',
      badgeColor: '#10b981',
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      emoji: '⚡',
    };
  }

  // Low battery (6% to 20% and unplugged)
  if (numLevel <= BATTERY_THRESHOLDS.LOW && !isCharging) {
    return {
      type: 'low',
      level: numLevel,
      isCharging: false,
      title: `${partnerName}'s battery is low (${numLevel}%) 🪫 Plug in reminder`,
      titleMl: `ബാറ്ററി കുറവാണ് (${numLevel}%). ചാർജ് ചെയ്യാൻ ഓർമ്മിപ്പിക്കാം 🔋`,
      subtitle: `Battery is dropping. Remind them to plug in before it runs out.`,
      subtitleMl: `ബാറ്ററി തീരുന്നതിന് മുൻപ് ചാർജർ കുത്താൻ സ്നേഹത്തോടെ പറയാം.`,
      severity: 'warning',
      badgeColor: '#f59e0b',
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      emoji: '⚠️',
    };
  }

  // Recharging
  if (isCharging) {
    return {
      type: 'charging',
      level: numLevel,
      isCharging: true,
      title: `${partnerName} is charging (${numLevel}%) ⚡ Re-energizing`,
      titleMl: `ഫോൺ ചാർജ് ചെയ്തുകൊണ്ടിരിക്കുന്നു (${numLevel}%) ⚡`,
      subtitle: `Device connected to power source.`,
      subtitleMl: `ഫോൺ ചാർജറിലാണ്.`,
      severity: 'normal',
      badgeColor: '#06b6d4',
      badgeBg: 'rgba(6, 182, 212, 0.15)',
      emoji: '⚡',
    };
  }

  return null;
}

/**
 * Returns human-readable battery status text for header/compact display
 */
export function getBatteryStatusText(level, isCharging = false) {
  if (level === null || level === undefined) return 'Battery --%';
  const numLevel = Math.max(0, Math.min(100, Math.round(Number(level))));
  if (isCharging) {
    return `⚡ ${numLevel}% Charging`;
  }
  if (numLevel <= BATTERY_THRESHOLDS.DYING) {
    return `🪫 ${numLevel}% Dying`;
  }
  if (numLevel <= BATTERY_THRESHOLDS.LOW) {
    return `⚠️ ${numLevel}% Low`;
  }
  return `🔋 ${numLevel}%`;
}

/**
 * Returns color representation for battery percentage and state
 */
export function getBatteryColor(level, isCharging = false) {
  if (isCharging) return '#10b981'; // Green charging
  if (level === null || level === undefined) return '#94a3b8';
  const numLevel = Number(level);
  if (numLevel <= 5) return '#ef4444'; // Red
  if (numLevel <= 20) return '#f59e0b'; // Amber
  if (numLevel <= 50) return '#fbbf24'; // Yellow
  return '#10b981'; // Mint Green
}

/**
 * Preset caring nudge messages to send when battery is low or charging
 */
export const BATTERY_NUDGE_PRESETS = [
  {
    id: 'plug_in',
    icon: '⚡',
    labelMl: 'ചാർജർ കുത്താൻ പറയൂ 🔌⚡',
    labelEn: 'Remind to plug in charger',
    message: '⚡ [Battery Care · ചാർജിംഗ് ഓർമ്മപ്പെടുത്തൽ] Hey sweetheart, plug in your charger! My heart needs your phone alive 🤍🔋',
  },
  {
    id: 'dont_worry_hug',
    icon: '🫂',
    labelMl: 'ടെൻഷൻ വേണ്ട, സ്നേഹാലിംഗനം 🫂🤍',
    labelEn: "Don't worry if phone dies hug",
    message: "🫂 [Battery Care · സ്നേഹാലിംഗനം] Don't worry about replying if your battery dies! Rest well and charge safely 🤍✨",
  },
  {
    id: 'charging_sweet',
    icon: '🔋',
    labelMl: 'ചാർജ് ആകുന്നുണ്ടല്ലോ, സമാധാനം 🌸',
    labelEn: 'Happy your phone is charging',
    message: '🔋 [Battery Care] Yay, saw your phone is charging! Take your time sweetie 🤍⚡',
  },
];

/**
 * Initializes local device battery monitoring via navigator.getBattery().
 * Gracefully resolves in environments where Battery API is unsupported or restricted.
 */
export async function initBatteryMonitoring(onUpdate) {
  if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
    try {
      const battery = await navigator.getBattery();
      const report = () => {
        const level = Math.round(battery.level * 100);
        const charging = Boolean(battery.charging);
        onUpdate({ level, charging });
      };
      // Initial broadcast
      report();
      battery.addEventListener('levelchange', report);
      battery.addEventListener('chargingchange', report);

      return () => {
        battery.removeEventListener('levelchange', report);
        battery.removeEventListener('chargingchange', report);
      };
    } catch {
      // Fallback
    }
  }
  return () => {};
}
