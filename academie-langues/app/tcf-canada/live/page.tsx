"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import StudentRouteSkeleton from "@/app/components/StudentRouteSkeleton";

/** Ancienne réservation live étudiant → coaching (présentiel / programmation centre). */
export default function TcfLivePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/coaching");
  }, [router]);

  return <StudentRouteSkeleton contentOnly variant="page" />;
}
