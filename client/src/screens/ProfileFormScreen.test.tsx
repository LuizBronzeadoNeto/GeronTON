import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProfileFormScreen } from "./ProfileFormScreen";
import type { AppStackParamList } from "../types/navigation";
import {
  createProfile,
  getProfile,
  updateProfile,
  type Profile,
} from "../api/profiles";
import {
  getRiskStatus,
  subscribeRiskStatusInvalidation,
  type RiskStatus,
} from "../api/risk";

jest.mock("../api/profiles");
jest.mock("../api/risk");

const MOCK_RISK: RiskStatus = {
  profileId: 7,
  status: "low",
  score: 0,
  evaluatedAt: "2026-06-15T00:00:00.000Z",
};

const MOCK_PROFILE: Profile = {
  id: 7,
  firstName: "Ozilene",
  lastName: "Leite da Silva",
  birthDate: "1947-11-05T00:00:00.000Z",
  sex: "Feminino",
  scholarship: "Superior completo",
  medicalConditions: ["Diabetes", "Sarcopenia"],
  notes: "Prefere visitas pela manhã",
  caregiverId: 1,
};

type Props = NativeStackScreenProps<AppStackParamList, "ProfileForm">;

function renderForm(params?: { profileId?: number }) {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  const props = { navigation, route: { params } } as unknown as Props;
  return { navigation, ...render(<ProfileFormScreen {...props} />) };
}

function fillRequiredFields() {
  fireEvent.changeText(screen.getByTestId("profile-fullName"), "João da Silva");
  fireEvent.changeText(screen.getByTestId("profile-birthDate"), "20051950");
  fireEvent.press(screen.getByTestId("profile-scholarship"));
  fireEvent.press(
    screen.getByTestId("profile-scholarship-option-Fundamental completo"),
  );
}

describe("ProfileFormScreen", () => {
  beforeEach(() => {
    jest
      .mocked(createProfile)
      .mockReset()
      .mockResolvedValue({} as never);
    jest
      .mocked(updateProfile)
      .mockReset()
      .mockResolvedValue({} as never);
    jest.mocked(getProfile).mockReset().mockResolvedValue(MOCK_PROFILE);
    jest.mocked(getRiskStatus).mockReset().mockResolvedValue(MOCK_RISK);
    jest
      .mocked(subscribeRiskStatusInvalidation)
      .mockReset()
      .mockReturnValue(() => {});
  });

  it("renders the registration title and fields when no profileId is given", () => {
    renderForm();

    expect(screen.getByTestId("profile-form-title").props.children).toBe(
      "Cadastrar idoso",
    );
    expect(screen.getByTestId("profile-fullName")).toBeTruthy();
    expect(screen.getByTestId("profile-birthDate")).toBeTruthy();
    expect(screen.getByTestId("profile-sex")).toBeTruthy();
    expect(screen.getByTestId("profile-scholarship")).toBeTruthy();
    expect(screen.getByTestId("profile-condition-Hipertensão")).toBeTruthy();
    expect(screen.getByTestId("profile-notes")).toBeTruthy();
  });

  it("masks the birth date as DD/MM/AAAA while typing", () => {
    renderForm();

    fireEvent.changeText(screen.getByTestId("profile-birthDate"), "05111947");

    expect(screen.getByTestId("profile-birthDate").props.value).toBe(
      "05/11/1947",
    );
  });

  it("keeps submit disabled until name, date and scholarship are valid", () => {
    renderForm();

    expect(
      screen.getByTestId("profile-submit").props.accessibilityState.disabled,
    ).toBe(true);

    fireEvent.changeText(screen.getByTestId("profile-fullName"), "João");
    fireEvent.changeText(screen.getByTestId("profile-birthDate"), "20051950");
    fireEvent.press(screen.getByTestId("profile-scholarship"));
    fireEvent.press(
      screen.getByTestId("profile-scholarship-option-Médio completo"),
    );

    expect(
      screen.getByTestId("profile-submit").props.accessibilityState.disabled,
    ).toBe(true);

    fireEvent.changeText(
      screen.getByTestId("profile-fullName"),
      "João da Silva",
    );

    expect(
      screen.getByTestId("profile-submit").props.accessibilityState.disabled,
    ).toBe(false);
  });

  it("creates a profile splitting the full name and converting the date", async () => {
    const { navigation } = renderForm();

    fillRequiredFields();
    fireEvent.press(screen.getByTestId("profile-sex"));
    fireEvent.press(screen.getByTestId("profile-sex-option-Masculino"));
    fireEvent.press(screen.getByTestId("profile-condition-Diabetes"));
    fireEvent.changeText(
      screen.getByTestId("profile-condition-input"),
      "Sarcopenia",
    );
    fireEvent.press(screen.getByTestId("profile-condition-add"));
    fireEvent.changeText(screen.getByTestId("profile-notes"), "Obs geral");

    fireEvent.press(screen.getByTestId("profile-submit"));

    await waitFor(() => expect(createProfile).toHaveBeenCalled());
    expect(createProfile).toHaveBeenCalledWith({
      firstName: "João",
      lastName: "da Silva",
      birthDate: "1950-05-20",
      sex: "Masculino",
      scholarship: "Fundamental completo",
      medicalConditions: ["Diabetes", "Sarcopenia"],
      notes: "Obs geral",
    });
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
  });

  it("removes a custom condition when its chip is pressed", () => {
    renderForm();

    fireEvent.changeText(
      screen.getByTestId("profile-condition-input"),
      "Sarcopenia",
    );
    fireEvent.press(screen.getByTestId("profile-condition-add"));
    expect(
      screen.getByTestId("profile-condition-remove-Sarcopenia"),
    ).toBeTruthy();

    fireEvent.press(screen.getByTestId("profile-condition-remove-Sarcopenia"));

    expect(
      screen.queryByTestId("profile-condition-remove-Sarcopenia"),
    ).toBeNull();
  });

  it("loads and populates the profile when editing", async () => {
    renderForm({ profileId: 7 });

    await waitFor(() => expect(getProfile).toHaveBeenCalledWith(7));
    expect(screen.getByTestId("profile-form-title").props.children).toBe(
      "Editar idoso",
    );
    expect(screen.getByTestId("profile-fullName").props.value).toBe(
      "Ozilene Leite da Silva",
    );
    expect(screen.getByTestId("profile-birthDate").props.value).toBe(
      "05/11/1947",
    );
    expect(screen.getByTestId("profile-notes").props.value).toBe(
      "Prefere visitas pela manhã",
    );
    expect(
      screen.getByTestId("profile-condition-remove-Sarcopenia"),
    ).toBeTruthy();
  });

  it("updates the profile when editing and submitting", async () => {
    renderForm({ profileId: 7 });
    await waitFor(() => expect(getProfile).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId("profile-submit"));

    await waitFor(() => expect(updateProfile).toHaveBeenCalled());
    expect(updateProfile).toHaveBeenCalledWith(7, {
      firstName: "Ozilene",
      lastName: "Leite da Silva",
      birthDate: "1947-11-05",
      sex: "Feminino",
      scholarship: "Superior completo",
      medicalConditions: ["Diabetes", "Sarcopenia"],
      notes: "Prefere visitas pela manhã",
    });
  });

  it("shows an error when saving fails", async () => {
    jest.mocked(createProfile).mockRejectedValueOnce(new Error("boom"));
    renderForm();
    fillRequiredFields();

    fireEvent.press(screen.getByTestId("profile-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("profile-form-error")).toBeTruthy(),
    );
  });
});
