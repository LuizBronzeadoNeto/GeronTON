import { describe, it, expect, jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { AlertCard } from "./AlertCard";
import { makeAlert } from "../test-utils";

describe("AlertCard", () => {
  it("marks a weakened home bond with the house icon and severity pill", () => {
    render(
      <AlertCard
        testID="card"
        alert={makeAlert({ type: "weakened_home_bond", severity: "attention" })}
        subtitle="Ozilene Leite"
      />,
    );

    expect(screen.getByTestId("alert-icon-weakened_home_bond")).toBeTruthy();
    expect(screen.getByText("Atenção")).toBeTruthy();
    expect(screen.getByText("Ozilene Leite")).toBeTruthy();
    expect(
      screen.getByText(
        "Vínculo Domiciliar Fragilizado: sem check-in semanal há 4 semanas.",
      ),
    ).toBeTruthy();
  });

  it("uses a distinct icon per clinical alert type", () => {
    render(
      <>
        <AlertCard alert={makeAlert({ id: 1, type: "clinical_warning" })} />
        <AlertCard alert={makeAlert({ id: 2, type: "sarcopenia_risk" })} />
        <AlertCard
          alert={makeAlert({ id: 3, type: "metabolic_decompensation" })}
        />
      </>,
    );

    expect(screen.getByTestId("alert-icon-clinical_warning")).toBeTruthy();
    expect(screen.getByTestId("alert-icon-sarcopenia_risk")).toBeTruthy();
    expect(
      screen.getByTestId("alert-icon-metabolic_decompensation"),
    ).toBeTruthy();
  });

  it("asks whether the signal held up before resolving", () => {
    const onResolve = jest.fn();
    render(
      <AlertCard testID="card" alert={makeAlert()} onResolve={onResolve} />,
    );

    fireEvent.press(screen.getByTestId("card-resolve"));

    expect(onResolve).not.toHaveBeenCalled();
    expect(
      screen.getByText("Depois do contato, o sinal procedia?"),
    ).toBeTruthy();

    fireEvent.press(screen.getByTestId("card-verdict-no"));

    expect(onResolve).toHaveBeenCalledWith(false, "");
  });

  it("passes true when the signal held up", () => {
    const onResolve = jest.fn();
    render(
      <AlertCard testID="card" alert={makeAlert()} onResolve={onResolve} />,
    );

    fireEvent.press(screen.getByTestId("card-resolve"));
    fireEvent.press(screen.getByTestId("card-verdict-yes"));

    expect(onResolve).toHaveBeenCalledWith(true, "");
  });

  it("sends the note written about the contact", () => {
    const onResolve = jest.fn();
    render(
      <AlertCard testID="card" alert={makeAlert()} onResolve={onResolve} />,
    );

    fireEvent.press(screen.getByTestId("card-resolve"));
    fireEvent.changeText(
      screen.getByTestId("card-note"),
      "  Liguei, ninguém atendeu  ",
    );
    fireEvent.press(screen.getByTestId("card-verdict-yes"));

    expect(onResolve).toHaveBeenCalledWith(true, "Liguei, ninguém atendeu");
  });

  it("goes back to the button when the question is cancelled", () => {
    const onResolve = jest.fn();
    render(
      <AlertCard testID="card" alert={makeAlert()} onResolve={onResolve} />,
    );

    fireEvent.press(screen.getByTestId("card-resolve"));
    fireEvent.press(screen.getByTestId("card-verdict-cancel"));

    expect(screen.queryByTestId("card-verdict")).toBeNull();
    expect(screen.getByTestId("card-resolve")).toBeTruthy();
    expect(onResolve).not.toHaveBeenCalled();
  });

  it("fires onPress when the card is tappable", () => {
    const onPress = jest.fn();
    render(<AlertCard testID="card" alert={makeAlert()} onPress={onPress} />);

    fireEvent.press(screen.getByTestId("card"));

    expect(onPress).toHaveBeenCalled();
  });
});
