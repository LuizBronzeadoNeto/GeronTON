import { describe, it, expect, jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { ErrorToast } from "./ErrorToast";

describe("ErrorToast", () => {
  it("renders the title and message", () => {
    render(
      <ErrorToast
        testID="toast"
        title="E-mail ou Senha incorretos"
        message="Tente novamente, ou altere a senha"
        onDismiss={() => {}}
      />,
    );

    expect(screen.getByTestId("toast")).toBeTruthy();
    expect(screen.getByText("E-mail ou Senha incorretos")).toBeTruthy();
    expect(screen.getByText("Tente novamente, ou altere a senha")).toBeTruthy();
  });

  it("calls onDismiss when the close button is pressed", () => {
    const onDismiss = jest.fn();
    render(
      <ErrorToast
        testID="toast"
        title="title"
        message="message"
        onDismiss={onDismiss}
      />,
    );

    fireEvent.press(screen.getByTestId("toast-dismiss"));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
