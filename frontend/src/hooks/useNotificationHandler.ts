import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { navigationRef } from '../navigation/RootNavigator';

export function useNotificationHandler() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // No push in Expo Go
    if (Constants.appOwnership === 'expo') return;

    let receivedSub: { remove(): void } | undefined;
    let responseSub: { remove(): void } | undefined;

    import('expo-notifications').then((Notifications) => {
      // Foreground: invalidate caches so badges/lists update instantly
      receivedSub = Notifications.addNotificationReceivedListener((notification) => {
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });

        const notifType = notification.request.content.data?.notif_type as string | undefined;
        if (notifType?.startsWith('booking_')) {
          queryClient.invalidateQueries({ queryKey: ['bookings'] });
          queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['owner', 'appointments'] });
        }
      });

      // Tap: navigate to relevant screen
      responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        const notifType = data?.notif_type as string | undefined;

        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });

        if (!navigationRef.isReady()) return;

        switch (notifType) {
          // Client-side booking events → Appointments tab
          case 'booking_confirmed':
          case 'booking_cancelled_by_owner':
          case 'booking_rescheduled':
          case 'booking_reminder':
          case 'booking_completed':
          case 'booking_no_show':
            navigationRef.navigate('ClientMain', {
              screen: 'AppointmentsTab',
              params: { screen: 'Appointments' },
            });
            break;

          // Owner-side booking events → Calendar tab
          case 'booking_created':
          case 'booking_cancelled_by_client':
            navigationRef.navigate('OwnerMain', {
              screen: 'CalendarTab',
              params: { screen: 'Calendar' },
            });
            break;

          // New review → Salon preview tab
          case 'new_review':
            navigationRef.navigate('OwnerMain', {
              screen: 'PreviewTab',
              params: { screen: 'SalonPreview' },
            });
            break;

          default:
            break;
        }
      });
    });

    return () => {
      receivedSub?.remove();
      responseSub?.remove();
    };
  }, [queryClient]);
}
