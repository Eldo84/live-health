import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./input";
import { cn } from "../../lib/utils";

/**
 * Password field with a show/hide toggle. Forwards every native input prop and
 * the ref to the underlying <Input>, so it drops in anywhere a password Input
 * was used (including react-hook-form's {...field} spread).
 */
const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "type">
>(({ className, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        // Pad the right edge so text never slides under the toggle button.
        className={cn("pr-11", className)}
        ref={ref}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        disabled={props.disabled}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-[#ffffff99] hover:text-white focus:outline-none focus-visible:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
