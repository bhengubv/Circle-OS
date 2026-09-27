/**
 * steps.ts — 7-step UI state machine for the CircleOS installer.
 *
 * Steps:
 *  0  Welcome
 *  1  Connect Device
 *  2  Fetch Build Manifest
 *  3  Unlock Bootloader
 *  4  Flash CircleOS (system image -> slot B)
 *  5  Set Active Slot B + Reboot
 *  6  Done
 */

const STEP_LABELS = [
  'Welcome',
  'Connect',
  'Fetch Build',
  'Unlock',
  'Flash',
  'Activate',
  'Done',
];

let currentStep = 0;

/** Build the step progress bar in #step-bar. */
export function initStepBar(): void {
  const bar = document.getElementById('step-bar');
  if (!bar) return;
  bar.innerHTML = '';

  STEP_LABELS.forEach((label, i) => {
    const dot = document.createElement('div');
    dot.className = 'step-dot';
    dot.id = `step-dot-${i}`;
    dot.textContent = String(i + 1);
    dot.title = label;
    bar.appendChild(dot);

    if (i < STEP_LABELS.length - 1) {
      const line = document.createElement('div');
      line.className = 'step-line';
      line.id = `step-line-${i}`;
      bar.appendChild(line);
    }
  });

  updateStepBar(0);
}

/** Navigate to a specific step, updating bar + visible panel. */
export function goToStep(step: number): void {
  // Hide old panel
  const old = document.getElementById(`step-${currentStep}`);
  if (old) old.classList.remove('visible');

  currentStep = step;

  // Show new panel
  const next = document.getElementById(`step-${currentStep}`);
  if (next) next.classList.add('visible');

  updateStepBar(currentStep);
}

function updateStepBar(active: number): void {
  STEP_LABELS.forEach((_, i) => {
    const dot  = document.getElementById(`step-dot-${i}`);
    const line = document.getElementById(`step-line-${i}`);
    if (!dot) return;

    dot.classList.remove('active', 'done');
    if (i < active)      dot.classList.add('done');
    else if (i === active) dot.classList.add('active');

    if (line) {
      line.classList.toggle('done', i < active);
    }
  });
}

/** Append a line to #log with optional CSS class (log-ok / log-warn / log-err). */
export function appendLog(msg: string, cls?: 'log-ok' | 'log-warn' | 'log-err'): void {
  const log = document.getElementById('log');
  if (!log) return;
  const line = document.createElement('div');
  if (cls) line.className = cls;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

/** Update the flash progress bar (0–100). */
export function setFlashProgress(pct: number, label?: string): void {
  const bar = document.getElementById('flash-progress') as HTMLElement | null;
  const lbl = document.getElementById('flash-label');
  if (bar) bar.style.width = `${pct}%`;
  if (lbl && label) lbl.textContent = label;
}

/** Update a text element safely. */
export function setText(id: string, value: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/** Show/hide an element. */
export function setVisible(id: string, visible: boolean): void {
  const el = document.getElementById(id);
  if (el) el.style.display = visible ? '' : 'none';
}

/** Enable/disable a button. */
export function setEnabled(id: string, enabled: boolean): void {
  const btn = document.getElementById(id) as HTMLButtonElement | null;
  if (btn) btn.disabled = !enabled;
}
