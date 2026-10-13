import { describe, it, expect, jest, afterEach } from "@jest/globals";
import { Alert, Platform } from "react-native";
import { confirmDestructive } from "./confirm";

describe("confirmDestructive", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("uses the native alert with Cancelar/Remover on native", () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const onConfirm = jest.fn();

    confirmDestructive("Remover", "Tem certeza?", onConfirm);

    const buttons = alert.mock.calls[0][2]!;
    expect(buttons.map((button) => button.text)).toEqual([
      "Cancelar",
      "Remover",
    ]);
    buttons[1].onPress!();
    expect(onConfirm).toHaveBeenCalled();
  });

  it("uses the browser dialog on web", () => {
    jest.replaceProperty(Platform, "OS", "web");
    const confirm = jest.fn(() => true);
    Object.assign(globalThis, { confirm });
    const onConfirm = jest.fn();

    confirmDestructive("Remover", "Tem certeza?", onConfirm);

    expect(confirm).toHaveBeenCalledWith("Remover\n\nTem certeza?");
    expect(onConfirm).toHaveBeenCalled();
  });

  it("does nothing on web when the user cancels", () => {
    jest.replaceProperty(Platform, "OS", "web");
    Object.assign(globalThis, { confirm: jest.fn(() => false) });
    const onConfirm = jest.fn();

    confirmDestructive("Remover", "Tem certeza?", onConfirm);

    expect(onConfirm).not.toHaveBeenCalled();
  });
});
