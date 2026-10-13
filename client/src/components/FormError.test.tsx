import { describe, it, expect, jest } from "@jest/globals";
import { AccessibilityInfo } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { FormError } from "./FormError";

describe("FormError", () => {
  it("renders as an alert and announces the message", () => {
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");

    render(<FormError testID="err" message="Não foi possível salvar." />);

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(announce).toHaveBeenCalledWith("Não foi possível salvar.");
  });
});
