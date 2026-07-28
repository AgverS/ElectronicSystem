"use client";

import { IconCheck, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { passwordRules } from "@/lib/password";
import { cn } from "@/lib/utils";

interface PasswordRequirementsProps {
  value: string;
}

/**
 * Live password-policy checklist. Renders only while the field has content
 * so it never nags returning users with an empty field. Each rule turns
 * green the moment it is satisfied.
 */
export function PasswordRequirements({ value }: PasswordRequirementsProps) {
  return (
    <AnimatePresence initial={false}>
      {value.length > 0 && (
        <motion.ul
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-1 overflow-hidden text-xs"
        >
          {passwordRules.map((rule) => {
            const ok = rule.test(value);
            return (
              <li key={rule.id} className="flex items-center gap-2 pt-0.5">
                <motion.span
                  initial={false}
                  animate={{ scale: ok ? [1, 1.25, 1] : 1 }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full transition-colors",
                    ok
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {ok ? (
                    <IconCheck size={11} stroke={3} />
                  ) : (
                    <IconX size={11} stroke={3} />
                  )}
                </motion.span>
                <span
                  className={cn(
                    "transition-colors",
                    ok ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {rule.label}
                </span>
              </li>
            );
          })}
        </motion.ul>
      )}
    </AnimatePresence>
  );
}
