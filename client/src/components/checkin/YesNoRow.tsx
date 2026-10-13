import { YES_NO_QUESTIONS } from "../../constants/checkin";
import { AnswerGroup } from "../AnswerGroup";

export type Answer = boolean | null;

interface Props {
  field: string;
  value: Answer;
  onChange: (value: boolean) => void;
}

/**
 * A yes/no question of the weekly check-in: the question keyed by `field` in
 * YES_NO_QUESTIONS with large Sim / Não answers under it. The answers keep the
 * `checkin-<field>-yes/no` testIDs the tests and e2e flows rely on.
 */
export function YesNoRow({ field, value, onChange }: Props) {
  return (
    <AnswerGroup
      question={YES_NO_QUESTIONS[field]}
      value={value}
      onChange={onChange}
      options={[
        { value: true, label: "Sim", testID: `checkin-${field}-yes` },
        { value: false, label: "Não", testID: `checkin-${field}-no` },
      ]}
    />
  );
}
