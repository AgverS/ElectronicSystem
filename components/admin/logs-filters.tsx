"use client";

import { useRouter, useSearchParams } from "next/navigation";
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

const ACTION_OPTIONS = [
  { value: "LOGIN", label: "Вход в систему" },
  { value: "LOGOUT", label: "Выход из системы" },
  { value: "CREATE_USER", label: "Создание пользователя" },
  { value: "UPDATE_USER", label: "Изменение пользователя" },
  { value: "DELETE_USER", label: "Удаление пользователя" },
  { value: "CREATE_GROUP", label: "Создание группы" },
  { value: "UPDATE_GROUP", label: "Изменение группы" },
  { value: "DELETE_GROUP", label: "Удаление группы" },
  { value: "CREATE_SUBJECT", label: "Создание предмета" },
  { value: "UPDATE_SUBJECT", label: "Изменение предмета" },
  { value: "DELETE_SUBJECT", label: "Удаление предмета" },
  { value: "CREATE_SEMESTER", label: "Создание семестра" },
  { value: "UPDATE_SEMESTER", label: "Изменение семестра" },
  { value: "DELETE_SEMESTER", label: "Удаление семестра" },
  { value: "CREATE_ASSIGNMENT", label: "Создание назначения" },
  { value: "DELETE_ASSIGNMENT", label: "Удаление назначения" },
  { value: "CREATE_LESSON", label: "Создание урока" },
  { value: "DELETE_LESSON", label: "Удаление урока" },
  { value: "UPDATE_LESSON_TOPIC", label: "Изменение темы урока" },
  { value: "UPSERT_GRADE", label: "Выставление отметки" },
  { value: "DELETE_GRADE", label: "Удаление отметки" },
  { value: "ADD_STUDENT_TO_GROUP", label: "Студент в группу" },
  { value: "UPSERT_SCHEDULE_ENTRY", label: "Изменение расписания" },
  { value: "DELETE_SCHEDULE_ENTRY", label: "Удаление расписания" },
  { value: "UPSERT_SUBSTITUTION", label: "Замена" },
  { value: "DELETE_SUBSTITUTION", label: "Удаление замены" },
];

const ENTITY_OPTIONS = [
  { value: "session", label: "Сессия" },
  { value: "user", label: "Пользователь" },
  { value: "group", label: "Группа" },
  { value: "subject", label: "Предмет" },
  { value: "semester", label: "Семестр" },
  { value: "assignment", label: "Назначение" },
  { value: "lesson", label: "Урок" },
  { value: "grade", label: "Отметка" },
  { value: "schedule_entry", label: "Расписание" },
  { value: "schedule_substitution", label: "Замена" },
];

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
          <SelectValue placeholder="Все действия" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Все действия</SelectItem>
          {ACTION_OPTIONS.map((o) => (
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
          <SelectValue placeholder="Все сущности" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Все сущности</SelectItem>
          {ENTITY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        className="h-8 w-52 text-sm"
        placeholder="Поиск (имя, логин, IP...)"
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
          Сбросить
        </Button>
      )}
    </div>
  );
}
