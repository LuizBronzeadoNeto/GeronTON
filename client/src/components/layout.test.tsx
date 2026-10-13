import { describe, it, expect, jest } from "@jest/globals";
import { StyleSheet, Text } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Section } from "./Section";
import { ListRow } from "./ListRow";
import { ActionBar } from "./ActionBar";
import { AnswerGroup } from "./AnswerGroup";

describe("layout components", () => {
  it("Section shows its title as a heading and its action", () => {
    const onPress = jest.fn();
    render(
      <Section
        title="Histórico"
        action={{ label: "Ver todos", onPress, testID: "more" }}
      >
        <Text>row</Text>
      </Section>,
    );

    expect(screen.getByRole("header")).toBeTruthy();
    fireEvent.press(screen.getByTestId("more"));
    expect(onPress).toHaveBeenCalled();
  });

  it("grouped Section separates its rows with dividers", () => {
    render(
      <Section title="Dados" grouped>
        <Text>a</Text>
        {null}
        <Text>b</Text>
      </Section>,
    );

    expect(screen.getAllByTestId("section-divider")).toHaveLength(1);
  });

  it("ListRow shows its value and opens on press", () => {
    const onPress = jest.fn();
    render(
      <ListRow testID="row" label="Sexo" value="Feminino" onPress={onPress} />,
    );

    expect(screen.getByText("Feminino")).toBeTruthy();
    fireEvent.press(screen.getByTestId("row"));
    expect(onPress).toHaveBeenCalled();
  });

  it("AnswerGroup is a radio group with a checked option", () => {
    const onChange = jest.fn();
    render(
      <AnswerGroup
        question="Dormiu bem?"
        value={true}
        onChange={onChange}
        options={[
          { value: true, label: "Sim", testID: "yes" },
          { value: false, label: "Não", testID: "no" },
        ]}
      />,
    );

    expect(screen.getByTestId("yes").props.accessibilityState.checked).toBe(
      true,
    );
    expect(screen.getByTestId("no").props.accessibilityState.checked).toBe(
      false,
    );
    fireEvent.press(screen.getByTestId("no"));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("ActionBar gives each action an equal share of the row", () => {
    render(
      <ActionBar testID="bar">
        <Text testID="a">a</Text>
        <Text testID="b">b</Text>
      </ActionBar>,
    );

    const slots = screen.getAllByTestId("action-slot");
    expect(slots).toHaveLength(2);
    for (const slot of slots) {
      expect(StyleSheet.flatten(slot.props.style).flex).toBe(1);
    }
  });
});
