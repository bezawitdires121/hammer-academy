import { prisma } from "@/lib/prisma";

type SearchParams = Promise<{
  period?: string;
  category?: string;
  schoolYearId?: string;
  gradeId?: string;
  sectionId?: string;
}>;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const period = params.period || "all";
  const category = params.category || "overview";
  const schoolYearId = params.schoolYearId || "all";
  const gradeId = params.gradeId || "all";
  const sectionId = params.sectionId || "all";

  const [schoolYears, grades, sections] = await Promise.all([
    prisma.schoolYear.findMany({
      orderBy: { label: "desc" },
    }),

    prisma.grade.findMany({
      orderBy: { level: "asc" },
    }),

    prisma.section.findMany({
      include: {
        grade: true,
        schoolYear: true,
      },
      orderBy: [
        { grade: { level: "asc" } },
        { label: "asc" },
      ],
    }),
  ]);

  /*
   * ---------------------------------------------------------
   * DATE FILTER
   * ---------------------------------------------------------
   */

  const dateFilter = getDateFilter(period);

  /*
   * ---------------------------------------------------------
   * ENROLLMENT FILTER
   * ---------------------------------------------------------
   */

  const enrollmentFilter: any = {};

  if (schoolYearId !== "all") {
    enrollmentFilter.schoolYearId = schoolYearId;
  }

  if (gradeId !== "all") {
    enrollmentFilter.section = {
      gradeId,
    };
  }

  if (sectionId !== "all") {
    enrollmentFilter.sectionId = sectionId;
  }

  const hasEnrollmentFilter =
    Object.keys(enrollmentFilter).length > 0;

  /*
   * ---------------------------------------------------------
   * STUDENTS
   * ---------------------------------------------------------
   */

  const studentWhere: any = hasEnrollmentFilter
    ? {
        enrollments: {
          some: enrollmentFilter,
        },
      }
    : {};

  /*
   * ---------------------------------------------------------
   * TEACHERS
   * ---------------------------------------------------------
   */

  const teacherWhere: any = {};

  if (
    schoolYearId !== "all" ||
    gradeId !== "all" ||
    sectionId !== "all"
  ) {
    const sectionConditions: any = {};

    if (schoolYearId !== "all") {
      sectionConditions.schoolYearId = schoolYearId;
    }

    if (gradeId !== "all") {
      sectionConditions.gradeId = gradeId;
    }

    if (sectionId !== "all") {
      sectionConditions.id = sectionId;
    }

    teacherWhere.OR = [
      {
        homeroomSections: {
          some: sectionConditions,
        },
      },
      {
        subjectAssignments: {
          some: {
            section: sectionConditions,
          },
        },
      },
    ];
  }

  /*
   * ---------------------------------------------------------
   * ATTENDANCE
   * ---------------------------------------------------------
   */

  const attendanceWhere: any = {
    ...dateFilter,
  };

  if (schoolYearId !== "all") {
    attendanceWhere.section = {
      ...(attendanceWhere.section || {}),
      schoolYearId,
    };
  }

  if (gradeId !== "all") {
    attendanceWhere.section = {
      ...(attendanceWhere.section || {}),
      gradeId,
    };
  }

  if (sectionId !== "all") {
    attendanceWhere.sectionId = sectionId;
  }

  /*
   * ---------------------------------------------------------
   * RESULTS
   * ---------------------------------------------------------
   */

  const resultCardWhere: any = {};

  if (schoolYearId !== "all") {
    resultCardWhere.exam = {
      schoolYearId,
    };
  }

  if (gradeId !== "all" || sectionId !== "all") {
    resultCardWhere.student = {
      enrollments: {
        some: {
          ...(schoolYearId !== "all"
            ? { schoolYearId }
            : {}),
          ...(gradeId !== "all"
            ? {
                section: {
                  gradeId,
                },
              }
            : {}),
          ...(sectionId !== "all"
            ? {
                sectionId,
              }
            : {}),
        },
      },
    };
  }

  /*
   * ---------------------------------------------------------
   * HOMEWORK
   * ---------------------------------------------------------
   */

  const homeworkWhere: any = {
    ...dateFilter,
  };

  if (schoolYearId !== "all") {
    homeworkWhere.section = {
      ...(homeworkWhere.section || {}),
      schoolYearId,
    };
  }

  if (gradeId !== "all") {
    homeworkWhere.section = {
      ...(homeworkWhere.section || {}),
      gradeId,
    };
  }

  if (sectionId !== "all") {
    homeworkWhere.sectionId = sectionId;
  }

  /*
   * ---------------------------------------------------------
   * HEALTH
   * ---------------------------------------------------------
   */

  const healthStudentFilter: any = hasEnrollmentFilter
    ? {
        student: {
          enrollments: {
            some: enrollmentFilter,
          },
        },
      }
    : {};

  const healthVisitWhere: any = {
    ...(period !== "all"
      ? {
          visitDate: {
            ...dateFilter.createdAt,
          },
        }
      : {}),
    ...healthStudentFilter,
  };

  const healthConditionWhere: any = {
    ...(period !== "all" ? dateFilter : {}),
    ...healthStudentFilter,
  };

  /*
   * ---------------------------------------------------------
   * LIBRARY
   * ---------------------------------------------------------
   */

  const loanWhere: any = {
    ...(period !== "all"
      ? {
          borrowedAt: {
            ...dateFilter.createdAt,
          },
        }
      : {}),
    ...(hasEnrollmentFilter
      ? {
          student: {
            enrollments: {
              some: enrollmentFilter,
            },
          },
        }
      : {}),
  };

  const libraryRoleWhere: any = hasEnrollmentFilter
    ? {
        student: {
          enrollments: {
            some: enrollmentFilter,
          },
        },
      }
    : {};

  /*
   * ---------------------------------------------------------
   * EMPLOYEES
   * ---------------------------------------------------------
   */

  const employeeWhere: any =
    period !== "all"
      ? {
          ...dateFilter,
        }
      : {};

  /*
   * ---------------------------------------------------------
   * APPLICATIONS
   * ---------------------------------------------------------
   */

  const applicationWhere: any = {
    status: "PENDING",
    ...(period !== "all" ? dateFilter : {}),
  };

  /*
   * ---------------------------------------------------------
   * LOAD ANALYTICS
   * ---------------------------------------------------------
   */

  const [
    totalStudents,
    totalTeachers,
    totalEmployees,
    pendingApplications,

    totalAttendance,
    presentAttendance,
    absentAttendance,
    lateAttendance,
    permissionAttendance,

    totalResultCards,
    publishedResultCards,

    totalHomework,
    totalHomeworkAssessments,
    completedHomework,

    totalAnnouncements,
    totalNotifications,
    totalTeacherMessages,
    totalAdminMessages,
    totalExams,

    totalHealthVisits,
    totalHealthConditions,
    healthFollowUps,
    healthReferrals,

    totalLoans,
    borrowedLoans,
    returnedLoans,
    overdueLoans,
    lostLoans,
    damagedLoans,
    totalLibraryRoles,
  ] = await Promise.all([
    prisma.student.count({
      where: studentWhere,
    }),

    prisma.teacher.count({
      where: teacherWhere,
    }),

    prisma.employee.count({
      where: employeeWhere,
    }),

    prisma.teacherApplication.count({
      where: applicationWhere,
    }),

    prisma.attendance.count({
      where: attendanceWhere,
    }),

    prisma.attendance.count({
      where: {
        ...attendanceWhere,
        status: "PRESENT",
      },
    }),

    prisma.attendance.count({
      where: {
        ...attendanceWhere,
        status: "ABSENT",
      },
    }),

    prisma.attendance.count({
      where: {
        ...attendanceWhere,
        status: "LATE",
      },
    }),

    prisma.attendance.count({
      where: {
        ...attendanceWhere,
        status: "PERMISSION_GIVEN",
      },
    }),

    prisma.resultCard.count({
      where: resultCardWhere,
    }),

    prisma.resultCard.count({
      where: {
        ...resultCardWhere,
        status: "PUBLISHED",
      },
    }),

    prisma.homework.count({
      where: homeworkWhere,
    }),

    prisma.homeworkAssessment.count({
      where: {
        homework: homeworkWhere,
      },
    }),

    prisma.homeworkAssessment.count({
      where: {
        homework: homeworkWhere,
        level: {
          not: "NOT_DONE",
        },
      },
    }),

    prisma.announcement.count({
      where: dateFilter,
    }),

    prisma.notification.count({
      where: dateFilter,
    }),

    prisma.studentTeacherMessage.count({
      where: dateFilter,
    }),

    prisma.studentAdminMessage.count({
      where: dateFilter,
    }),

    prisma.exam.count({
      where:
        schoolYearId !== "all"
          ? {
              schoolYearId,
            }
          : undefined,
    }),

    prisma.healthVisit.count({
      where: healthVisitWhere,
    }),

    prisma.healthCondition.count({
      where: healthConditionWhere,
    }),

    prisma.healthVisit.count({
      where: {
        ...healthVisitWhere,
        followUpAt: {
          not: null,
        },
      },
    }),

    prisma.healthVisit.count({
      where: {
        ...healthVisitWhere,
        referral: {
          not: null,
        },
      },
    }),

    prisma.loan.count({
      where: loanWhere,
    }),

    prisma.loan.count({
      where: {
        ...loanWhere,
        status: "BORROWED",
      },
    }),

    prisma.loan.count({
      where: {
        ...loanWhere,
        status: "RETURNED",
      },
    }),

    prisma.loan.count({
      where: {
        ...loanWhere,
        status: "OVERDUE",
      },
    }),

    prisma.loan.count({
      where: {
        ...loanWhere,
        status: "LOST",
      },
    }),

    prisma.loan.count({
      where: {
        ...loanWhere,
        status: "DAMAGED",
      },
    }),

    prisma.studentLibraryRole.count({
      where: libraryRoleWhere,
    }),
  ]);

  /*
   * ---------------------------------------------------------
   * CALCULATED RATES
   * ---------------------------------------------------------
   */

  const attendanceRate =
    totalAttendance > 0
      ? Math.round(
          (presentAttendance / totalAttendance) * 100
        )
      : 0;

  const homeworkRate =
    totalHomeworkAssessments > 0
      ? Math.round(
          (completedHomework / totalHomeworkAssessments) * 100
        )
      : 0;

  const resultRate =
    totalResultCards > 0
      ? Math.round(
          (publishedResultCards / totalResultCards) * 100
        )
      : 0;

  /*
   * ---------------------------------------------------------
   * SELECTED FILTER INFORMATION
   * ---------------------------------------------------------
   */

  const selectedSection = sections.find(
    (section) => section.id === sectionId
  );

  const selectedGrade = grades.find(
    (grade) => grade.id === gradeId
  );

  const selectedSchoolYear = schoolYears.find(
    (year) => year.id === schoolYearId
  );

  /*
   * ---------------------------------------------------------
   * CATEGORY VISIBILITY
   *
   * This is the important part:
   * The Analytics dropdown now controls which analytics
   * sections are displayed.
   * ---------------------------------------------------------
   */

  const isOverview = category === "overview";

  const showStudents =
    isOverview || category === "students";

  const showTeachers =
    isOverview || category === "teachers";

  const showEmployees =
    isOverview || category === "employees";

  const showAttendance =
    isOverview || category === "attendance";

  const showResults =
    isOverview || category === "results";

  const showHomework =
    isOverview || category === "homework";

  const showExams =
    isOverview || category === "exams";

  const showApplications =
    isOverview || category === "applications";

  const showAnnouncements =
    isOverview || category === "announcements";

  const showMessages =
    isOverview || category === "messages";

  const showNotifications =
    isOverview || category === "notifications";

  const showHealth =
    isOverview || category === "health";

  const showLibrary =
    isOverview || category === "library";

  const showActivity =
    isOverview || category === "activity";

  return (
    <div className="space-y-8">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div>
        <h1 className="text-2xl font-semibold text-brand-primary">
          Analytics
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Analyze everything happening across Level UP Academy.
        </p>
      </div>

      {/* =====================================================
          FILTERS
      ====================================================== */}

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="font-semibold text-gray-900">
            Analytics Filters
          </h2>

          <p className="text-sm text-gray-500">
            Choose the period and area you want to analyze.
          </p>
        </div>

        <form
          method="GET"
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5"
        >
          <Filter label="Period">
            <select
              name="period"
              defaultValue={period}
              className="filter-input"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </Filter>

          <Filter label="Analytics">
            <select
              name="category"
              defaultValue={category}
              className="filter-input"
            >
              <option value="overview">Overview</option>
              <option value="students">Students</option>
              <option value="teachers">Teachers</option>
              <option value="employees">Employees</option>
              <option value="attendance">Attendance</option>
              <option value="results">Results</option>
              <option value="homework">Homework</option>
              <option value="exams">Exams</option>
              <option value="applications">
                Applications
              </option>
              <option value="announcements">
                Announcements
              </option>
              <option value="messages">Messages</option>
              <option value="notifications">
                Notifications
              </option>
              <option value="health">Health</option>
              <option value="library">Library</option>
              <option value="activity">
                System Activity
              </option>
            </select>
          </Filter>

          <Filter label="School Year">
            <select
              name="schoolYearId"
              defaultValue={schoolYearId}
              className="filter-input"
            >
              <option value="all">
                All School Years
              </option>

              {schoolYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.label}
                  {year.isCurrent ? " (Current)" : ""}
                </option>
              ))}
            </select>
          </Filter>

          <Filter label="Grade">
            <select
              name="gradeId"
              defaultValue={gradeId}
              className="filter-input"
            >
              <option value="all">All Grades</option>

              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  Grade {grade.level}
                </option>
              ))}
            </select>
          </Filter>

          <Filter label="Section">
            <select
              name="sectionId"
              defaultValue={sectionId}
              className="filter-input"
            >
              <option value="all">All Sections</option>

              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  Grade {section.grade.level}
                  {section.label} — {section.schoolYear.label}
                </option>
              ))}
            </select>
          </Filter>

          <div className="md:col-span-2 lg:col-span-5">
            <button
              type="submit"
              className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Apply Filters
            </button>

            <a
              href="/dashboard/admin/analytics"
              className="ml-2 inline-block rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Reset
            </a>
          </div>
        </form>
      </section>

      {/* =====================================================
          ACTIVE FILTERS
      ====================================================== */}

      {(period !== "all" ||
        schoolYearId !== "all" ||
        gradeId !== "all" ||
        sectionId !== "all") && (
        <div className="flex flex-wrap gap-2">
          {period !== "all" && (
            <FilterBadge
              text={`Period: ${formatPeriod(period)}`}
            />
          )}

          {selectedSchoolYear && (
            <FilterBadge
              text={`Year: ${selectedSchoolYear.label}`}
            />
          )}

          {selectedGrade && (
            <FilterBadge
              text={`Grade: ${selectedGrade.level}`}
            />
          )}

          {selectedSection && (
            <FilterBadge
              text={`Section: ${selectedSection.label}`}
            />
          )}
        </div>
      )}

      {/* =====================================================
          SELECTED CATEGORY TITLE
      ====================================================== */}

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {formatCategory(category)}
          </h2>

          <p className="text-sm text-gray-500">
            Statistics based on your selected filters.
          </p>
        </div>

        {/* ===================================================
            STUDENTS
        ==================================================== */}

        {showStudents && (
          <AnalyticsSection title="Student Analytics">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Students"
                value={totalStudents}
                description="Students in selected scope"
              />
            </div>
          </AnalyticsSection>
        )}

        {/* ===================================================
            TEACHERS
        ==================================================== */}

        {showTeachers && (
          <AnalyticsSection title="Teacher Analytics">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Teachers"
                value={totalTeachers}
                description="Teachers in selected scope"
              />
            </div>
          </AnalyticsSection>
        )}

        {/* ===================================================
            EMPLOYEES
        ==================================================== */}

        {showEmployees && (
          <AnalyticsSection title="Employee Analytics">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Employees"
                value={totalEmployees}
                description="Employees created in selected period"
              />
            </div>
          </AnalyticsSection>
        )}

        {/* ===================================================
            ATTENDANCE
        ==================================================== */}

        {showAttendance && (
          <AnalyticsSection title="Attendance Analytics">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <AnalyticsPanel title="Attendance">
                <Metric
                  label="Total Records"
                  value={totalAttendance}
                />

                <Metric
                  label="Present"
                  value={presentAttendance}
                />

                <Metric
                  label="Absent"
                  value={absentAttendance}
                />

                <Metric
                  label="Late"
                  value={lateAttendance}
                />

                <Metric
                  label="Permission"
                  value={permissionAttendance}
                />

                <Metric
                  label="Attendance Rate"
                  value={`${attendanceRate}%`}
                />
              </AnalyticsPanel>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StatCard
                  label="Attendance Rate"
                  value={`${attendanceRate}%`}
                  description={`${presentAttendance} present`}
                />

                <StatCard
                  label="Present"
                  value={presentAttendance}
                  description="Present records"
                />

                <StatCard
                  label="Absent"
                  value={absentAttendance}
                  description="Absent records"
                />

                <StatCard
                  label="Late"
                  value={lateAttendance}
                  description="Late records"
                />
              </div>
            </div>
          </AnalyticsSection>
        )}

        {/* ===================================================
            RESULTS
        ==================================================== */}

        {showResults && (
          <AnalyticsSection title="Results Analytics">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <AnalyticsPanel title="Results">
                <Metric
                  label="Result Cards"
                  value={totalResultCards}
                />

                <Metric
                  label="Published"
                  value={publishedResultCards}
                />

                <Metric
                  label="Not Published"
                  value={
                    totalResultCards -
                    publishedResultCards
                  }
                />

                <Metric
                  label="Publication Rate"
                  value={`${resultRate}%`}
                />
              </AnalyticsPanel>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StatCard
                  label="Result Cards"
                  value={totalResultCards}
                  description="Result cards in selected scope"
                />

                <StatCard
                  label="Published"
                  value={publishedResultCards}
                  description="Published result cards"
                />

                <StatCard
                  label="Not Published"
                  value={
                    totalResultCards -
                    publishedResultCards
                  }
                  description="Awaiting publication"
                />

                <StatCard
                  label="Publication Rate"
                  value={`${resultRate}%`}
                  description="Published percentage"
                />
              </div>
            </div>
          </AnalyticsSection>
        )}

        {/* ===================================================
            HOMEWORK
        ==================================================== */}

        {showHomework && (
          <AnalyticsSection title="Homework Analytics">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Homework"
                value={totalHomework}
                description="Homework in selected scope"
              />

              <StatCard
                label="Assessments"
                value={totalHomeworkAssessments}
                description="Homework assessments"
              />

              <StatCard
                label="Completed"
                value={completedHomework}
                description="Completed homework"
              />

              <StatCard
                label="Completion Rate"
                value={`${homeworkRate}%`}
                description="Homework completion"
              />
            </div>
          </AnalyticsSection>
        )}

        {/* ===================================================
            EXAMS
        ==================================================== */}

        {showExams && (
          <AnalyticsSection title="Exam Analytics">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Exams"
                value={totalExams}
                description="School exams"
              />
            </div>
          </AnalyticsSection>
        )}

        {/* ===================================================
            APPLICATIONS
        ==================================================== */}

        {showApplications && (
          <AnalyticsSection title="Application Analytics">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Pending Applications"
                value={pendingApplications}
                description="Awaiting review"
              />
            </div>
          </AnalyticsSection>
        )}

        {/* ===================================================
            ANNOUNCEMENTS
        ==================================================== */}

        {showAnnouncements && (
          <AnalyticsSection title="Announcement Analytics">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Announcements"
                value={totalAnnouncements}
                description="Announcements in selected period"
              />
            </div>
          </AnalyticsSection>
        )}

        {/* ===================================================
            MESSAGES
        ==================================================== */}

        {showMessages && (
          <AnalyticsSection title="Message Analytics">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <AnalyticsPanel title="Messages">
                <Metric
                  label="Teacher Messages"
                  value={totalTeacherMessages}
                />

                <Metric
                  label="Admin Messages"
                  value={totalAdminMessages}
                />

                <Metric
                  label="Total Messages"
                  value={
                    totalTeacherMessages +
                    totalAdminMessages
                  }
                />
              </AnalyticsPanel>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StatCard
                  label="Teacher Messages"
                  value={totalTeacherMessages}
                  description="Teacher-to-student messages"
                />

                <StatCard
                  label="Admin Messages"
                  value={totalAdminMessages}
                  description="Admin messages"
                />
              </div>
            </div>
          </AnalyticsSection>
        )}

        {/* ===================================================
            NOTIFICATIONS
        ==================================================== */}

        {showNotifications && (
          <AnalyticsSection title="Notification Analytics">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Notifications"
                value={totalNotifications}
                description="Notifications in selected period"
              />
            </div>
          </AnalyticsSection>
        )}

        {/* ===================================================
            HEALTH
        ==================================================== */}

        {showHealth && (
          <AnalyticsSection title="Health Analytics">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Health Visits"
                value={totalHealthVisits}
                description="Recorded visits"
              />

              <StatCard
                label="Conditions"
                value={totalHealthConditions}
                description="Recorded health conditions"
              />

              <StatCard
                label="Follow-ups"
                value={healthFollowUps}
                description="Visits with follow-up dates"
              />

              <StatCard
                label="Referrals"
                value={healthReferrals}
                description="Visits containing referrals"
              />
            </div>

            <div className="mt-6">
              <AnalyticsPanel title="Health Activity">
                <Metric
                  label="Total Visits"
                  value={totalHealthVisits}
                />

                <Metric
                  label="Health Conditions"
                  value={totalHealthConditions}
                />

                <Metric
                  label="Follow-ups"
                  value={healthFollowUps}
                />

                <Metric
                  label="Referrals"
                  value={healthReferrals}
                />
              </AnalyticsPanel>
            </div>
          </AnalyticsSection>
        )}

        {/* ===================================================
            LIBRARY
        ==================================================== */}

        {showLibrary && (
          <AnalyticsSection title="Library Analytics">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total Loans"
                value={totalLoans}
                description="Loans in selected period"
              />

              <StatCard
                label="Borrowed"
                value={borrowedLoans}
                description="Currently borrowed"
              />

              <StatCard
                label="Returned"
                value={returnedLoans}
                description="Returned loans"
              />

              <StatCard
                label="Overdue"
                value={overdueLoans}
                description="Loans marked overdue"
              />

              <StatCard
                label="Lost"
                value={lostLoans}
                description="Books marked lost"
              />

              <StatCard
                label="Damaged"
                value={damagedLoans}
                description="Books marked damaged"
              />

              <StatCard
                label="Library Roles"
                value={totalLibraryRoles}
                description="Students with library roles"
              />
            </div>
          </AnalyticsSection>
        )}

        {/* ===================================================
            SYSTEM ACTIVITY
        ==================================================== */}

        {showActivity && (
          <AnalyticsSection title="System Activity">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Announcements"
                value={totalAnnouncements}
                description="System announcements"
              />

              <StatCard
                label="Notifications"
                value={totalNotifications}
                description="System notifications"
              />

              <StatCard
                label="Teacher Messages"
                value={totalTeacherMessages}
                description="Teacher messages"
              />

              <StatCard
                label="Admin Messages"
                value={totalAdminMessages}
                description="Admin messages"
              />
            </div>
          </AnalyticsSection>
        )}
      </section>
    </div>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function Filter({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>

      {children}
    </div>
  );
}

function AnalyticsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-900">
          {title}
        </h2>
      </div>

      {children}
    </section>
  );
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number | string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-brand-primary">
        {value}
      </p>

      <p className="mt-2 text-xs text-gray-400">
        {description}
      </p>
    </div>
  );
}

function AnalyticsPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="font-semibold text-gray-900">
        {title}
      </h2>

      <div className="mt-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-gray-600">
        {label}
      </span>

      <span className="font-semibold text-gray-900">
        {value}
      </span>
    </div>
  );
}

function FilterBadge({ text }: { text: string }) {
  return (
    <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-medium text-brand-primary">
      {text}
    </span>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function formatPeriod(period: string) {
  switch (period) {
    case "today":
      return "Today";

    case "week":
      return "This Week";

    case "month":
      return "This Month";

    case "year":
      return "This Year";

    default:
      return "All Time";
  }
}

function formatCategory(category: string) {
  switch (category) {
    case "students":
      return "Student Analytics";

    case "teachers":
      return "Teacher Analytics";

    case "employees":
      return "Employee Analytics";

    case "attendance":
      return "Attendance Analytics";

    case "results":
      return "Results Analytics";

    case "homework":
      return "Homework Analytics";

    case "exams":
      return "Exam Analytics";

    case "applications":
      return "Application Analytics";

    case "announcements":
      return "Announcement Analytics";

    case "messages":
      return "Message Analytics";

    case "notifications":
      return "Notification Analytics";

    case "health":
      return "Health Analytics";

    case "library":
      return "Library Analytics";

    case "activity":
      return "System Activity";

    default:
      return "School Overview";
  }
}

function getDateFilter(period: string) {
  if (period === "all") {
    return {};
  }

  const now = new Date();

  let start: Date;

  if (period === "today") {
    start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
  } else if (period === "week") {
    start = new Date(now);
    start.setDate(now.getDate() - 7);
  } else if (period === "month") {
    start = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );
  } else if (period === "year") {
    start = new Date(
      now.getFullYear(),
      0,
      1
    );
  } else {
    return {};
  }

  return {
    createdAt: {
      gte: start,
      lte: now,
    },
  };
}