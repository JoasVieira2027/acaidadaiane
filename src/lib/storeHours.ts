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

  if (todaySchedules.length === 0) {
    return {
      isOpen: false,
      message: settings.closed_message || 'Não atendemos neste dia da semana. Confira nossos horários!',
      reason: 'outside_hours',
    };
  }

  // Verificar se o horário atual está dentro de algum intervalo do dia
  const matchingSchedule = todaySchedules.find((sched) => {
    return currentTimeString >= sched.open_time && currentTimeString <= sched.close_time;
  });

  if (matchingSchedule) {
    return {
      isOpen: true,
      message: settings.open_message || `Aberto hoje até às ${matchingSchedule.close_time}`,
      reason: 'regular_schedule',
      nextOpenTime: matchingSchedule.close_time,
    };
  }

  // Se não estiver dentro de nenhum horário de hoje, pegar o próximo horário
  const upcomingToday = todaySchedules
    .filter((sched) => sched.open_time > currentTimeString)
    .sort((a, b) => a.open_time.localeCompare(b.open_time))[0];

  if (upcomingToday) {
    return {
      isOpen: false,
      message: `Fechado no momento. Abriremos hoje às ${upcomingToday.open_time}`,
      reason: 'outside_hours',
      nextOpenTime: upcomingToday.open_time,
    };
  }

  return {
    isOpen: false,
    message: settings.closed_message || 'Loja fechada no momento. Consulte nosso cardápio e volte logo!',
    reason: 'outside_hours',
  };
}
