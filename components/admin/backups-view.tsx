"use client";

import React, { useState } from "react";
import {
  IconDatabase,
  IconDownload,
  IconTrash,
  IconRestore,
  IconPlus,
  IconSettings,
  IconLoader2,
} from "@tabler/icons-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "../ui/switch";
import { useT } from "@/lib/i18n/provider";
import {
  downloadBackup,
  createBackupAction,
  deleteBackupAction,
  restoreBackupAction,
  updateBackupSettingsAction,
} from "@/lib/actions/backups";

interface Backup {
  filename: string;
  size: number;
  createdAt: Date;
}

interface BackupSettings {
  enabled: boolean;
  intervalHours: number;
  keepCount: number;
  lastBackupAt?: Date | null;
}

interface BackupsViewProps {
  initialBackups: Backup[];
  initialSettings: BackupSettings;
}

export function BackupsView({
  initialBackups,
  initialSettings,
}: BackupsViewProps) {
  const t = useT();
  const [backups, setBackups] = useState<Backup[]>(initialBackups);
  const [settings, setSettings] = useState<BackupSettings>(initialSettings);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  function formatSize(bytes: number) {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  }

  async function handleCreateBackup() {
    setIsCreating(true);
    try {
      const result = await createBackupAction();
      if (result.success) {
        toast.success("Бэкап успешно создан");
        // Reload list (simplest for now)
        window.location.reload();
      }
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Ошибка создания бэкапа",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteBackup(filename: string) {
    try {
      await deleteBackupAction(filename);
      setBackups(backups.filter((b) => b.filename !== filename));
      toast.success("Бэкап удален");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Ошибка удаления");
    }
  }

  async function handleRestoreBackup(filename: string) {
    setIsRestoring(filename);
    try {
      await restoreBackupAction(filename);
      toast.success("База данных успешно восстановлена");
      // Session might be invalid after restore if users table changed
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Ошибка восстановления",
      );
    } finally {
      setIsRestoring(null);
    }
  }

  async function handleSaveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await updateBackupSettingsAction(settings);
      toast.success("Настройки сохранены");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Ошибка сохранения");
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr,300px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Список бэкапов</h2>
          <Button onClick={handleCreateBackup} disabled={isCreating}>
            {isCreating ? (
              <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <IconPlus className="mr-2 h-4 w-4" />
            )}
            Создать бэкап
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Файл</TableHead>
                <TableHead>Размер</TableHead>
                <TableHead>Дата создания</TableHead>
                <TableHead className="w-40 text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Бэкапы не найдены
                  </TableCell>
                </TableRow>
              ) : (
                backups.map((backup) => (
                  <TableRow key={backup.filename}>
                    <TableCell className="font-mono text-xs">
                      {backup.filename}
                    </TableCell>
                    <TableCell>{formatSize(backup.size)}</TableCell>
                    <TableCell>
                      {new Date(backup.createdAt).toLocaleString("ru-RU")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t("common.download")}
                          onClick={() => downloadBackup(backup.filename)}
                        >
                          <IconDownload size={16} />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Восстановить"
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            >
                              <IconRestore size={16} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Восстановление БД
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Вы уверены, что хотите восстановить базу данных
                                из файла <strong>{backup.filename}</strong>?
                                <br />
                                <span className="text-destructive font-semibold">
                                  Текущие данные будут заменены данными из
                                  бэкапа!
                                </span>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                disabled={!!isRestoring}
                                onClick={() =>
                                  handleRestoreBackup(backup.filename)
                                }
                              >
                                {isRestoring === backup.filename ? (
                                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <IconRestore className="mr-2 h-4 w-4" />
                                )}
                                Восстановить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Удалить"
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <IconTrash size={16} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Удаление бэкапа
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Вы уверены, что хотите удалить файл бэкапа{" "}
                                <strong>{backup.filename}</strong>? Это действие
                                необратимо.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                onClick={() =>
                                  handleDeleteBackup(backup.filename)
                                }
                              >
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="transition-none hover:translate-y-0 hover:shadow-xs">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <IconSettings size={18} />
              Автобэкапы
            </CardTitle>
            <CardDescription>
              Настройка периодического копирования
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="enabled">Включено</Label>
                <Switch
                  id="enabled"
                  checked={settings.enabled}
                  onCheckedChange={(checked: boolean) =>
                    setSettings({ ...settings, enabled: checked })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label required htmlFor="interval">Интервал (часов)</Label>
                <Input
                  id="interval"
                  type="number"
                  min="1"
                  max="168"
                  value={settings.intervalHours}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      intervalHours: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label required htmlFor="keep">Хранить копий</Label>
                <Input
                  id="keep"
                  type="number"
                  min="1"
                  max="100"
                  value={settings.keepCount}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      keepCount: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>

              {settings.lastBackupAt && (
                <p className="text-[10px] text-muted-foreground italic">
                  Последний:{" "}
                  {new Date(settings.lastBackupAt).toLocaleString("ru-RU")}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSavingSettings}
              >
                {isSavingSettings ? (
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Сохранить
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="transition-none hover:translate-y-0 hover:shadow-xs">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
  <IconDatabase size={18} />
              Инфо
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>
              Бэкапы сохраняются в формате SQL (plain text) с командами очистки
              (DROP TABLE).
            </p>
            <p>
              При восстановлении все текущие данные будут удалены и заменены
              данными из выбранного файла.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
