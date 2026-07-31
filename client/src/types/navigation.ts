import type { Intercorrence } from "../api/intercorrences";

export type AuthStackParamList = {
  Login: undefined;
};

export type AppStackParamList = {
  Redirect: undefined;
  Home: undefined;
  ProfileList: undefined;
  ProfileDetail: { profileId: number };
  ProfileIdentification: undefined;
  ProfileForm:
    | { profileId?: number; cpf?: string; birthDate?: string }
    | undefined;
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
