import { useState, createContext, useContext } from 'react';

type CalendarView = 'day' | 'week' | 'month';

interface CalendarContextProps {
  calendarView: CalendarView;
  setCalendarView: (view: CalendarView) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

const CalendarContext = createContext<CalendarContextProps | undefined>(undefined);

export const CalendarProvider = ({ children }: { children: React.ReactNode }) => {
  const [calendarView, setCalendarView] = useState<CalendarView>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  return (
    <CalendarContext.Provider value={{ calendarView, setCalendarView, currentDate, setCurrentDate }}>
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
};
