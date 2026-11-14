// timeofday.js -- Day / sunset / night as a VISUAL state only (no
// simulation). 'auto' follows the local clock; the menu can pin a phase.
// Pure functions; unit tested.

export const PHASES = ['day', 'sunset', 'night'];

export function phaseForHour(hour) {
  if (hour >= 7 && hour < 17) return 'day';
  if ((hour >= 17 && hour < 20) || hour === 6) return 'sunset';
  return 'night';
}

export function resolvePhase(setting, date = new Date()) {
  if (PHASES.includes(setting)) return setting;
  return phaseForHour(date.getHours());
}

// Render parameters for a scene look ('outdoor' | 'interior') and phase.
// lit: streetlights on; lights: building window alpha; grade: multiply
// colour; haze: [top, bottom] screen gradient; glow: streetlight pools.
export function phaseLook(sceneLook, phase, reducedMotion) {
  const still = !!reducedMotion;
  if (sceneLook === 'interior') return { phase, still, lit: true, lights: 0, grade: null, haze: null, glow: 0 };
  if (phase === 'night') {
    return { phase, still, lit: true, lights: 1, grade: 'rgb(98, 92, 178)', haze: null, glow: 1 };
  }
  if (phase === 'sunset') {
    return {
      phase, still, lit: true, lights: 0.7, grade: 'rgb(250, 190, 178)',
      haze: ['rgba(255, 92, 157, 0.26)', 'rgba(255, 155, 69, 0.16)'], glow: 0.6,
    };
  }
  // Day: a soft warm wash over the neo-zen town (pink sky light, amber sea air).
  return {
    phase, still, lit: false, lights: 0, grade: 'rgb(255, 242, 236)',
    haze: ['rgba(255, 120, 170, 0.10)', 'rgba(255, 170, 90, 0.08)'], glow: 0,
  };
}
