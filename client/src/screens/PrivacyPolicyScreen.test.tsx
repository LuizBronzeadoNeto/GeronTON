import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { PrivacyPolicyScreen } from "./PrivacyPolicyScreen";
import { useAuth } from "../context/AuthContext";
import { deleteAccount } from "../api/auth";
import { PRIVACY_CONTACT } from "../constants/privacy";
import type { User } from "../types/auth";

jest.mock("../context/AuthContext");
jest.mock("../api/auth");

const signOut = jest.fn();

function renderAs(user: User | null) {
  jest.mocked(useAuth).mockReturnValue({
    user,
    isSigningIn: false,
    isRestoring: false,
    signIn: jest.fn(async () => {}),
    signOut,
    acceptConsent: jest.fn(async () => {}),
  });
  return render(<PrivacyPolicyScreen />);
}

const CAREGIVER: User = { id: 1, role: "cuidador", token: "t" };

describe("PrivacyPolicyScreen", () => {
  beforeEach(() => {
    signOut.mockReset();
    jest.mocked(deleteAccount).mockReset().mockResolvedValue(undefined);
  });

  it("shows the policy with the real contact", () => {
    renderAs(null);

    expect(screen.getByTestId("policy-text")).toBeTruthy();
    expect(screen.getByText(new RegExp(PRIVACY_CONTACT))).toBeTruthy();
  });

  it("does not offer deletion before sign-in", () => {
    renderAs(null);

    expect(screen.queryByTestId("delete-account")).toBeNull();
  });

  it("deletes the account with the password and signs out", async () => {
    renderAs(CAREGIVER);
    const submit = screen.getByTestId("delete-account-submit");
    expect(submit.props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(
      screen.getByTestId("delete-account-password"),
      "senha12345",
    );
    fireEvent.press(screen.getByTestId("delete-account-submit"));

    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(deleteAccount).toHaveBeenCalledWith("senha12345");
  });

  it("shows the reason and stays signed in when it fails", async () => {
    jest.mocked(deleteAccount).mockRejectedValue(new Error("Senha incorreta."));
    renderAs(CAREGIVER);

    fireEvent.changeText(
      screen.getByTestId("delete-account-password"),
      "errada",
    );
    fireEvent.press(screen.getByTestId("delete-account-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("delete-account-error")).toHaveTextContent(
        "Senha incorreta.",
      ),
    );
    expect(signOut).not.toHaveBeenCalled();
  });
});
