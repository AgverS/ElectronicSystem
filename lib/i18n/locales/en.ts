/**
 * The English catalog is the source of truth.
 *
 * Every other language is a JSON file with the same keys; any key a translation
 * has not covered yet falls back to the English string here, so a partially
 * translated language still renders a complete interface.
 */

const en = {
  /* ------------------------------- brand -------------------------------- */
  "app.name": "Electronic Journal",
  "app.tagline": "Attendance, grades and timetables for a modern college",
  "app.institution": "Meridian Technical College",

  /* -------------------------------- demo -------------------------------- */
  "demo.badge": "Demo",
  "demo.banner.title": "This is an interactive demonstration",
  "demo.banner.body":
    "All data is fictional and lives only in your browser. Change anything you like — nobody else sees it, and you can restore the original data at any time.",
  "demo.reset": "Reset demo data",
  "demo.reset.confirm.title": "Reset the demo?",
  "demo.reset.confirm.body":
    "Every change you have made will be discarded and the original demo data restored.",
  "demo.reset.done": "Demo data restored",
  "demo.switchRole": "Switch role",
  "demo.viewingAs": "Viewing as",

  /* ------------------------------- landing ------------------------------- */
  "landing.heading": "Choose a role to explore",
  "landing.subheading":
    "The same system seen through three sets of eyes. Pick one to begin — you can switch at any time.",
  "landing.enter": "Enter",
  "landing.role.admin.title": "Administrator",
  "landing.role.admin.body":
    "Manage groups, timetables, specialties, semesters, subjects and people. Review journals, attendance reports and the audit trail.",
  "landing.role.teacher.title": "Teacher",
  "landing.role.teacher.body":
    "Mark attendance and grades, run the class journal, track laboratory work and see your own timetable.",
  "landing.role.student.title": "Student",
  "landing.role.student.body":
    "Check your grades, attendance, laboratory results, semester summaries and next lesson.",
  "landing.features": "What the system does",
  "landing.footer.source": "A demonstration build. No registration, no personal data.",
  "landing.publicSchedule": "Browse the public timetable without choosing a role",
  "landing.feature.attendance.title": "Attendance and grades",
  "landing.feature.attendance.body":
    "A full class group marked in seconds, with retakes, lateness and excused absences recorded properly.",
  "landing.feature.timetable.title": "Timetables and substitutions",
  "landing.feature.timetable.body":
    "Weekly timetables per group and per teacher, with cover lessons, cancellations and bell times.",
  "landing.feature.reporting.title": "Reports that add up",
  "landing.feature.reporting.body":
    "Absence summaries, semester results and laboratory progress, calculated the same way everywhere.",
  "landing.feature.records.title": "Rewards and penalties",
  "landing.feature.records.body":
    "An official record of commendations and sanctions, with supporting documents and write-off dates.",
  "landing.feature.exports.title": "Exports and printing",
  "landing.feature.exports.body":
    "Spreadsheet exports and print-ready attendance sheets that stay legible in black and white.",
  "landing.feature.mobile.title": "Built for phones too",
  "landing.feature.mobile.body":
    "Teachers mark attendance between lessons and students check grades on the way in. Everything scales down.",

  /* ------------------------------- role gate ----------------------------- */
  "gate.wrongRole.title": "Not available for this role",
  "gate.wrongRole.body":
    "The person you are currently viewing as does not have access to this area. Choose a different role to continue.",
  "gate.wrongRole.action": "Choose a role",

  /* -------------------------------- roles -------------------------------- */
  "role.ADMIN": "Administrator",
  "role.TEACHER": "Teacher",
  "role.STUDENT": "Student",
  "role.admin.section": "Administration",
  "role.teacher.section": "Teaching",
  "role.student.section": "My studies",

  /* ------------------------------ navigation ----------------------------- */
  "nav.overview": "Overview",
  "nav.academic": "Academic",
  "nav.journals": "Journals",
  "nav.attendanceReport": "Absence report",
  "nav.schedule": "Timetable",
  "nav.bells": "Bell times",
  "nav.records": "Rewards & penalties",
  "nav.management": "Management",
  "nav.users": "People",
  "nav.groups": "Groups",
  "nav.specialties": "Specialties",
  "nav.subjects": "Subjects",
  "nav.semesters": "Semesters",
  "nav.assignments": "Teaching assignments",
  "nav.system": "System",
  "nav.backups": "Backups",
  "nav.logs": "Audit log",
  "nav.myJournals": "My journals",
  "nav.curatedGroups": "Groups I curate",
  "nav.adminPanel": "Administrator panel",
  "nav.myAccount": "My account",
  "nav.profile": "Profile",
  "nav.myGroup": "My group",
  "nav.study": "Studies",
  "nav.myMarks": "My grades",
  "nav.labs": "Laboratory work",
  "nav.results": "Semester results",
  "nav.openMenu": "Open menu",

  /* ------------------------------- common -------------------------------- */
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.create": "Create",
  "common.add": "Add",
  "common.edit": "Edit",
  "common.delete": "Delete",
  "common.confirm": "Confirm",
  "common.search": "Search",
  "common.filter": "Filter",
  "common.reset": "Reset",
  "common.apply": "Apply",
  "common.export": "Export",
  "common.print": "Print",
  "common.import": "Import",
  "common.download": "Download",
  "common.loading": "Loading…",
  "common.saving": "Saving…",
  "common.noData": "Nothing to show yet",
  "common.notFound": "Not found",
  "common.all": "All",
  "common.none": "None",
  "common.yes": "Yes",
  "common.no": "No",
  "common.total": "Total",
  "common.actions": "Actions",
  "common.name": "Name",
  "common.date": "Date",
  "common.time": "Time",
  "common.room": "Room",
  "common.type": "Type",
  "common.status": "Status",
  "common.details": "Details",
  "common.back": "Back",
  "common.next": "Next",
  "common.previous": "Previous",
  "common.today": "Today",
  "common.week": "Week",
  "common.selected": "{count} selected",
  "common.page": "Page {page} of {total}",
  "common.theme": "Switch theme",
  "common.language": "Language",
  "common.required": "This field is required",
  "common.saved": "Saved",
  "common.deleted": "Deleted",
  "common.created": "Created",
  "common.updated": "Updated",
  "common.error": "Something went wrong",

  /* ------------------------------ academia ------------------------------- */
  "term.group": "Group",
  "term.groups": "Groups",
  "term.subject": "Subject",
  "term.subjects": "Subjects",
  "term.teacher": "Teacher",
  "term.teachers": "Teachers",
  "term.student": "Student",
  "term.students": "Students",
  "term.specialty": "Specialty",
  "term.semester": "Semester",
  "term.lesson": "Lesson",
  "term.lessons": "Lessons",
  "term.grade": "Grade",
  "term.grades": "Grades",
  "term.attendance": "Attendance",
  "term.absence": "Absence",
  "term.absences": "Absences",
  "term.curator": "Curator",
  "term.course": "Year",
  "term.topic": "Topic",
  "term.hours": "Hours",
  "term.average": "Average",
  "term.subgroup": "Subgroup",
  "term.year": "Academic year",

  /* ------------------------------- student ------------------------------- */
  "student.marks.title": "My grades",
  "student.marks.empty": "No grades recorded for the current semester yet",
  "student.noGroup": "You have not been added to a group yet.",
  "student.noSemesters": "No semesters have been set up yet.",
  "semester.fullName": "Year {course}, semester {number} ({year})",

  /* ---------------------------- lesson types ----------------------------- */
  "lessonType.lecture": "Lecture",
  "lessonType.practical": "Practical",
  "lessonType.lab": "Laboratory work",
  "lessonType.assessment": "Assessment",
  "lessonType.lecture.short": "Lec",
  "lessonType.practical.short": "Prac",
  "lessonType.lab.short": "Lab",
  "lessonType.assessment.short": "Asmt",

  /* -------------------------------- grades ------------------------------- */
  "grade.absent": "Absent",
  "grade.absent.short": "AB",
  "grade.clear": "Clear",
  "grade.retake": "Retake",
  "grade.lateness": "Minutes late",

  /* -------------------------------- labs --------------------------------- */
  "lab.status.passed": "Passed",
  "lab.status.failing": "Not passed",
  "lab.status.paid": "Overdue",
  "lab.status.pending": "In progress",
  "lab.deadline": "Deadline",
  "lab.issued": "Set",

  /* -------------------------------- days --------------------------------- */
  "day.1": "Monday",
  "day.2": "Tuesday",
  "day.3": "Wednesday",
  "day.4": "Thursday",
  "day.5": "Friday",
  "day.6": "Saturday",
  "day.7": "Sunday",
  "day.1.short": "Mon",
  "day.2.short": "Tue",
  "day.3.short": "Wed",
  "day.4.short": "Thu",
  "day.5.short": "Fri",
  "day.6.short": "Sat",
  "day.7.short": "Sun",

  /* ------------------------------ bell times ----------------------------- */
  "bells.title": "Bell times",
  "bells.permanent": "Standard timetable",
  "bells.overrides": "Temporary changes",
  "bells.dayGroup.main": "Mon, Tue, Wed, Fri",
  "bells.dayGroup.thu": "Thursday",
  "bells.dayGroup.sat": "Saturday",
  "bells.lessonNumber": "Lesson",
  "bells.start": "Starts",
  "bells.end": "Ends",
  "bells.noneToday": "No lessons scheduled today",

  /* ------------------------------- records ------------------------------- */
  "record.kind.REWARD": "Reward",
  "record.kind.PENALTY": "Penalty",
  "record.number": "Reference",
  "record.reason": "Reason",
  "record.issuedBy": "Issued by",
  "record.writtenOff": "Written off",
  "record.writeOff": "Write off",
} satisfies Record<string, string>;

export type MessageKey = keyof typeof en;

export default en as Record<string, string>;
