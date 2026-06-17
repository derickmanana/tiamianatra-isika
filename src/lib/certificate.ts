import jsPDF from "jspdf";

export async function generateCertificatePdf(opts: {
  fullName: string;
  formationTitle: string;
  issuedAt: Date;
  signatureDataUrl?: string;
}): Promise<Blob> {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // background
  doc.setFillColor(248, 250, 255);
  doc.rect(0, 0, W, H, "F");

  // gold border
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(6);
  doc.rect(24, 24, W - 48, H - 48);
  doc.setLineWidth(1);
  doc.rect(36, 36, W - 72, H - 72);

  // header
  doc.setTextColor(30, 58, 138);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.text("M'BossTsika", W / 2, 100, { align: "center" });

  doc.setFontSize(20);
  doc.setTextColor(80, 80, 80);
  doc.setFont("helvetica", "normal");
  doc.text("Certificat de réussite", W / 2, 135, { align: "center" });

  // body
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 60);
  doc.text("Décerné à", W / 2, 200, { align: "center" });

  doc.setFontSize(40);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138);
  doc.text(opts.fullName || "Apprenant", W / 2, 250, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(
    "Pour avoir suivi avec succès l'ensemble des modules de la formation :",
    W / 2,
    295,
    { align: "center" },
  );

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(212, 175, 55);
  doc.text(`« ${opts.formationTitle} »`, W / 2, 335, { align: "center" });

  // date + signature
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Délivré le ${opts.issuedAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}`,
    W / 2,
    H - 110,
    { align: "center" },
  );

  if (opts.signatureDataUrl) {
    try {
      doc.addImage(opts.signatureDataUrl, "PNG", W / 2 - 70, H - 95, 140, 50);
    } catch {
      /* ignore image errors */
    }
  }
  doc.setDrawColor(120, 120, 120);
  doc.line(W / 2 - 100, H - 60, W / 2 + 100, H - 60);
  doc.setFontSize(10);
  doc.text("Direction M'BossTsika", W / 2, H - 45, { align: "center" });

  return doc.output("blob");
}
