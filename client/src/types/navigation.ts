export type AuthStackParamList = {
  Login: undefined;
};

export type AppStackParamList = {
  Redirect: undefined;
  Home: undefined;
  ProfileList: undefined;
  ProfileForm: { profileId?: number } | undefined;
  WeeklyCheckIn: { profileId: number };
  CheckInDetail: { profileId: number; checkInId: number };
  MedicationInventory: { profileId: number };
  MedicationForm: { profileId: number; medicationId?: number };
  RoutineRegistration: { profileId: number };
  RoutineForm: { profileId: number; routineId?: number };
};
