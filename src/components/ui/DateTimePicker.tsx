/**
 * DateTimePicker — fully custom date & time picker. Zero external deps.
 *
 * Design:
 *  - Month/Year navigator header
 *  - Calendar grid (7 columns Mon→Sun)
 *  - Hour : Minute wheels
 *  - Compact summary pill when value is set
 *  - Gold brand colors, navy surfaces
 *
 * [FIX 2026-10-07 · Create Mission step 2 audit]
 *  - WRONG TIME DISPLAYED: the trigger printed `iso.split('T')[1]`, i.e. the
 *    raw string. Presets and copies store full UTC ISO strings, so "Ce soir
 *    20:00" was shown as "18:00:00.000Z". The display is now formatted from
 *    the Date in the device's local time, whatever the input format.
 *  - STALE PICKER: day/hour/minute were seeded from `value` on mount only.
 *    After a preset, a copy or an automatic end shift, opening the picker
 *    showed the OLD time and "Confirmer" wrote it back. The wheel state is now
 *    re-synced from `value` every time the sheet opens.
 *  - LIMITS AT THE MINUTE: minDate only greyed out whole days, so "today
 *    08:00" was accepted when the earliest valid time was 15:30 (rejected
 *    later at Continue). minDate / new maxDate are now enforced on the exact
 *    date-time: confirm is disabled with an explicit "too early / too late".
 *  - Emits a full ISO string (same format as presets) instead of a
 *    timezone-less "YYYY-MM-DDTHH:MM", so all slot dates share one format.
 *  - Hour/minute wheels wrap (23 → 00), natural for night shifts.
 *  - Hardcoded "HEURE", missing accessibility labels, white-on-gold confirm
 *    text (contrast) fixed.
 *
 * [2026-10-07 · Paris time] Days, hours and minutes are PARIS wall-clock
 * values, whatever the phone's time zone (utils/parisTime.ts). On a phone left
 * on UTC, "08:00" used to mean 08:00 UTC = 10:00 in Paris, and the quote
 * added surcharges for hours nobody picked.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  StyleSheet, Pressable,
} from 'react-native';
import { Calendar, Clock, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Check, X } from 'lucide-react-native';
import { colors } from '@theme/colors';
import { spacing, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { useTranslation } from '@i18n';
import i18n from '@i18n';
import {
  parisParts, fromParis, daysInMonth as monthDays, weekdayOf, inParis,
} from '@utils/parisTime';

/** A calendar day in Paris (month 0-based). */
interface Day { y: number; m: number; d: number }
const dayKey = (x: Day) => x.y * 10_000 + x.m * 100 + x.d;
const parisDay = (date: Date): Day => { const p = parisParts(date); return { y: p.year, m: p.month, d: p.day }; };

interface Props {
  label:     string;
  /** Any string `new Date()` can parse (full ISO recommended). '' = unset. */
  value:     string;
  /** Receives a full ISO 8601 string (UTC, `toISOString()`). */
  onChange:  (iso: string) => void;
  /** Earliest selectable instant (enforced at the minute). */
  minDate?:  Date;
  /** Latest selectable instant (enforced at the minute). */
  maxDate?:  Date;
  error?:    string;
  hint?:     string;
}

/** Monday-first short weekday labels for the active locale (Intl-driven, no hardcoded language). */
const WEEKDAY_MON_REF = new Date(2024, 0, 1); // 2024-01-01 is a Monday
function weekdayLabels(lang: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(WEEKDAY_MON_REF);
    d.setDate(WEEKDAY_MON_REF.getDate() + i);
    return d.toLocaleDateString(lang, { weekday: 'short' });
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');

function parseISO(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/** Paris day + Paris time → the instant. */
function compose(day: Day, h: number, m: number): Date {
  return fromParis(day.y, day.m, day.d, h, m);
}

function formatTime(d: Date): string {
  const p = parisParts(d);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

function formatDisplay(iso: string): string {
  const d = parseISO(iso);
  if (!d) return '';
  return d.toLocaleDateString(i18n.language, inParis({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }))
    + i18n.t('common:datetime_at_sep') + formatTime(d);
}

function formatShort(d: Date): string {
  return d.toLocaleDateString(i18n.language, inParis({ weekday: 'short', day: 'numeric', month: 'short' }))
    + i18n.t('common:datetime_at_sep') + formatTime(d);
}

/** Returns 0=Monday offset of the first day of the month */
function firstDayOffset(year: number, month: number): number {
  const d = weekdayOf(year, month, 1); // 0=Sun
  return d === 0 ? 6 : d - 1;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const DateTimePicker: React.FC<Props> = ({
  label, value, onChange, minDate, maxDate, error, hint,
}) => {
  const { t } = useTranslation('common');
  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => parisDay(now), [now]);

  const [open,        setOpen]        = useState(false);
  const [viewYear,    setViewYear]    = useState(today.y);
  const [viewMonth,   setViewMonth]   = useState(today.m);
  const [selectedDay, setSelectedDay] = useState<Day | null>(null);
  const [hour,        setHour]        = useState(9);
  const [minute,      setMinute]      = useState(0);

  /** Seed the wheels from the CURRENT value (or a sensible default) on open. */
  const openSheet = useCallback(() => {
    const parsed = parseISO(value);
    // No value yet: start from the earliest allowed time, rounded up to 5 min.
    const fallback = minDate
      ? new Date(Math.ceil(minDate.getTime() / 300_000) * 300_000)
      : new Date(now.getTime() + 24 * 3_600_000);
    const seed = parsed ?? fallback;
    const p = parisParts(seed);
    setViewYear(p.year);
    setViewMonth(p.month);
    setSelectedDay(parsed || minDate ? { y: p.year, m: p.month, d: p.day } : null);
    setHour(parsed || minDate ? p.hour : 9);
    setMinute(parsed ? p.minute - (p.minute % 5) : (minDate ? p.minute : 0));
    setOpen(true);
  }, [value, minDate, now]);

  const daysInMonth  = monthDays(viewYear, viewMonth);
  const firstOffset  = firstDayOffset(viewYear, viewMonth);
  const cells        = useMemo(() => {
    const arr: (number | null)[] = Array(firstOffset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [firstOffset, daysInMonth]);

  // Whole-day limits compared on the Paris calendar.
  const isDisabled = useCallback((day: number) => {
    const k = dayKey({ y: viewYear, m: viewMonth, d: day });
    if (minDate && k < dayKey(parisDay(minDate))) return true;
    if (maxDate && k > dayKey(parisDay(maxDate))) return true;
    return false;
  }, [viewYear, viewMonth, minDate, maxDate]);

  const isSelected = useCallback((day: number) =>
    !!selectedDay && dayKey(selectedDay) === dayKey({ y: viewYear, m: viewMonth, d: day }),
  [selectedDay, viewYear, viewMonth]);

  const isToday = useCallback((day: number) =>
    dayKey(today) === dayKey({ y: viewYear, m: viewMonth, d: day }),
  [viewYear, viewMonth, today]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDayPress = (day: number) => {
    if (isDisabled(day)) return;
    setSelectedDay({ y: viewYear, m: viewMonth, d: day });
  };

  // Exact candidate + its validity against the limits (to the minute).
  const candidate = selectedDay ? compose(selectedDay, hour, minute) : null;
  const tooEarly  = !!(candidate && minDate && candidate.getTime() < minDate.getTime());
  const tooLate   = !!(candidate && maxDate && candidate.getTime() > maxDate.getTime());
  const canConfirm = !!candidate && !tooEarly && !tooLate;

  const handleConfirm = () => {
    if (!candidate || !canConfirm) return;
    onChange(candidate.toISOString());
    setOpen(false);
  };

  // Wheels wrap around: 23 → 00 is the natural move for night shifts.
  const handleHour   = (delta: number) => setHour(h => (h + delta + 24) % 24);
  const handleMinute = (delta: number) => setMinute(m => (m + delta + 60) % 60);

  return (
    <>
      {/* ── Trigger ───────────────────────────────────────────────────────── */}
      <View style={styles.wrapper}>
        <Text style={[styles.label, error && styles.labelError]}>{label}</Text>

        <TouchableOpacity
          style={[styles.trigger, error && styles.triggerError, value && styles.triggerFilled]}
          onPress={openSheet}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={value ? `${label} : ${formatDisplay(value)}` : `${label} : ${t('datetime_select_label')}`}
          accessibilityHint={error}
        >
          <Calendar size={16} color={value ? colors.primary : colors.textMuted} strokeWidth={1.8} />
          <Text style={[styles.triggerText, !value && styles.triggerPlaceholder]}>
            {value ? formatDisplay(value) : t('datetime_select_label')}
          </Text>
          {value ? <Clock size={14} color={colors.primary} strokeWidth={1.8} /> : null}
        </TouchableOpacity>

        {error && <Text style={styles.error}>{error}</Text>}
        {!error && hint && <Text style={styles.hint}>{hint}</Text>}
      </View>

      {/* ── Modal picker ──────────────────────────────────────────────────── */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>

            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle} accessibilityRole="header">{label}</Text>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel={t('close')}
              >
                <X size={20} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* ── Calendar ────────────────────────────────────────────────── */}
            <View style={styles.calNav}>
              <TouchableOpacity onPress={prevMonth} style={styles.navBtn} accessibilityRole="button" accessibilityLabel={t('datetime_prev_month')}>
                <ChevronLeft size={18} color={colors.textPrimary} strokeWidth={2} />
              </TouchableOpacity>
              <Text style={styles.calTitle}>
                {new Date(viewYear, viewMonth, 1).toLocaleDateString(i18n.language, { month: 'long' })} {viewYear}
              </Text>
              <TouchableOpacity onPress={nextMonth} style={styles.navBtn} accessibilityRole="button" accessibilityLabel={t('datetime_next_month')}>
                <ChevronRight size={18} color={colors.textPrimary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Day names */}
            <View style={styles.dayNames}>
              {weekdayLabels(i18n.language).map(d => (
                <Text key={d} style={styles.dayName}>{d}</Text>
              ))}
            </View>

            {/* Day grid */}
            <View style={styles.grid}>
              {cells.map((day, idx) => {
                if (day === null) return <View key={`e-${idx}`} style={styles.cell} />;
                const disabled = isDisabled(day);
                const selected = isSelected(day);
                const today    = isToday(day);
                return (
                  <TouchableOpacity
                    key={`d-${idx}`}
                    style={[
                      styles.cell,
                      today    && styles.cellToday,
                      selected && styles.cellSelected,
                      disabled && styles.cellDisabled,
                    ]}
                    onPress={() => handleDayPress(day)}
                    disabled={disabled}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled }}
                    accessibilityLabel={new Date(viewYear, viewMonth, day).toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}
                  >
                    <Text style={[
                      styles.cellText,
                      today    && styles.cellTextToday,
                      selected && styles.cellTextSelected,
                      disabled && styles.cellTextDisabled,
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Time picker ─────────────────────────────────────────────── */}
            <View style={styles.timeSep}>
              <View style={styles.timeSepLine} />
              <Text style={styles.timeSepLabel}>{t('datetime_time_label')}</Text>
              <View style={styles.timeSepLine} />
            </View>

            <View style={styles.timePicker}>
              {/* Hour */}
              <View style={styles.timeWheel}>
                <TouchableOpacity onPress={() => handleHour(1)} style={styles.wheelBtn} accessibilityRole="button" accessibilityLabel="+1 h">
                  <ChevronUp size={18} color={colors.primary} strokeWidth={2.5} />
                </TouchableOpacity>
                <View style={styles.wheelValue}>
                  <Text style={styles.wheelNumber}>{pad(hour)}</Text>
                  <Text style={styles.wheelUnit}>h</Text>
                </View>
                <TouchableOpacity onPress={() => handleHour(-1)} style={styles.wheelBtn} accessibilityRole="button" accessibilityLabel="-1 h">
                  <ChevronDown size={18} color={colors.primary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              <Text style={styles.timeSeparator}>:</Text>

              {/* Minute — steps of 5 */}
              <View style={styles.timeWheel}>
                <TouchableOpacity onPress={() => handleMinute(5)} style={styles.wheelBtn} accessibilityRole="button" accessibilityLabel="+5 min">
                  <ChevronUp size={18} color={colors.primary} strokeWidth={2.5} />
                </TouchableOpacity>
                <View style={styles.wheelValue}>
                  <Text style={styles.wheelNumber}>{pad(minute)}</Text>
                  <Text style={styles.wheelUnit}>min</Text>
                </View>
                <TouchableOpacity onPress={() => handleMinute(-5)} style={styles.wheelBtn} accessibilityRole="button" accessibilityLabel="-5 min">
                  <ChevronDown size={18} color={colors.primary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick shortcuts */}
            <View style={styles.shortcuts}>
              {[6, 7, 8, 9, 14, 18, 20, 22].map(h => (
                <TouchableOpacity
                  key={h}
                  style={[styles.shortcut, hour === h && minute === 0 && styles.shortcutActive]}
                  onPress={() => { setHour(h); setMinute(0); }}
                  accessibilityRole="button"
                  accessibilityLabel={`${pad(h)}:00`}
                >
                  <Text style={[styles.shortcutText, hour === h && minute === 0 && styles.shortcutTextActive]}>
                    {pad(h)}h
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Out-of-range explanation (instead of a silently refused confirm) */}
            {(tooEarly || tooLate) && (
              <Text style={styles.rangeError} accessibilityLiveRegion="polite">
                {tooEarly
                  ? t('datetime_too_early', { min: formatShort(minDate!) })
                  : t('datetime_too_late',  { max: formatShort(maxDate!) })}
              </Text>
            )}

            {/* Confirm button */}
            <TouchableOpacity
              style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!canConfirm}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canConfirm }}
            >
              <Check size={18} color={canConfirm ? colors.textInverse : colors.textMuted} strokeWidth={2.5} />
              <Text style={[styles.confirmText, !canConfirm && styles.confirmTextDisabled]}>
                {candidate
                  ? `${t('datetime_confirm_prefix')} — ${formatShort(candidate)}`
                  : t('datetime_select_date_first')
                }
              </Text>
            </TouchableOpacity>

          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const CELL_SIZE = 40;

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing[3] },
  label: {
    fontFamily:    fontFamily.bodyMedium,
    fontSize:      fontSize.xs,
    color:         colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  spacing[1] + 2,
  },
  labelError: { color: colors.danger },

  trigger: {
    flexDirection:     'row',
    alignItems:        'center',
    height:            52,
    borderRadius:      radius.xl,
    backgroundColor:   colors.surface,
    borderWidth:       1,
    borderColor:       colors.border,
    paddingHorizontal: spacing[4],
    gap:               spacing[3],
  },
  triggerError:  { borderColor: colors.danger, borderWidth: 1.5 },
  triggerFilled: { borderColor: colors.primary, borderWidth: 1.5 },
  triggerText: {
    flex:       1,
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.sm,
    color:      colors.textPrimary,
  },
  triggerPlaceholder: { color: colors.textMuted, fontFamily: fontFamily.body },
  error: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.danger, marginTop: spacing[1] },
  hint:  { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing[1] },

  // Modal
  overlay: {
    flex:            1,
    backgroundColor: colors.overlay,
    justifyContent:  'flex-end',
  },
  sheet: {
    backgroundColor: colors.backgroundElevatedSolid,
    borderTopLeftRadius:  radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingHorizontal:    spacing[5],
    paddingTop:           spacing[5],
    paddingBottom:        spacing[8],
    gap:                  spacing[4],
  },
  sheetHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize.lg,
    color:         colors.textPrimary,
    letterSpacing: -0.3,
  },

  // Calendar nav
  calNav: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
  },
  calTitle: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize.base,
    color:         colors.textPrimary,
    letterSpacing: -0.2,
    textTransform: 'capitalize',
  },

  // Day names
  dayNames: { flexDirection: 'row', justifyContent: 'space-around' },
  dayName: {
    width:     CELL_SIZE,
    textAlign: 'center',
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing:  0.5,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    justifyContent:'space-around',
    gap:           spacing[1],
  },
  cell: {
    width:          CELL_SIZE,
    height:         CELL_SIZE,
    borderRadius:   CELL_SIZE / 2,
    alignItems:     'center',
    justifyContent: 'center',
  },
  cellToday:    { borderWidth: 1.5, borderColor: colors.primary },
  cellSelected: { backgroundColor: colors.primary },
  cellDisabled: { opacity: 0.25 },
  cellText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.sm,
    color:      colors.textPrimary,
  },
  cellTextToday:    { color: colors.primary },
  cellTextSelected: { color: colors.textInverse },
  cellTextDisabled: { color: colors.textMuted },

  // Time separator
  timeSep: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  timeSepLine: { flex: 1, height: 1, backgroundColor: colors.border },
  timeSepLabel: {
    fontFamily:    fontFamily.bodyMedium,
    fontSize:      10,
    color:         colors.textMuted,
    letterSpacing: 1.2,
  },

  // Time picker
  timePicker: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            spacing[5],
  },
  timeWheel: {
    alignItems:     'center',
    gap:            spacing[2],
  },
  wheelBtn: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.borderPrimary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  wheelValue: {
    flexDirection:  'row',
    alignItems:     'baseline',
    gap:            4,
    paddingHorizontal: spacing[5],
    paddingVertical:   spacing[3],
    backgroundColor:   colors.primarySurface,
    borderRadius:      radius.xl,
    borderWidth:       1,
    borderColor:       colors.borderPrimary,
    minWidth:          80,
    justifyContent:    'center',
  },
  wheelNumber: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize['2xl'],
    color:         colors.primary,
    letterSpacing: -1,
  },
  wheelUnit: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },
  timeSeparator: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize['2xl'],
    color:         colors.primary,
    letterSpacing: -1,
  },

  // Shortcuts
  shortcuts: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing[2],
    justifyContent:'center',
  },
  shortcut: {
    paddingHorizontal: spacing[3],
    minHeight:         36,
    justifyContent:    'center',
    borderRadius:      radius.full,
    backgroundColor:   colors.surface,
    borderWidth:       1,
    borderColor:       colors.border,
  },
  shortcutActive: {
    backgroundColor: colors.primarySurface,
    borderColor:     colors.primary,
  },
  shortcutText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.xs,
    color:      colors.textSecondary,
  },
  shortcutTextActive: { color: colors.primary },

  rangeError: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.sm,
    color:      colors.warning,
    textAlign:  'center',
  },

  // Confirm
  confirmBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing[2],
    backgroundColor: colors.primary,
    borderRadius:    radius.xl,
    height:          52,
    shadowColor:     colors.primary,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.35,
    shadowRadius:    12,
    elevation:       6,
  },
  confirmBtnDisabled: { backgroundColor: colors.surfaceBorder, shadowOpacity: 0, elevation: 0 },
  // Navy on gold (white on #bc933b failed WCAG contrast).
  confirmText: {
    fontFamily:    fontFamily.bodySemiBold,
    fontSize:      fontSize.base,
    color:         colors.textInverse,
    letterSpacing: 0.1,
  },
  confirmTextDisabled: { color: colors.textMuted },
});
