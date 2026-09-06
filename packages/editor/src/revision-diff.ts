import { diffLines } from "diff";

export interface RevisionDiffLine { text: string; number: number | null; kind: "equal" | "removed" | "added" | "gap" }
export function compareRevisionLines(current: string, selected: string) {
  const changes = diffLines(current, selected, { timeout: 150, maxEditLength: 2_000 });
  const chunks = changes ?? [{ value: current, removed: true, added: false }, { value: selected, added: true, removed: false }];
  const left: RevisionDiffLine[] = [], right: RevisionDiffLine[] = [];
  let leftNumber = 0, rightNumber = 0;
  const lines = (value: string) => value.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index]!;
    const changed = Boolean(chunk.added || chunk.removed);
    const leftLines = chunk.added ? [] : lines(chunk.value);
    let rightLines = chunk.removed ? [] : lines(chunk.value);
    // Pair replacement blocks so a long deletion doesn't push the selected
    // version below a screenful of artificial blank rows.
    if (chunk.removed && chunks[index + 1]?.added) rightLines = lines(chunks[++index]!.value);
    for (let row = 0; row < Math.max(leftLines.length, rightLines.length); row++) {
      const before = leftLines[row], after = rightLines[row];
      left.push(before === undefined ? { text: "", number: null, kind: "gap" } : { text: before, number: ++leftNumber, kind: changed ? "removed" : "equal" });
      right.push(after === undefined ? { text: "", number: null, kind: "gap" } : { text: after, number: ++rightNumber, kind: changed ? "added" : "equal" });
    }
  }
  return { left, right, simplified: !changes, identical: current === selected };
}
