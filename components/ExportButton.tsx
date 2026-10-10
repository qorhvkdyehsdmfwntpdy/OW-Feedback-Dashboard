"use client";

import { Download, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";
import { useState, type RefObject } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ExportButtonProps {
  targetRef: RefObject<HTMLElement | null>;
  fileName?: string;
}

export function ExportButton({ targetRef, fileName = "ow-squad-report" }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  async function exportImage() {
    const target = targetRef.current;
    if (!target || exporting) return;

    setExporting(true);
    try {
      await document.fonts.ready;
      const dataUrl = await toPng(target, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0f172a",
        style: {
          backgroundColor: "#0f172a",
          color: "#f1f5f9",
          padding: "24px",
        },
      });
      const link = document.createElement("a");
      link.download = `${fileName}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("리포트 이미지를 저장했습니다.");
    } catch {
      toast.error("이미지를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Button type="button" onClick={exportImage} disabled={exporting}>
      {exporting ? <Loader2 className="animate-spin" /> : <Download />}
      {exporting ? "이미지 생성 중…" : "📸 리포트 이미지로 저장"}
    </Button>
  );
}
