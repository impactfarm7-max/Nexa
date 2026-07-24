import StudentCenterGuard from "@/app/components/StudentCenterGuard";
import PluriannualStudentRouteGuard from "@/app/components/PluriannualStudentRouteGuard";

export default function TcfCanadaLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudentCenterGuard overlayMode={true}>
      <PluriannualStudentRouteGuard>{children}</PluriannualStudentRouteGuard>
    </StudentCenterGuard>
  );
}
