import { describe, it, expect, jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProfileFormScreen } from "./ProfileFormScreen";
import type { AppStackParamList } from "../types/navigation";

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

  it("renders the edit title when a profileId is given", () => {
    renderForm({ profileId: 7 });

    expect(screen.getByTestId("profile-form-title").props.children).toBe(
      "Editar idoso",
    );
  });

  it("captures typed values", () => {
    renderForm();

    fireEvent.changeText(screen.getByTestId("profile-firstName"), "Maria");
    expect(screen.getByTestId("profile-firstName").props.value).toBe("Maria");
  });

  it("only submits once the required fields are filled", () => {
    const { navigation } = renderForm();

    fireEvent.press(screen.getByTestId("profile-submit"));
    expect(navigation.goBack).not.toHaveBeenCalled();

    fillRequiredFields();
    fireEvent.press(screen.getByTestId("profile-submit"));
    expect(navigation.goBack).toHaveBeenCalled();
  });
});
