/**
 * DateTimePicker — fully custom date & time picker. Zero external deps.
 *
 * Design:
 *  - Month/Year navigator header
 *  - Calendar grid (7 columns Mon→Sun)
 *  - Hour : Minute scroll wheels (infinite-feel with clamped range)
 *  - Compact summary pill when value is set
 *  - Gold brand colors, navy surfaces
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  ScrollView, StyleSheet, Pressable,
} from 'react-native';
import { Calendar, Clock, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Check, X } from 'lucide-react-native';
import { colors } from '@theme/colors';
import { spacing, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';

interface Props {
  label:     string;
  value:     string;   // ISO datetime string "YYYY-MM-DDTHH:MM"
  onChange:  (iso: string) => void;
  minDate?:  Date;
  error?:    string;
  hint?:     string;
}

const DAYS_FR  = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
const MONTHS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');

function parseISO(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function toISO(d: Date, h: number, m: number): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(h)}:${pad(m)}`;
}

function formatDisplay(iso: string): string {
  const d = parseISO(iso);
  if (!d) return '';
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    + ' à ' + iso.split('T')[1];
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Returns 0=Monday offset of the first day of the month */
function firstDayOffset(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay(); // 0=Sun
  return d === 0 ? 6 : d - 1;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const DateTimePicker: React.FC<Props> = ({
  label, value, onChange, minDate, error, hint,
}) => {
  const now       = new Date();
  const parsed    = parseISO(value);
  const initDate  = parsed ?? new Date(now.getTime() + 24 * 3_600_000);

  const [open,        setOpen]        = useState(false);
  const [viewYear,    setViewYear]    = useState(initDate.getFullYear());
  const [viewMonth,   setViewMonth]   = useState(initDate.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date | null>(parsed);
  const [hour,        setHour]        = useState(parsed?.getHours()   ?? 9);
  const [minute,      setMinute]      = useState(parsed?.getMinutes() ?? 0);

  const daysInMonth  = getDaysInMonth(viewYear, viewMonth);
  const firstOffset  = firstDayOffset(viewYear, viewMonth);
  const cells        = useMemo(() => {
    const arr: (number | null)[] = Array(firstOffset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [viewYear, viewMonth, firstOffset, daysInMonth]);

  const isDisabled = useCallback((day: number) => {
    if (!minDate) return false;
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0, 0, 0, 0);
    const m = new Date(minDate);
    m.setHours(0, 0, 0, 0);
    return d < m;
  }, [viewYear, viewMonth, minDate]);

  const isSelected = useCallback((day: number) => {
    if (!selectedDay) return false;
    return selectedDay.getFullYear() === viewYear
      && selectedDay.getMonth()     === viewMonth
      && selectedDay.getDate()      === day;
  }, [selectedDay, viewYear, viewMonth]);

  const isToday = useCallback((day: number) => {
    return now.getFullYear() === viewYear
      && now.getMonth()     === viewMonth
      && now.getDate()      === day;
  }, [viewYear, viewMonth]);

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
    setSelectedDay(new Date(viewYear, viewMonth, day));
  };

  const handleConfirm = () => {
    if (!selectedDay) return;
    onChange(toISO(selectedDay, hour, minute));
    setOpen(false);
  };

  const handleHour = (delta: number) => {
    setHour(h => Math.min(23, Math.max(0, h + delta)));
  };
  const handleMinute = (delta: number) => {
    setMinute(m => Math.min(55, Math.max(0, m + delta)));
  };

  return (
    <>
      {/* ── Trigger ───────────────────────────────────────────────────────── */}
      <View style={styles.wrapper}>
        <Text style={[styles.label, error && styles.labelError]}>{label}</Text>

        <TouchableOpacity
          style={[styles.trigger, error && styles.triggerError, value && styles.triggerFilled]}
          onPress={() => setOpen(true)}
          activeOpacity={0.8}
        >
          <Calendar size={16} color={value ? colors.primary : colors.textMuted} strokeWidth={1.8} />
          <Text style={[styles.triggerText, !value && styles.triggerPlaceholder]}>
            {value ? formatDisplay(value) : 'Sélectionner date & heure'}
          </Text>
          {value && <Clock size={14} color={colors.primary} strokeWidth={1.8} />}
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
              <Text style={styles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* ── Calendar ────────────────────────────────────────────────── */}
            <View style={styles.calNav}>
              <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                <ChevronLeft size={18} color={colors.textPrimary} strokeWidth={2} />
              </TouchableOpacity>
              <Text style={styles.calTitle}>
                {MONTHS_FR[viewMonth]} {viewYear}
              </Text>
              <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                <ChevronRight size={18} color={colors.textPrimary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Day names */}
            <View style={styles.dayNames}>
              {DAYS_FR.map(d => (
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
              <Text style={styles.timeSepLabel}>HEURE</Text>
              <View style={styles.timeSepLine} />
            </View>

            <View style={styles.timePicker}>
              {/* Hour */}
              <View style={styles.timeWheel}>
                <TouchableOpacity onPress={() => handleHour(1)} style={styles.wheelBtn}>
                  <ChevronUp size={18} color={colors.primary} strokeWidth={2.5} />
                </TouchableOpacity>
                <View style={styles.wheelValue}>
                  <Text style={styles.wheelNumber}>{pad(hour)}</Text>
                  <Text style={styles.wheelUnit}>h</Text>
                </View>
                <TouchableOpacity onPress={() => handleHour(-1)} style={styles.wheelBtn}>
                  <ChevronDown size={18} color={colors.primary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              <Text style={styles.timeSeparator}>:</Text>

              {/* Minute — steps of 5 */}
              <View style={styles.timeWheel}>
                <TouchableOpacity onPress={() => setMinute(m => Math.min(55, m + 5))} style={styles.wheelBtn}>
                  <ChevronUp size={18} color={colors.primary} strokeWidth={2.5} />
                </TouchableOpacity>
                <View style={styles.wheelValue}>
                  <Text style={styles.wheelNumber}>{pad(minute)}</Text>
                  <Text style={styles.wheelUnit}>min</Text>
                </View>
                <TouchableOpacity onPress={() => setMinute(m => Math.max(0, m - 5))} style={styles.wheelBtn}>
                  <ChevronDown size={18} color={colors.primary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick shortcuts */}
            <View style={styles.shortcuts}>
              {[8, 9, 10, 12, 14, 18, 20, 22].map(h => (
                <TouchableOpacity
                  key={h}
                  style={[styles.shortcut, hour === h && styles.shortcutActive]}
                  onPress={() => { setHour(h); setMinute(0); }}
                >
                  <Text style={[styles.shortcutText, hour === h && styles.shortcutTextActive]}>
                    {pad(h)}h
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Confirm button */}
            <TouchableOpacity
              style={[styles.confirmBtn, !selectedDay && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!selectedDay}
              activeOpacity={0.85}
            >
              <Check size={18} color="#fff" strokeWidth={2.5} />
              <Text style={styles.confirmText}>
                {selectedDay
                  ? `Confirmer — ${selectedDay.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${pad(hour)}:${pad(minute)}`
                  : 'Sélectionnez une date'
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
    backgroundColor: 'rgba(5,23,43,0.80)',
    justifyContent:  'flex-end',
  },
  sheet: {
    backgroundColor: colors.backgroundElevated,
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
    width:           36,
    height:          36,
    borderRadius:    18,
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
    width:           40,
    height:          40,
    borderRadius:    20,
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
    paddingVertical:   spacing[1] + 2,
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

  // Confirm
  confirmBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing[2],
    backgroundColor: colors.primary,
    borderRadius:    radius.xl,
    height:          52,
    shadowColor:     '#bc933b',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.35,
    shadowRadius:    12,
    elevation:       6,
  },
  confirmBtnDisabled: { backgroundColor: colors.surfaceBorder, shadowOpacity: 0 },
  confirmText: {
    fontFamily:    fontFamily.bodySemiBold,
    fontSize:      fontSize.base,
    color:         '#fff',
    letterSpacing: 0.1,
  },
});
