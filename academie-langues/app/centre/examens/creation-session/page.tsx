"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import CenterPageLoading from "@/app/components/CenterPageLoading";

export default function CreationSessionPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/centre/examens/planning");
  }, [router]);

  return <CenterPageLoading />;
}
