import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../context/AuthContext";
import { LoginScreen } from "./LoginScreen";
import { login } from "../api/auth";

jest.mock("../api/auth");

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderLogin() {
  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    </SafeAreaProvider>,
  );
}

function fillCredentials(email = "a@b.com", password = "secret") {
  fireEvent.changeText(screen.getByTestId("login-email"), email);
  fireEvent.changeText(screen.getByTestId("login-password"), password);
}

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.mocked(login).mockReset();
  });

  it("renders the login form", () => {
    renderLogin();

    expect(screen.getByText("GeronTON")).toBeTruthy();
    expect(screen.getByText("Login")).toBeTruthy();
    expect(
      screen.getByText("Insira seus dados para acessar a plataforma"),
    ).toBeTruthy();
    expect(screen.getByTestId("login-email")).toBeTruthy();
    expect(screen.getByTestId("login-password")).toBeTruthy();
    expect(screen.getByTestId("login-submit")).toBeTruthy();
    expect(screen.getByText("Entrar")).toBeTruthy();
  });

  it("captures typed credentials", () => {
    renderLogin();

    fillCredentials();

    expect(screen.getByTestId("login-email").props.value).toBe("a@b.com");
    expect(screen.getByTestId("login-password").props.value).toBe("secret");
  });

  it("shows the error toast on wrong credentials", async () => {
    jest.mocked(login).mockRejectedValue(new Error("Invalid credentials"));
    renderLogin();
    fillCredentials("a@b.com", "wrong");

    fireEvent.press(screen.getByTestId("login-submit"));

    await waitFor(() => expect(screen.getByTestId("login-error")).toBeTruthy());
    expect(screen.getByText("E-mail ou Senha incorretos")).toBeTruthy();
    expect(screen.getByText("Tente novamente, ou altere a senha")).toBeTruthy();
  });

  it("dismisses the error toast when its close button is pressed", async () => {
    jest.mocked(login).mockRejectedValue(new Error("Invalid credentials"));
    renderLogin();
    fillCredentials("a@b.com", "wrong");

    fireEvent.press(screen.getByTestId("login-submit"));
    await waitFor(() => expect(screen.getByTestId("login-error")).toBeTruthy());

    fireEvent.press(screen.getByTestId("login-error-dismiss"));

    expect(screen.queryByTestId("login-error")).toBeNull();
  });

  it("shows a generic toast title for unexpected errors", async () => {
    jest.mocked(login).mockRejectedValue(new Error("Network request failed"));
    renderLogin();
    fillCredentials();

    fireEvent.press(screen.getByTestId("login-submit"));

    await waitFor(() => expect(screen.getByTestId("login-error")).toBeTruthy());
    expect(screen.getByText("Não foi possível entrar")).toBeTruthy();
    expect(screen.getByText("Network request failed")).toBeTruthy();
  });

  it("hides the password until the visibility toggle is pressed", () => {
    renderLogin();

    expect(screen.getByTestId("login-password").props.secureTextEntry).toBe(
      true,
    );

    fireEvent.press(screen.getByTestId("login-password-toggle"));

    expect(screen.getByTestId("login-password").props.secureTextEntry).toBe(
      false,
    );
  });

  it("disables the submit button until both fields are filled", () => {
    renderLogin();

    expect(
      screen.getByTestId("login-submit").props.accessibilityState.disabled,
    ).toBe(true);

    fireEvent.changeText(screen.getByTestId("login-email"), "a@b.com");
    fireEvent.changeText(screen.getByTestId("login-password"), "secret");

    expect(
      screen.getByTestId("login-submit").props.accessibilityState.disabled,
    ).toBe(false);
  });
});
