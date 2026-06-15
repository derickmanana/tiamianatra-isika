import { ArrowLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function BackButton() {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <Button variant="ghost" size="sm" onClick={() => router.history.back()} className="gap-1.5 mb-2">
      <ArrowLeft className="h-4 w-4" /> {t("common.back")}
    </Button>
  );
}
