import PinGuard from "@/app/components/PinGuard";
import PaywallGuard from "@/app/components/PaywallGuard";
import StudentCenterGuard from "@/app/components/StudentCenterGuard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PinGuard>
      <PaywallGuard>
        {/* StudentCenterGuard en mode bannière pour le dashboard (accès partiel ok) */}
        <StudentCenterGuard overlayMode={false}>
          {children}
        </StudentCenterGuard>
      </PaywallGuard>
    </PinGuard>
  );
}