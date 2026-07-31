import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProfileIdentificationScreen } from "./ProfileIdentificationScreen";
import type { AppStackParamList } from "../types/navigation";
import { linkProfile, verifyProfileCpf } from "../api/profiles";
import { makeProfile } from "../test-utils";

jest.mock("../api/profiles");

const CPF_TYPED = "111.444.777-35";
const CPF_DIGITS = "11144477735";
const BIRTH_TYPED = "20/05/1950";
const BIRTH_ISO = "1950-05-20";

type Props = NativeStackScreenProps<AppStackParamList, "ProfileIdentification">;

function renderScreen() {
  const navigation = {
    navigate: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
  };
  const props = {
    navigation,
    route: { params: undefined },
  } as unknown as Props;
  return { navigation, ...render(<ProfileIdentificationScreen {...props} />) };
}

function fillIdentity() {
  fireEvent.changeText(
    screen.getByTestId("profile-identification-cpf"),
    CPF_TYPED,
  );
  fireEvent.changeText(
    screen.getByTestId("profile-identification-birthDate"),
    BIRTH_TYPED,
  );
}

describe("ProfileIdentificationScreen", () => {
  beforeEach(() => {
    jest.mocked(verifyProfileCpf).mockReset();
    jest.mocked(linkProfile).mockReset();
  });

  it("keeps the submit button disabled until both fields are complete", () => {
    renderScreen();

    expect(
      screen.getByTestId("profile-identification-submit").props
        .accessibilityState.disabled,
    ).toBe(true);

    fillIdentity();

    expect(
      screen.getByTestId("profile-identification-submit").props
        .accessibilityState.disabled,
    ).toBe(false);
  });

  it("sends an unknown CPF on to the registration form", async () => {
    jest.mocked(verifyProfileCpf).mockResolvedValue("novo");
    const { navigation } = renderScreen();
    fillIdentity();

    fireEvent.press(screen.getByTestId("profile-identification-submit"));

    await waitFor(() =>
      expect(verifyProfileCpf).toHaveBeenCalledWith(CPF_DIGITS, BIRTH_ISO),
    );
    expect(navigation.navigate).toHaveBeenCalledWith("ProfileForm", {
      cpf: CPF_DIGITS,
      birthDate: BIRTH_ISO,
    });
  });

  it("offers to bind when the elder is already registered", async () => {
    jest.mocked(verifyProfileCpf).mockResolvedValue("encontrado");
    renderScreen();
    fillIdentity();

    fireEvent.press(screen.getByTestId("profile-identification-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("profile-identification-found")).toBeTruthy(),
    );
    expect(screen.getByText("Idoso encontrado no sistema")).toBeTruthy();
    expect(screen.getByTestId("profile-identification-link")).toBeTruthy();
  });

  it("binds the elder and opens their detail screen", async () => {
    jest.mocked(verifyProfileCpf).mockResolvedValue("encontrado");
    jest.mocked(linkProfile).mockResolvedValue(makeProfile({ id: 42 }));
    const { navigation } = renderScreen();
    fillIdentity();

    fireEvent.press(screen.getByTestId("profile-identification-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("profile-identification-link")).toBeTruthy(),
    );

    fireEvent.press(screen.getByTestId("profile-identification-link"));

    await waitFor(() =>
      expect(linkProfile).toHaveBeenCalledWith(CPF_DIGITS, BIRTH_ISO),
    );
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 1,
      routes: [
        { name: "Home" },
        { name: "ProfileDetail", params: { profileId: 42 } },
      ],
    });
  });

  it("does not reveal which field is wrong when the pair does not match", async () => {
    jest.mocked(verifyProfileCpf).mockResolvedValue("nao_confere");
    const { navigation } = renderScreen();
    fillIdentity();

    fireEvent.press(screen.getByTestId("profile-identification-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("profile-identification-error")).toBeTruthy(),
    );
    expect(
      screen.getByText("Não foi possível confirmar os dados do idoso."),
    ).toBeTruthy();
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(screen.queryByTestId("profile-identification-link")).toBeNull();
  });

  it("lets the user go back and correct a mistyped identity", async () => {
    jest.mocked(verifyProfileCpf).mockResolvedValue("encontrado");
    renderScreen();
    fillIdentity();

    fireEvent.press(screen.getByTestId("profile-identification-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("profile-identification-link")).toBeTruthy(),
    );

    fireEvent.press(screen.getByTestId("profile-identification-back"));

    expect(screen.getByTestId("profile-identification")).toBeTruthy();
    expect(screen.queryByTestId("profile-identification-link")).toBeNull();
    expect(screen.getByTestId("profile-identification-cpf").props.value).toBe(
      CPF_TYPED,
    );
  });

  it("withdraws a confirmed match as soon as a field is edited", async () => {
    jest.mocked(verifyProfileCpf).mockResolvedValue("encontrado");
    renderScreen();
    fillIdentity();

    fireEvent.press(screen.getByTestId("profile-identification-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("profile-identification-link")).toBeTruthy(),
    );

    fireEvent.press(screen.getByTestId("profile-identification-back"));
    fireEvent.changeText(
      screen.getByTestId("profile-identification-cpf"),
      "111.444.777-3",
    );

    expect(
      screen.getByTestId("profile-identification-submit").props
        .accessibilityState.disabled,
    ).toBe(true);
  });

  it("reports a failed verification without moving on", async () => {
    jest.mocked(verifyProfileCpf).mockRejectedValue(new Error("boom"));
    const { navigation } = renderScreen();
    fillIdentity();

    fireEvent.press(screen.getByTestId("profile-identification-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("profile-identification-error")).toBeTruthy(),
    );
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});
