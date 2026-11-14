import type { InputHTMLAttributes } from "react";
export function Field({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={props.name}>{label}</label>
      <input id={props.name} {...props} />
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}
