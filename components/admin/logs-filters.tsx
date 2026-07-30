"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { translate } from "@/lib/i18n/translate";
import { useCallback, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Built on each call: the labels are translated, and the catalog is not
// loaded yet when this module is first imported.
function ACTION_OPTIONS() {
  return [
  { value: "LOGIN", label: translate("ui.signIn") },
  { value: "LOGOUT", label: translate("ui.signOut") },
  { value: "CREATE_USER", label: translate("audit.action.CREATE_USER") },
  { value: "UPDATE_USER", label: translate("audit.action.UPDATE_USER") },
  { value: "DELETE_USER", label: translate("ui.removeThePerson") },
  { value: "CREATE_GROUP", label: translate("audit.action.CREATE_GROUP") },
  { value: "UPDATE_GROUP", label: translate("audit.action.UPDATE_GROUP") },
  { value: "DELETE_GROUP", label: translate("ui.deleteTheGroup") },
  { value: "CREATE_SUBJECT", label: translate("audit.action.CREATE_SUBJECT") },
  { value: "UPDATE_SUBJECT", label: translate("audit.action.UPDATE_SUBJECT") },
  { value: "DELETE_SUBJECT", label: translate("ui.deleteTheSubject") },
  { value: "CREATE_SEMESTER", label: translate("audit.action.CREATE_SEMESTER") },
  { value: "UPDATE_SEMESTER", label: translate("audit.action.UPDATE_SEMESTER") },
  { value: "DELETE_SEMESTER", label: translate("ui.deleteTheSemester") },
  { value: "CREATE_ASSIGNMENT", label: translate("audit.action.CREATE_ASSIGNMENT") },
  { value: "DELETE_ASSIGNMENT", label: translate("ui.deleteTheAssignment2") },
  { value: "CREATE_LESSON", label: translate("audit.action.CREATE_LESSON") },
  { value: "DELETE_LESSON", label: translate("ui.deleteTheLesson") },
  { value: "UPDATE_LESSON_TOPIC", label: translate("audit.action.UPDATE_LESSON_TOPIC") },
  { value: "UPSERT_GRADE", label: translate("audit.action.UPSERT_GRADE") },
  { value: "DELETE_GRADE", label: translate("ui.clearTheGrade") },
  { value: "ADD_STUDENT_TO_GROUP", label: translate("audit.action.ADD_STUDENT_TO_GROUP") },
  { value: "UPSERT_SCHEDULE_ENTRY", label: translate("audit.action.UPSERT_SCHEDULE_ENTRY") },
  { value: "DELETE_SCHEDULE_ENTRY", label: translate("ui.removeTheTimetableEntry") },
  { value: "UPSERT_SUBSTITUTION", label: translate("audit.entity.schedule_substitution") },
  { value: "DELETE_SUBSTITUTION", label: translate("ui.removeTheCoverLesson2") },
];
}

// Built on each call: the labels are translated, and the catalog is not
// loaded yet when this module is first imported.
function ENTITY_OPTIONS() {
  return [
  { value: "session", label: translate("audit.entity.session") },
  { value: "user", label: translate("audit.user") },
  { value: "group", label: translate("term.group") },
  { value: "subject", label: translate("term.subject") },
  { value: "semester", label: translate("term.semester") },
  { value: "assignment", label: translate("audit.entity.assignment") },
  { value: "lesson", label: translate("term.lesson") },
  { value: "grade", label: translate("audit.action.UPSERT_GRADE") },
  { value: "schedule_entry", label: translate("nav.schedule") },
  { value: "schedule_substitution", label: translate("audit.entity.schedule_substitution") },
];
}

const LIMIT_OPTIONS = [
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
];

export function LogsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [searchVal, setSearchVal] = useState(searchParams.get("search") ?? "");
  const [dateFromVal, setDateFromVal] = useState(
    searchParams.get("dateFrom") ?? "",
  );
  const [dateToVal, setDateToVal] = useState(searchParams.get("dateTo") ?? "");

  const pushParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      params.delete("page");
      startTransition(() => {
        router.push(`/admin/logs?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const debouncedPush = useCallback(
    (key: string, value: string) => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        pushParams({ [key]: value });
      }, 400);
    },
    [pushParams],
  );

  const hasFilters = searchParams.toString().length > 0;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        isPending && "opacity-60 pointer-events-none",
      )}
    >
      <Select
        value={searchParams.get("action") ?? "_all"}
        onValueChange={(v) => pushParams({ action: v === "_all" ? "" : v })}
      >
        <SelectTrigger size="sm" className="w-56">
          <SelectValue placeholder={translate("ui.allActions")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">{translate("ui.allActions")}</SelectItem>
          {ACTION_OPTIONS().map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("entity") ?? "_all"}
        onValueChange={(v) => pushParams({ entity: v === "_all" ? "" : v })}
      >
        <SelectTrigger size="sm" className="w-40">
          <SelectValue placeholder={translate("ui.allObjects")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">{translate("ui.allObjects")}</SelectItem>
          {ENTITY_OPTIONS().map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        className="h-8 w-52 text-sm"
        placeholder={translate("ui.searchByNameUsernameOrIp")}
        value={searchVal}
        onChange={(e) => {
          setSearchVal(e.target.value);
          debouncedPush("search", e.target.value);
        }}
      />

      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          className="h-8 w-36 text-sm"
          value={dateFromVal}
          onChange={(e) => {
            setDateFromVal(e.target.value);
            debouncedPush("dateFrom", e.target.value);
          }}
        />
        <span className="text-xs text-muted-foreground">-</span>
        <Input
          type="date"
          className="h-8 w-36 text-sm"
          value={dateToVal}
          onChange={(e) => {
            setDateToVal(e.target.value);
            debouncedPush("dateTo", e.target.value);
          }}
        />
      </div>

      <Select
        value={searchParams.get("limit") ?? "50"}
        onValueChange={(v) => pushParams({ limit: v })}
      >
        <SelectTrigger size="sm" className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LIMIT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-muted-foreground"
          onClick={() => {
            setSearchVal("");
            setDateFromVal("");
            setDateToVal("");
            router.push("/admin/logs");
          }}
        >
          {translate("common.reset")}
        </Button>
      )}
    </div>
  );
}
