import * as Linking from 'expo-linking';
import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';

const prefix = Linking.createURL('/');

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix, 'halagi://'],
  config: {
    screens: {
      ClientMain: {
        screens: {
          HomeTab: {
            screens: {
              SalonDetail: 'salon/:salonId',
            },
          },
        },
      },
    },
  },
};
