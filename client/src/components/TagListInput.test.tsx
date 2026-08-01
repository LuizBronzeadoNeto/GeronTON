import { describe, it, expect, jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { TagListInput } from "./TagListInput";

function renderInput(
  value: string[] = [],
  props: Partial<React.ComponentProps<typeof TagListInput>> = {},
) {
  const onChange = jest.fn();
  render(
    <TagListInput
      testIDPrefix="tags"
      value={value}
      onChange={onChange}
      {...props}
    />,
  );
  return { onChange };
}

function type(text: string) {
  fireEvent.changeText(screen.getByTestId("tags-input"), text);
}

describe("TagListInput", () => {
  it("adds what was typed when the add button is pressed", () => {
    const { onChange } = renderInput();

    type("Losartana");
    fireEvent.press(screen.getByTestId("tags-add"));

    expect(onChange).toHaveBeenCalledWith(["Losartana"]);
  });

  it("adds on the keyboard's submit key too", () => {
    const { onChange } = renderInput(["Losartana"]);

    type("Metformina");
    fireEvent(screen.getByTestId("tags-input"), "submitEditing");

    expect(onChange).toHaveBeenCalledWith(["Losartana", "Metformina"]);
  });

  it("trims what was typed", () => {
    const { onChange } = renderInput();

    type("   Fraldas G   ");
    fireEvent.press(screen.getByTestId("tags-add"));

    expect(onChange).toHaveBeenCalledWith(["Fraldas G"]);
  });

  it("ignores an empty or blank entry", () => {
    const { onChange } = renderInput();

    type("    ");
    fireEvent.press(screen.getByTestId("tags-add"));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("ignores an item already in the list", () => {
    const { onChange } = renderInput(["Losartana"]);

    type("Losartana");
    fireEvent.press(screen.getByTestId("tags-add"));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("removes an item when its chip is pressed", () => {
    const { onChange } = renderInput(["Losartana", "Metformina"]);

    fireEvent.press(screen.getByTestId("tags-remove-Losartana"));

    expect(onChange).toHaveBeenCalledWith(["Metformina"]);
  });

  it("adds a suggestion on the first press and removes it on the second", () => {
    const suggestions = ["Losartana", "Metformina"];
    const first = renderInput([], { suggestions });

    fireEvent.press(screen.getByTestId("tags-Losartana"));
    expect(first.onChange).toHaveBeenCalledWith(["Losartana"]);

    screen.unmount();
    const second = renderInput(["Losartana"], { suggestions });

    fireEvent.press(screen.getByTestId("tags-Losartana"));
    expect(second.onChange).toHaveBeenCalledWith([]);
  });

  /**
   * A chosen suggestion stays in the suggestion row rather than appearing again
   * as a removable chip, so the same item is never shown twice.
   */
  it("does not repeat a chosen suggestion as a typed chip", () => {
    renderInput(["Losartana", "Dipirona"], { suggestions: ["Losartana"] });

    expect(screen.getByTestId("tags-Losartana")).toBeTruthy();
    expect(screen.queryByTestId("tags-remove-Losartana")).toBeNull();
    expect(screen.getByTestId("tags-remove-Dipirona")).toBeTruthy();
  });
});
