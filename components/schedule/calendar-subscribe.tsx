"use client";

import { useState, useTransition } from "react";
import { translate } from "@/lib/i18n/translate";
import {
  IconCalendarPlus,
  IconCopy,
  IconCheck,
  IconBrandGoogle,
  IconBrandApple,
  IconRefresh,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCalendarFeedUrl, resetCalendarToken } from "@/lib/actions/calendar";

// Shared dialog body, used by both the personal and the public buttons.
function SubscribeDialogBody({
  url,
  loading,
  personal,
  onReset,
  resetting,
  error,
}: {
  url: string;
  loading: boolean;
  personal: boolean;
  onReset?: () => void;
  resetting?: boolean;
  error?: string;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const webcalUrl = url ? url.replace(/^https?:/, "webcal:") : "";
  const googleUrl = webcalUrl
    ? `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(
        webcalUrl,
      )}`
    : "";

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{translate("ui.subscribeToTheTimetable")}</DialogTitle>
        <DialogDescription>
          {translate("calendar.subscribe.intro")}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label>{translate("ui.calendarLink")}</Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={loading ? translate("common.loading") : url}
              className="font-mono text-xs"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={copy}
              disabled={!url}
              title={translate("ui.copy")}
            >
              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="google">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="google" className="gap-2">
              <IconBrandGoogle size={16} />
              Google
            </TabsTrigger>
            <TabsTrigger value="apple" className="gap-2">
              <IconBrandApple size={16} />
              Apple
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="google"
            className="flex flex-col gap-3 focus-visible:ring-0"
          >
            <Button asChild disabled={!url} className="gap-2">
              <a href={googleUrl} target="_blank" rel="noopener noreferrer">
                <IconBrandGoogle size={16} />
                {translate("ui.addToGoogleCalendar")}
              </a>
            </Button>
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">
                {translate("ui.ifTheButtonDidNotWorkOnA")}
              </p>
              <p>
                {translate("calendar.google.steps")}
              </p>
            </div>
          </TabsContent>

          <TabsContent
            value="apple"
            className="flex flex-col gap-3 focus-visible:ring-0"
          >
            <Button asChild disabled={!url} className="gap-2">
              <a href={webcalUrl}>
                <IconBrandApple size={16} />
                {translate("ui.addToAppleCalendar")}
              </a>
            </Button>
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">
                {translate("ui.ifTheButtonDidNotWork")}
              </p>
              <p className="mb-1">
                <span className="font-medium text-foreground">iPhone/iPad:</span>{" "}
                {translate("calendar.apple.iphone")}
              </p>
              <p>
                <span className="font-medium text-foreground">Mac:</span>{" "}
                {translate("calendar.apple.mac")}
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {personal && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              {translate("ui.thisLinkIsPersonalDoNotShareIt")}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={onReset}
              disabled={resetting}
            >
              <IconRefresh size={15} />
              {translate("ui.refreshTheLink")}
            </Button>
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </DialogContent>
  );
}

// Personal subscription, keyed to the user's own token.
export function CalendarSubscribe() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (v && !url) {
      startTransition(async () => {
        try {
          setUrl(await getCalendarFeedUrl());
        } catch (e) {
          setError(e instanceof Error ? e.message : translate("common.error"));
        }
      });
    }
  }

  function reset() {
    startTransition(async () => {
      try {
        setUrl(await resetCalendarToken());
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : translate("common.error"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <IconCalendarPlus size={16} />
          {translate("ui.addToCalendar")}
        </Button>
      </DialogTrigger>
      <SubscribeDialogBody
        url={url}
        loading={pending && !url}
        personal
        onReset={reset}
        resetting={pending}
        error={error}
      />
    </Dialog>
  );
}

export type PublicCalendarFilter =
  | { kind: "group"; id: string }
  | { kind: "teacher"; id: string }
  | { kind: "room"; id: string };

// Public subscription by group, teacher or room — no sign-in needed.
export function PublicCalendarSubscribe({
  filter,
}: {
  filter: PublicCalendarFilter;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (v && !url) {
      const param =
        filter.kind === "group"
          ? `group=${encodeURIComponent(filter.id)}`
          : filter.kind === "teacher"
            ? `teacher=${encodeURIComponent(filter.id)}`
            : `room=${encodeURIComponent(filter.id)}`;
      setUrl(`${window.location.origin}/api/calendar/public?${param}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <IconCalendarPlus size={16} />
          {translate("ui.addToCalendar")}
        </Button>
      </DialogTrigger>
      <SubscribeDialogBody url={url} loading={!url} personal={false} />
    </Dialog>
  );
}
