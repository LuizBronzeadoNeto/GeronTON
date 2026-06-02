import { describe, it, expect } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { AuthProvider } from "../context/AuthContext";
import { LoginScreen } from "./LoginScreen";

function renderLogin() {
  return render(
    <AuthProvider>
      <LoginScreen />
    </AuthProvider>,
  );
}

describe("LoginScreen", () => {
  it("renders the login form", () => {
    renderLogin();

    expect(screen.getByText("GeronTON")).toBeTruthy();
    expect(screen.getByTestId("login-email")).toBeTruthy();
    expect(screen.getByTestId("login-password")).toBeTruthy();
    expect(screen.getByTestId("login-submit")).toBeTruthy();
  });

  it("captures typed credentials", () => {
    renderLogin();

    fireEvent.changeText(screen.getByTestId("login-email"), "a@b.com");
    fireEvent.changeText(screen.getByTestId("login-password"), "secret");

    expect(screen.getByTestId("login-email").props.value).toBe("a@b.com");
    expect(screen.getByTestId("login-password").props.value).toBe("secret");
  });
});
