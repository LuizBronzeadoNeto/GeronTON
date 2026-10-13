import { describe, it, expect, jest } from "@jest/globals";
import { Linking } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { FamilyContactCard } from "./FamilyContactCard";

describe("FamilyContactCard", () => {
  it("calls and opens WhatsApp on the family phone", () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    render(<FamilyContactCard phone="83999991234" notes={null} />);

    expect(screen.getByText("(83) 99999-1234")).toBeTruthy();
    fireEvent.press(screen.getByTestId("family-call"));
    fireEvent.press(screen.getByTestId("family-whatsapp"));

    expect(openURL).toHaveBeenCalledWith("tel:+5583999991234");
    expect(openURL).toHaveBeenCalledWith("https://wa.me/5583999991234");
  });

  it("formats a landline with eight digits after the DDD", () => {
    render(<FamilyContactCard phone="8332221100" notes={null} />);

    expect(screen.getByText("(83) 3222-1100")).toBeTruthy();
  });

  it("explains how to add a phone when there is none, and shows notes", () => {
    render(<FamilyContactCard phone={null} notes="Usa marcapasso" />);

    expect(screen.getByText(/Nenhum telefone cadastrado/)).toBeTruthy();
    expect(screen.getByText("Usa marcapasso")).toBeTruthy();
    expect(screen.queryByTestId("family-call")).toBeNull();
  });
});
