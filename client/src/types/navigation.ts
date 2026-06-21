export type AuthStackParamList = {
  Login: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  ProfileList: undefined;
  ProfileForm: { profileId?: number } | undefined;
  WeeklyCheckIn: { profileId: number };
  CheckInDetail: { profileId: number; checkInId: number };
};
