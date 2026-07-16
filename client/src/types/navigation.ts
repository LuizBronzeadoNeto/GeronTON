import type { Intercorrence } from "../api/intercorrences";

export type AuthStackParamList = {
  Login: undefined;
};

export type AppStackParamList = {
  Redirect: undefined;
  Home: undefined;
  ProfileList: undefined;
  ProfileDetail: { profileId: number };
  ProfileForm: { profileId?: number } | undefined;
  IntercorrenceForm: { profileId: number };
  IntercorrenceConfirmation: {
    profileId: number;
    intercorrence: Intercorrence;
  };
  IntercorrenceList: { profileId: number };
  WeeklyCheckIn: { profileId: number };
  CheckInDetail: { profileId: number; checkInId: number };
  MedicationInventory: { profileId: number };
  MedicationForm: { profileId: number; medicationId?: number };
  RoutineRegistration: { profileId: number };
};
