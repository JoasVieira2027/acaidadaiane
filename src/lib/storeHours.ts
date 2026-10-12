import { BusinessHour, SpecialClosure, StoreCurrentStatus, StoreSettings } from './types';

/**
 * Obtém a data e horário atual no fuso horário oficial da loja (America/Recife - UTC-3)
 */
export function getRecifeNow(): {
  now: Date;
  dayOfWeek: number; // 0=Domingo, 1=Segunda, ..., 6=Sábado
  currentTimeString: string; // "HH:MM"
  currentDateString: string; // "YYYY-MM-DD"
} {
  const now = new Date();
  
  // Formatadores no fuso de Recife
  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Recife',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Recife',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Recife',
    weekday: 'short',
  });

  const currentTimeString = timeFormatter.format(now);
  const currentDateString = dateFormatter.format(now);
  const weekdayShort = weekdayFormatter.format(now);

  const daysMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const dayOfWeek = daysMap[weekdayShort] ?? now.getDay();

  return {
    now,
    dayOfWeek,
    currentTimeString,
    currentDateString,
  };
}

/**
 * Calcula o estado atual da loja considerando manual overrides, feriados e horários cadastrados
 */
export function calculateStoreStatus(
  settings: StoreSettings,
  hours: BusinessHour[],
  specialClosures: SpecialClosure[] = []
): StoreCurrentStatus {
  // 1. Prioridade Máxima: Abertura manual forçada
  if (settings.is_manually_opened) {
    return {
      isOpen: true,
      message: settings.open_message || 'Loja aberta excepcionalmente por controle manual!',
      reason: 'manually_opened',
    };
  }

  // 2. Fechamento manual forçado
  if (settings.is_manually_closed) {
    return {
      isOpen: false,
      message: settings.closed_message || 'Loja fechada temporariamente por controle manual.',
      reason: 'manually_closed',
    };
  }

  const { dayOfWeek, currentTimeString, currentDateString } = getRecifeNow();

  // 3. Verificar fechamentos especiais (feriados, férias, etc.)
  const activeClosure = specialClosures.find((closure) => {
    return currentDateString >= closure.start_date && currentDateString <= closure.end_date;
  });

  if (activeClosure) {
    return {
      isOpen: false,
      message: `Fechado: ${activeClosure.title}. ${activeClosure.notes ? activeClosure.notes : ''}`.trim(),
      reason: 'special_closure',
    };
  }

  // 4. Verificar horários cadastrados para o dia da semana atual
  const todaySchedules = hours.filter(
    (h) => h.day_of_week === dayOfWeek && !h.is_closed
  );

  // Verificar se o horário atual está dentro de algum intervalo do dia
  const matchingSchedule = todaySchedules.find((sched) => {
    return currentTimeString >= sched.open_time && currentTimeString <= sched.close_time;
  });

  if (matchingSchedule) {
    const closeTimeFormatted = matchingSchedule.close_time.slice(0, 5).replace(':', 'h');
    return {
      isOpen: true,
      message: settings.open_message || `Aberto hoje até às ${closeTimeFormatted}`,
      reason: 'regular_schedule',
      nextCloseTime: closeTimeFormatted,
    };
  }

  // Se não estiver aberto agora, verificar se ainda abre hoje
  const upcomingToday = todaySchedules
    .filter((sched) => sched.open_time > currentTimeString)
    .sort((a, b) => a.open_time.localeCompare(b.open_time))[0];

  if (upcomingToday) {
    const openTimeFormatted = upcomingToday.open_time.slice(0, 5).replace(':', 'h');
    return {
      isOpen: false,
      message: `Fechado no momento. Abriremos hoje às ${openTimeFormatted}`,
      reason: 'outside_hours',
      nextOpenTime: openTimeFormatted,
    };
  }

  // Se já passou o horário de hoje ou hoje é fechado, procurar o próximo dia que abre
  for (let offset = 1; offset <= 7; offset++) {
    const nextDay = (dayOfWeek + offset) % 7;
    const nextDaySchedules = hours.filter((h) => h.day_of_week === nextDay && !h.is_closed);
    if (nextDaySchedules.length > 0) {
      const firstOpen = nextDaySchedules.sort((a, b) => a.open_time.localeCompare(b.open_time))[0];
      const openTimeFormatted = firstOpen.open_time.slice(0, 5).replace(':', 'h');
      return {
        isOpen: false,
        message: `Fechado no momento. Abriremos às ${openTimeFormatted}`,
        reason: 'outside_hours',
        nextOpenTime: openTimeFormatted,
      };
    }
  }

  return {
    isOpen: false,
    message: settings.closed_message || 'Loja fechada no momento.',
    reason: 'outside_hours',
  };
}
