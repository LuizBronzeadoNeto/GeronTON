export type AuthStackParamList = {
  Login: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  ProfileList: undefined;
  ProfileForm: { profileId?: number } | undefined;
  WeeklyCheckIn: { profileId: number };
  MedicationInventory: { profileId: number };
  MedicationForm: { profileId: number; medicationId?: number };
  RoutineRegistration: { profileId: number };
  RoutineForm: { profileId: number; routineId?: number };
};
