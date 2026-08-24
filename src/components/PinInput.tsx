import { forwardRef } from 'react'

export const PinInput = forwardRef<
  HTMLInputElement,
  {
    id: string
    label: string
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    errorId?: string
    autoFocus?: boolean
  }
>(function PinInput(
  {
    id,
    label,
    value,
    onChange,
    disabled = false,
    errorId,
    autoFocus = false,
  },
  ref,
) {
  return (
    <label className="form-field pin-field" htmlFor={id}>
      <span>{label}</span>
      <input
        ref={ref}
        id={id}
        className="pin-input"
        name={id}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        enterKeyHint="done"
        maxLength={4}
        value={value}
        onChange={(event) =>
          onChange(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))
        }
        disabled={disabled}
        aria-invalid={Boolean(errorId)}
        aria-describedby={errorId}
        autoFocus={autoFocus}
        spellCheck={false}
      />
    </label>
  )
})
