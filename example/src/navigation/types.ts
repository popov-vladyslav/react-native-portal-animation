export enum Screens {
  screen1 = 'screen-1',
  screen2 = 'screen-2',
  screen3 = 'screen-3',
}

export type RootStackParamList = {
  [Screens.screen1]: undefined;
  [Screens.screen2]: undefined;
  [Screens.screen3]: undefined;
};
