import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { AuthProvider } from "../context/AuthContext";
import { RegisterScreen } from "./RegisterScreen";
import { login, register } from "../api/auth";

jest.mock("../api/auth");

const EMAIL = "novo@demo.com";
const PASSWORD = "senha12345";

function renderRegister() {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  const props = {
    navigation,
    route: { params: undefined },
  } as unknown as Parameters<typeof RegisterScreen>[0];

  return {
    navigation,
    ...render(
      <AuthProvider>
        <RegisterScreen {...props} />
      </AuthProvider>,
    ),
  };
}

function chooseRole(label: string) {
  fireEvent.press(screen.getByTestId("register-role"));
  fireEvent.press(screen.getByTestId(`register-role-option-${label}`));
}

function fillCredentials(password = PASSWORD) {
  fireEvent.changeText(screen.getByTestId("register-email"), EMAIL);
  fireEvent.changeText(screen.getByTestId("register-password"), password);
}

describe("RegisterScreen", () => {
  beforeEach(() => {
    jest.mocked(register).mockReset().mockResolvedValue(undefined);
    jest.mocked(login).mockReset().mockResolvedValue({
      id: 9,
      role: "cuidador",
      token: "jwt",
    });
  });

  it("asks for a CRM only when registering as a professional", () => {
    renderRegister();

    chooseRole("Cuidador");
    expect(screen.queryByTestId("register-crm")).toBeNull();

    chooseRole("Profissional de saúde");
    expect(screen.getByTestId("register-crm")).toBeTruthy();
  });

  it("keeps submit disabled until the form is complete", () => {
    renderRegister();
    const disabled = () =>
      screen.getByTestId("register-submit").props.accessibilityState.disabled;

    expect(disabled()).toBe(true);

    chooseRole("Cuidador");
    fillCredentials();

    expect(disabled()).toBe(false);
  });

  it("refuses a password below the minimum length", () => {
    renderRegister();

    chooseRole("Cuidador");
    fillCredentials("curta12");

    expect(
      screen.getByTestId("register-submit").props.accessibilityState.disabled,
    ).toBe(true);
  });

  it("requires a CRM before a professional can submit", () => {
    renderRegister();

    chooseRole("Profissional de saúde");
    fillCredentials();

    expect(
      screen.getByTestId("register-submit").props.accessibilityState.disabled,
    ).toBe(true);

    fireEvent.changeText(screen.getByTestId("register-crm"), "12345-PB");

    expect(
      screen.getByTestId("register-submit").props.accessibilityState.disabled,
    ).toBe(false);
  });

  it("registers a caregiver and signs them in straight away", async () => {
    renderRegister();

    chooseRole("Cuidador");
    fillCredentials();
    fireEvent.press(screen.getByTestId("register-submit"));

    await waitFor(() => expect(register).toHaveBeenCalled());
    expect(register).toHaveBeenCalledWith({
      email: EMAIL,
      password: PASSWORD,
      role: "cuidador",
      crm: "",
    });
    await waitFor(() => expect(login).toHaveBeenCalledWith(EMAIL, PASSWORD));
  });

  it("sends the CRM when registering a professional", async () => {
    renderRegister();

    chooseRole("Profissional de saúde");
    fillCredentials();
    fireEvent.changeText(screen.getByTestId("register-crm"), "12345-PB");
    fireEvent.press(screen.getByTestId("register-submit"));

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith({
        email: EMAIL,
        password: PASSWORD,
        role: "profissional",
        crm: "12345-PB",
      }),
    );
  });

  it("shows the failure reason and does not sign in", async () => {
    jest
      .mocked(register)
      .mockRejectedValue(
        new Error("Já existe uma conta com esse e-mail ou CRM."),
      );
    renderRegister();

    chooseRole("Cuidador");
    fillCredentials();
    fireEvent.press(screen.getByTestId("register-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("register-error")).toBeTruthy(),
    );
    expect(
      screen.getByText("Já existe uma conta com esse e-mail ou CRM."),
    ).toBeTruthy();
    expect(login).not.toHaveBeenCalled();
  });

  it("goes back to the login screen from the footer", () => {
    const { navigation } = renderRegister();

    fireEvent.press(screen.getByTestId("register-back"));

    expect(navigation.goBack).toHaveBeenCalled();
  });
});
