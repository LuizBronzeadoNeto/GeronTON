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
import { createProfile, getProfile, updateProfile } from "../api/profiles";

jest.mock("../api/profiles");

type Props = NativeStackScreenProps<AppStackParamList, "ProfileForm">;

function renderForm(params?: { profileId?: number }) {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  const props = { navigation, route: { params } } as unknown as Props;
  return { navigation, ...render(<ProfileFormScreen {...props} />) };
}

function fillRequiredFields() {
  fireEvent.changeText(screen.getByTestId("profile-firstName"), "João");
  fireEvent.changeText(screen.getByTestId("profile-lastName"), "Silva");
  fireEvent.changeText(screen.getByTestId("profile-birthDate"), "1950-05-20");
  fireEvent.changeText(screen.getByTestId("profile-scholarship"), "fundamental");
}

describe("ProfileFormScreen", () => {
  beforeEach(() => {
    jest.mocked(createProfile).mockReset().mockResolvedValue({} as never);
    jest.mocked(updateProfile).mockReset().mockResolvedValue({} as never);
    jest.mocked(getProfile).mockReset();
  });

  it("renders the registration title and fields when no profileId is given", () => {
    renderForm();

    expect(screen.getByTestId("profile-form-title").props.children).toBe(
      "Cadastrar idoso",
    );
    expect(screen.getByTestId("profile-firstName")).toBeTruthy();
    expect(screen.getByTestId("profile-lastName")).toBeTruthy();
    expect(screen.getByTestId("profile-birthDate")).toBeTruthy();
    expect(screen.getByTestId("profile-scholarship")).toBeTruthy();
    expect(screen.getByTestId("profile-medicalConditions")).toBeTruthy();
  });

  it("captures typed values", () => {
    renderForm();

    fireEvent.changeText(screen.getByTestId("profile-firstName"), "Maria");
    expect(screen.getByTestId("profile-firstName").props.value).toBe("Maria");
  });

  it("creates a profile only once the required fields are filled", async () => {
    const { navigation } = renderForm();

    fireEvent.press(screen.getByTestId("profile-submit"));
    expect(createProfile).not.toHaveBeenCalled();

    fillRequiredFields();
    fireEvent.changeText(
      screen.getByTestId("profile-medicalConditions"),
      "hipertensão, diabetes",
    );
    fireEvent.press(screen.getByTestId("profile-submit"));

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(createProfile).toHaveBeenCalledWith({
      firstName: "João",
      lastName: "Silva",
      birthDate: "1950-05-20",
      scholarship: "fundamental",
      medicalConditions: ["hipertensão", "diabetes"],
    });
  });

  it("loads the profile and updates it in edit mode", async () => {
    jest.mocked(getProfile).mockResolvedValue({
      id: 7,
      firstName: "Ana",
      lastName: "Costa",
      birthDate: "1945-01-02T00:00:00.000Z",
      scholarship: "médio",
      medicalConditions: ["artrite"],
      caregiverId: 1,
    });

    const { navigation } = renderForm({ profileId: 7 });

    await waitFor(() =>
      expect(screen.getByTestId("profile-form-title").props.children).toBe(
        "Editar idoso",
      ),
    );
    expect(screen.getByTestId("profile-firstName").props.value).toBe("Ana");
    expect(screen.getByTestId("profile-birthDate").props.value).toBe("1945-01-02");

    fireEvent.press(screen.getByTestId("profile-submit"));

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(updateProfile).toHaveBeenCalledWith(7, expect.objectContaining({ firstName: "Ana" }));
  });
});
