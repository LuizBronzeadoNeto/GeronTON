import { describe, it, expect, jest } from "@jest/globals";
import { StyleSheet } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { PrimaryButton } from "./PrimaryButton";
import { COLORS } from "../theme";

describe("PrimaryButton", () => {
  it("is a full-width 52px control by default", () => {
    render(<PrimaryButton testID="b" title="Salvar" onPress={jest.fn()} />);

    const style = StyleSheet.flatten(screen.getByTestId("b").props.style);
    expect(style.minHeight).toBe(52);
    expect(style.alignSelf).toBe("stretch");
  });

  it("renders the danger variant as red text on white, never a red block", () => {
    render(
      <PrimaryButton
        testID="b"
        title="Excluir"
        variant="danger"
        onPress={jest.fn()}
      />,
    );

    const style = StyleSheet.flatten(screen.getByTestId("b").props.style);
    expect(style.backgroundColor).toBe(COLORS.white);
    expect(style.borderColor).toBe(COLORS.danger);
  });

  it("fires onPress for the quiet variant", () => {
    const onPress = jest.fn();
    render(
      <PrimaryButton testID="b" title="Ok" variant="quiet" onPress={onPress} />,
    );

    fireEvent.press(screen.getByTestId("b"));

    expect(onPress).toHaveBeenCalled();
  });
});
