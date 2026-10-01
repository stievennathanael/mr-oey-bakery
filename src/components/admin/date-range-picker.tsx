'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

type DateRangePresetId =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'lastWeek'
  | 'last7Days'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'lastYear'
  | 'custom'

export type DateRangeValue = {
  startDate: string | null
  endDate: string | null
  startTime: string
  endTime: string
  preset: DateRangePresetId | null
}

type DateRangePickerProps = {
  value: DateRangeValue
  onChange: (value: DateRangeValue) => void
  ariaLabel?: string
}

const weekdayLabels = [
  'Min',
  'Sen',
  'Sel',
  'Rab',
  'Kam',
  'Jum',
  'Sab',
]

const dateRangeOptions: Array<{
  value: DateRangePresetId
  label: string
}> = [
  {
    value: 'today',
    label: 'Hari Ini',
  },
  {
    value: 'yesterday',
    label: 'Kemarin',
  },
  {
    value: 'thisWeek',
    label: 'Minggu Ini',
  },
  {
    value: 'lastWeek',
    label: 'Minggu Lalu',
  },
  {
    value: 'last7Days',
    label: '7 Hari Terakhir',
  },
  {
    value: 'thisMonth',
    label: 'Bulan Ini',
  },
  {
    value: 'lastMonth',
    label: 'Bulan Lalu',
  },
  {
    value: 'thisYear',
    label: 'Tahun Ini',
  },
  {
    value: 'lastYear',
    label: 'Tahun Lalu',
  },
  {
    value: 'custom',
    label: 'Rentang Khusus',
  },
]

export function createEmptyDateRangeValue(): DateRangeValue {
  return {
    startDate: null,
    endDate: null,
    startTime: '00:00',
    endTime: '23:59',
    preset: null,
  }
}

export function hasDateRange(
  value: DateRangeValue
) {
  return Boolean(value.startDate || value.endDate)
}

export function isDateInRange(
  value: string,
  range: DateRangeValue
) {
  if (!hasDateRange(range)) {
    return true
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return false
  }

  const start = getDateTime(
    range.startDate,
    range.startTime,
    'start'
  )
  const end = getDateTime(
    range.endDate,
    range.endTime,
    'end'
  )

  if (start && date.getTime() < start.getTime()) {
    return false
  }

  if (end && date.getTime() > end.getTime()) {
    return false
  }

  return true
}

function getDateTime(
  dateValue: string | null,
  timeValue: string,
  boundary: 'start' | 'end'
) {
  const date = parseInputDate(dateValue)

  if (!date) {
    return null
  }

  const fallback =
    boundary === 'start'
      ? {
          hours: 0,
          minutes: 0,
        }
      : {
          hours: 23,
          minutes: 59,
        }
  const time = parseTimeValue(timeValue, fallback)

  date.setHours(
    time.hours,
    time.minutes,
    boundary === 'start' ? 0 : 59,
    boundary === 'start' ? 0 : 999
  )

  return date
}

function parseTimeValue(
  value: string,
  fallback: {
    hours: number
    minutes: number
  }
) {
  const [hours, minutes] = value
    .split(':')
    .map(Number)

  if (
    Number.isInteger(hours) &&
    Number.isInteger(minutes) &&
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59
  ) {
    return {
      hours,
      minutes,
    }
  }

  return fallback
}

function parseInputDate(value: string | null) {
  if (!value) {
    return null
  }

  const [year, month, day] = value
    .split('-')
    .map(Number)

  if (!year || !month || !day) {
    return null
  }

  return new Date(year, month - 1, day)
}

function formatInputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0')
  const day = String(date.getDate()).padStart(
    2,
    '0'
  )

  return `${year}-${month}-${day}`
}

function formatDisplayDate(value: string | null) {
  const date = parseInputDate(value)

  if (!date) {
    return 'DD/MM/YYYY'
  }

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}

function formatDateRangeValue(
  value: DateRangeValue
) {
  if (!hasDateRange(value)) {
    return 'DD/MM/YYYY - DD/MM/YYYY'
  }

  return `${formatDisplayDate(
    value.startDate
  )} - ${formatDisplayDate(value.endDate)}`
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function addMonths(date: Date, months: number) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + months,
    1
  )
}

function startOfWeek(date: Date) {
  const next = startOfDay(date)
  next.setDate(
    next.getDate() - next.getDay()
  )
  return next
}

function endOfWeek(date: Date) {
  return endOfDay(addDays(startOfWeek(date), 6))
}

function startOfMonth(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  )
}

function endOfMonth(date: Date) {
  return endOfDay(
    new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0
    )
  )
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1)
}

function endOfYear(date: Date) {
  return endOfDay(
    new Date(date.getFullYear(), 11, 31)
  )
}

function getPresetValue(
  preset: DateRangePresetId
): DateRangeValue {
  const today = new Date()
  const yesterday = addDays(today, -1)
  const lastWeekStart = addDays(
    startOfWeek(today),
    -7
  )
  const lastMonth = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    1
  )
  const lastYear = new Date(
    today.getFullYear() - 1,
    0,
    1
  )

  const presetRanges: Record<
    Exclude<DateRangePresetId, 'custom'>,
    {
      start: Date
      end: Date
    }
  > = {
    today: {
      start: startOfDay(today),
      end: endOfDay(today),
    },
    yesterday: {
      start: startOfDay(yesterday),
      end: endOfDay(yesterday),
    },
    thisWeek: {
      start: startOfWeek(today),
      end: endOfWeek(today),
    },
    lastWeek: {
      start: lastWeekStart,
      end: endOfWeek(lastWeekStart),
    },
    last7Days: {
      start: startOfDay(addDays(today, -6)),
      end: endOfDay(today),
    },
    thisMonth: {
      start: startOfMonth(today),
      end: endOfMonth(today),
    },
    lastMonth: {
      start: startOfMonth(lastMonth),
      end: endOfMonth(lastMonth),
    },
    thisYear: {
      start: startOfYear(today),
      end: endOfYear(today),
    },
    lastYear: {
      start: startOfYear(lastYear),
      end: endOfYear(lastYear),
    },
  }

  if (preset === 'custom') {
    return {
      ...createEmptyDateRangeValue(),
      preset,
    }
  }

  const range = presetRanges[preset]

  return {
    startDate: formatInputDate(range.start),
    endDate: formatInputDate(range.end),
    startTime: '00:00',
    endTime: '23:59',
    preset,
  }
}

function getMonthDates(month: Date) {
  const firstDay = new Date(
    month.getFullYear(),
    month.getMonth(),
    1
  )
  const gridStart = addDays(
    firstDay,
    -firstDay.getDay()
  )

  return Array.from(
    {
      length: 42,
    },
    (_, index) => addDays(gridStart, index)
  )
}

function isSameDate(
  left: Date | null,
  right: Date | null
) {
  return Boolean(
    left &&
      right &&
      left.getFullYear() ===
        right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
  )
}

function isInSelectedRange(
  date: Date,
  start: Date | null,
  end: Date | null
) {
  if (!start || !end) {
    return false
  }

  const current = startOfDay(date).getTime()

  return (
    current >= startOfDay(start).getTime() &&
    current <= startOfDay(end).getTime()
  )
}

function getInitialMonth(value: DateRangeValue) {
  return (
    parseInputDate(value.startDate) ||
    startOfMonth(new Date())
  )
}

export default function DateRangePicker({
  value,
  onChange,
  ariaLabel = 'Pilih rentang tanggal',
}: DateRangePickerProps) {
  const wrapperRef =
    useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] =
    useState(() => getInitialMonth(value))

  const startDate = useMemo(
    () => parseInputDate(value.startDate),
    [value.startDate]
  )
  const endDate = useMemo(
    () => parseInputDate(value.endDate),
    [value.endDate]
  )
  const displayValue = formatDateRangeValue(
    value
  )
  const nextVisibleMonth = addMonths(
    visibleMonth,
    1
  )

  useEffect(() => {
    if (!open) {
      return
    }

    setVisibleMonth(getInitialMonth(value))
  }, [open, value])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener(
      'mousedown',
      handlePointerDown
    )
    document.addEventListener(
      'keydown',
      handleKeyDown
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handlePointerDown
      )
      document.removeEventListener(
        'keydown',
        handleKeyDown
      )
    }
  }, [])

  function selectPreset(
    preset: DateRangePresetId
  ) {
    const nextValue =
      preset === 'custom'
        ? {
            ...value,
            preset,
          }
        : getPresetValue(preset)

    onChange(nextValue)

    if (nextValue.startDate) {
      setVisibleMonth(getInitialMonth(nextValue))
    }
  }

  function selectDate(date: Date) {
    const selectedDate = formatInputDate(date)

    if (!value.startDate || value.endDate) {
      onChange({
        startDate: selectedDate,
        endDate: null,
        startTime: value.startTime || '00:00',
        endTime: value.endTime || '23:59',
        preset: 'custom',
      })
      return
    }

    if (
      startDate &&
      startOfDay(date).getTime() <
        startOfDay(startDate).getTime()
    ) {
      onChange({
        ...value,
        startDate: selectedDate,
        endDate: value.startDate,
        preset: 'custom',
      })
      return
    }

    onChange({
      ...value,
      endDate: selectedDate,
      preset: 'custom',
    })
  }

  function updateTime(
    key: 'startTime' | 'endTime',
    time: string
  ) {
    onChange({
      ...value,
      [key]: time,
      preset: hasDateRange(value)
        ? 'custom'
        : value.preset,
    })
  }

  function clearRange() {
    onChange(createEmptyDateRangeValue())
  }

  function renderMonth(month: Date) {
    const dates = getMonthDates(month)

    return (
      <div>
        <p className="mb-4 text-center text-sm font-bold text-slate-950">
          {monthLabel(month)}
        </p>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-800">
          {weekdayLabels.map((day) => (
            <span
              key={day}
              className="flex h-8 items-center justify-center"
            >
              {day}
            </span>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {dates.map((date) => {
            const selectedStart = isSameDate(
              date,
              startDate
            )
            const selectedEnd = isSameDate(
              date,
              endDate
            )
            const selected =
              selectedStart || selectedEnd
            const inRange = isInSelectedRange(
              date,
              startDate,
              endDate
            )
            const outsideMonth =
              date.getMonth() !== month.getMonth()

            return (
              <button
                key={date.toISOString()}
                type="button"
                onClick={() => selectDate(date)}
                className={`flex h-9 w-9 items-center justify-center rounded-md text-sm font-semibold transition ${
                  selected
                    ? 'bg-orange-500 text-white shadow-sm'
                    : inRange
                      ? 'bg-orange-50 text-orange-700'
                      : outsideMonth
                        ? 'text-slate-400 hover:bg-slate-100'
                        : 'text-slate-950 hover:bg-slate-100'
                }`}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={wrapperRef}
      className="relative"
    >
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex h-12 w-full items-center justify-between gap-3 rounded-lg border bg-white px-3 text-left text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200 ${
          hasDateRange(value)
            ? 'border-orange-300 text-slate-950'
            : 'border-slate-300 text-slate-500'
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Calendar className="h-5 w-5 shrink-0 text-orange-500" />
          <span className="truncate">
            {displayValue}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-1/2 z-30 mt-2 max-h-[82vh] w-[calc(100vw-2rem)] max-w-[760px] -translate-x-1/2 overflow-y-auto overflow-x-hidden rounded-lg border border-slate-200 bg-white shadow-xl sm:left-0 sm:w-[calc(100vw-3rem)] sm:translate-x-0 md:w-[720px]">
          <div className="grid md:grid-cols-[160px_1fr]">
            <div className="border-b border-slate-200 bg-slate-50 md:border-b-0 md:border-r">
              {dateRangeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    selectPreset(option.value)
                  }
                  className={`block w-full px-4 py-3 text-left text-sm font-semibold transition ${
                    value.preset === option.value
                      ? 'bg-orange-500 text-white'
                      : 'text-slate-700 hover:bg-orange-50 hover:text-orange-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Bulan sebelumnya"
                  onClick={() =>
                    setVisibleMonth((month) =>
                      addMonths(month, -1)
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  aria-label="Bulan berikutnya"
                  onClick={() =>
                    setVisibleMonth((month) =>
                      addMonths(month, 1)
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {renderMonth(visibleMonth)}
                {renderMonth(nextVisibleMonth)}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-slate-600">
                    Waktu Mulai
                  </span>
                  <input
                    type="time"
                    value={value.startTime}
                    onChange={(event) =>
                      updateTime(
                        'startTime',
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-slate-600">
                    Waktu Akhir
                  </span>
                  <input
                    type="time"
                    value={value.endTime}
                    onChange={(event) =>
                      updateTime(
                        'endTime',
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={clearRange}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Bersihkan
                </button>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
