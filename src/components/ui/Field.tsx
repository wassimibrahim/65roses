// <Field /> — borderless input: chalk label above, a baseline that thickens on focus,
// one short chalk line beneath when something is wrong. Placeholders are banned.
import type { InputHTMLAttributes } from "react";

export function Field({
  label,
  error,
  listId,
  ...input
}: {
  label: string;
  error?: string;
  listId?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={error ? "field-error" : undefined}>
      <label className="field-label" htmlFor={input.id}>
        {label}
      </label>
      <input className="field-input" list={listId} {...input} />
      {error ? <div className="field-error-line">{error}</div> : null}
    </div>
  );
}
