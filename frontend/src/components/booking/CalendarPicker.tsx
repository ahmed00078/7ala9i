import React from 'react';
import { StyleSheet } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { colors } from '../../theme/colors';
import { format, addDays } from 'date-fns';

// Configure Arabic locale
LocaleConfig.locales['ar'] = {
  monthNames: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
  monthNamesShort: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
  dayNames: ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],
  dayNamesShort: ['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'],
  today: 'اليوم',
};
LocaleConfig.locales['fr'] = {
  monthNames: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  monthNamesShort: ['Janv.','Févr.','Mars','Avril','Mai','Juin','Juil.','Août','Sept.','Oct.','Nov.','Déc.'],
  dayNames: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
  dayNamesShort: ['Dim.','Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.'],
  today: "Aujourd'hui",
};

interface CalendarPickerProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  language?: string;
}

export function CalendarPicker({ selectedDate, onSelectDate, language = 'ar' }: CalendarPickerProps) {
  LocaleConfig.defaultLocale = language === 'en' ? '' : language;

  const today = format(new Date(), 'yyyy-MM-dd');
  const maxDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');

  return (
    <Calendar
      current={selectedDate || today}
      minDate={today}
      maxDate={maxDate}
      onDayPress={(day: { dateString: string }) => onSelectDate(day.dateString)}
      markedDates={{
        [selectedDate]: { selected: true, selectedColor: colors.black },
      }}
      theme={{
        selectedDayBackgroundColor: colors.black,
        todayTextColor: colors.accent,
        arrowColor: colors.black,
        textDayFontSize: 14,
        textMonthFontSize: 16,
        textDayHeaderFontSize: 12,
      }}
      style={styles.calendar}
    />
  );
}

const styles = StyleSheet.create({
  calendar: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
