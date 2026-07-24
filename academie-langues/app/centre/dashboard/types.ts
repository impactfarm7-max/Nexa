export type CenterInfo = {
  id: string;
  name: string;
  code: string | null;
  signup_slug?: string | null;
  city: string;
  status?: string;
  center_type?: string;
  plan_type?: string;
};

export type Campus = { id: string; name: string };

export type FinStats = { ca: number; paid: number; pending: number; late: number };

export type AbsentRow = { id: string; prenom: string; nom: string };

export type ExamRow = { id: string; title: string; actual_date: string; start_time: string };

export type GenericDashboardStats = {
  fin: FinStats;
  activeStudents: number;
  coursesCount: number;
  cancelledCount: number;
  absent: AbsentRow[];
  exams: ExamRow[];
  msgCount: number;
};

export type TcfDashboardStats = {
  totalStudents: number;
  enrolledToday: number;
  enrolledThisWeek: number;
  pendingValidation: number;
  inactiveStudents: number;
  onSimulator: number;
  coursesToday: number;
  livesScheduled: number;
  examsScheduled: number;
  collectedToday: number;
  latePayments: number;
  lateAmount: number;
  msgCount: number;
};
