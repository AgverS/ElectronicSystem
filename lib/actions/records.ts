import { prisma } from "@/lib/prisma";
import { translate } from "@/lib/i18n/provider";
import { requireRole } from "@/lib/demo-actor";
import { Role, RecordKind } from "@/lib/prisma-client";
import { logAction } from "@/lib/audit";
import { saveUpload, deleteUpload, ALLOWED_MIME, MAX_FILE_SIZE } from "@/lib/uploads";

async function checkAdmin() {
  const user = await requireRole(Role.ADMIN);
  if (!user) throw new Error(translate("errors.accessDenied"));
  return user;
}

function parseKind(value: FormDataEntryValue | null): RecordKind {
  if (value === RecordKind.REWARD || value === RecordKind.PENALTY) return value;
  throw new Error(translate("errors.invalidRecordKind"));
}

function collectFiles(formData: FormData): File[] {
  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of files) {
    if (!ALLOWED_MIME.has(file.type)) {
      throw new Error(`Недопустимый формат файла: ${file.name}`);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Файл слишком большой (макс. 10 МБ): ${file.name}`);
    }
  }
  return files;
}

async function persistFiles(recordId: string, files: File[]) {
  for (const file of files) {
    const { storageKey, size } = await saveUpload(file);
    await prisma.recordAttachment.create({
      data: { recordId, fileName: file.name, mimeType: file.type, size, storageKey },
    });
  }
}

function revalidate() {
}

export async function createStudentRecord(formData: FormData) {
  const actor = await checkAdmin();

  const studentId = String(formData.get("studentId") ?? "");
  const kind = parseKind(formData.get("kind"));
  const number = String(formData.get("number") ?? "").trim();
  const dateStr = String(formData.get("date") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!studentId) throw new Error(translate("errors.noStudentSelected"));
  if (!number) throw new Error(translate("errors.orderNumberRequired"));
  if (!dateStr) throw new Error(translate("errors.orderDateRequired"));
  if (!reason) throw new Error(translate("errors.reasonRequired"));

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { role: true },
  });
  if (!student || student.role !== Role.STUDENT) {
    throw new Error(translate("errors.recordsStudentsOnly"));
  }

  // Validate everything before writing anything.
  const files = collectFiles(formData);

  const record = await prisma.studentRecord.create({
    data: { kind, number, date: new Date(dateStr), reason, studentId, issuedById: actor.id },
  });
  await persistFiles(record.id, files);

  await logAction({
    userId: actor.id,
    action: "CREATE_STUDENT_RECORD",
    entity: "student_record",
    entityId: record.id,
    meta: { kind, number, studentId },
  });
  revalidate();
}

export async function updateStudentRecord(formData: FormData) {
  const actor = await checkAdmin();

  const id = String(formData.get("id") ?? "");
  const kind = parseKind(formData.get("kind"));
  const number = String(formData.get("number") ?? "").trim();
  const dateStr = String(formData.get("date") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!id) throw new Error(translate("errors.noRecordSpecified"));
  if (!number) throw new Error(translate("errors.orderNumberRequired"));
  if (!dateStr) throw new Error(translate("errors.orderDateRequired"));
  if (!reason) throw new Error(translate("errors.reasonRequired"));

  const existing = await prisma.studentRecord.findUnique({
    where: { id },
    select: { id: true, studentId: true },
  });
  if (!existing) throw new Error(translate("errors.recordNotFound"));

  const files = collectFiles(formData);

  await prisma.studentRecord.update({
    where: { id },
    data: { kind, number, date: new Date(dateStr), reason },
  });
  await persistFiles(id, files);

  await logAction({
    userId: actor.id,
    action: "UPDATE_STUDENT_RECORD",
    entity: "student_record",
    entityId: id,
    meta: { kind, number, studentId: existing.studentId },
  });
  revalidate();
}

export async function deleteStudentRecord(id: string) {
  const actor = await checkAdmin();

  const record = await prisma.studentRecord.findUnique({
    where: { id },
    include: { attachments: { select: { storageKey: true } } },
  });
  if (!record) return;

  for (const attachment of record.attachments) {
    await deleteUpload(attachment.storageKey);
  }
  await prisma.studentRecord.delete({ where: { id } });

  await logAction({
    userId: actor.id,
    action: "DELETE_STUDENT_RECORD",
    entity: "student_record",
    entityId: id,
    meta: { kind: record.kind, number: record.number, studentId: record.studentId },
  });
  revalidate();
}

export async function writeOffStudentRecord(id: string) {
  const actor = await checkAdmin();

  const record = await prisma.studentRecord.findUnique({
    where: { id },
    select: { id: true, kind: true, number: true, studentId: true, writtenOffAt: true },
  });
  if (!record) throw new Error(translate("errors.recordNotFound"));
  if (record.kind !== RecordKind.PENALTY) {
    throw new Error(translate("errors.onlyPenaltiesWrittenOff"));
  }
  if (record.writtenOffAt) return; // уже списано

  await prisma.studentRecord.update({
    where: { id },
    data: { writtenOffAt: new Date(), writtenOffById: actor.id },
  });

  await logAction({
    userId: actor.id,
    action: "WRITE_OFF_STUDENT_RECORD",
    entity: "student_record",
    entityId: id,
    meta: { number: record.number, studentId: record.studentId },
  });
  revalidate();
}

export async function cancelStudentRecordWriteOff(id: string) {
  const actor = await checkAdmin();

  const record = await prisma.studentRecord.findUnique({
    where: { id },
    select: { id: true, number: true, studentId: true },
  });
  if (!record) throw new Error(translate("errors.recordNotFound"));

  await prisma.studentRecord.update({
    where: { id },
    data: { writtenOffAt: null, writtenOffById: null },
  });

  await logAction({
    userId: actor.id,
    action: "CANCEL_RECORD_WRITE_OFF",
    entity: "student_record",
    entityId: id,
    meta: { number: record.number, studentId: record.studentId },
  });
  revalidate();
}

export interface ImportRow {
  orderNumber: string;
  kind: RecordKind;
  reason: string;
  studentId: string;
  date: string; // ISO YYYY-MM-DD
}

export async function importStudentRecords(rows: ImportRow[]) {
  const actor = await checkAdmin();
  if (!rows.length) throw new Error(translate("errors.nothingToImport"));

  const created: string[] = [];

  for (const row of rows) {
    const record = await prisma.studentRecord.create({
      data: {
        kind: row.kind,
        number: row.orderNumber,
        date: new Date(row.date),
        reason: row.reason,
        studentId: row.studentId,
        issuedById: actor.id,
      },
    });
    created.push(record.id);
  }

  await logAction({
    userId: actor.id,
    action: "IMPORT_STUDENT_RECORDS",
    entity: "student_record",
    entityId: created[0] ?? "",
    meta: { count: created.length },
  });

  revalidate();
  return { count: created.length };
}

export async function deleteRecordAttachment(id: string) {
  const actor = await checkAdmin();

  const attachment = await prisma.recordAttachment.findUnique({
    where: { id },
    select: { id: true, storageKey: true, fileName: true, recordId: true },
  });
  if (!attachment) return;

  await deleteUpload(attachment.storageKey);
  await prisma.recordAttachment.delete({ where: { id } });

  await logAction({
    userId: actor.id,
    action: "DELETE_RECORD_ATTACHMENT",
    entity: "record_attachment",
    entityId: id,
    meta: { fileName: attachment.fileName, recordId: attachment.recordId },
  });
  revalidate();
}
