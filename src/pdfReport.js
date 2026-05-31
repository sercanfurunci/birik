import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CAT_EMOJI } from "./categories.jsx";

const fmt = (n) =>
  parseFloat(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function exportPDF({ transactions, symbol, t, lang }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PAGE_W = 210;
  const MARGIN = 14;
  const COL_W  = PAGE_W - MARGIN * 2;
  const now    = new Date();
  const stamp  = now.toLocaleDateString(lang === "tr" ? "tr-TR" : "en-GB", { day: "numeric", month: "long", year: "numeric" });

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(99, 102, 241); // brand purple
  doc.rect(0, 0, PAGE_W, 22, "F");

  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("Birik", MARGIN, 14);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(stamp, PAGE_W - MARGIN, 14, { align: "right" });

  // ── Date range ────────────────────────────────────────────────────────────
  const dates  = transactions.map(tx => (tx.date || "").slice(0, 10)).filter(Boolean).sort();
  const period = dates.length ? `${dates[0]}  →  ${dates[dates.length - 1]}` : "";

  doc.setTextColor(80, 80, 100);
  doc.setFontSize(9);
  doc.text(period, MARGIN, 30);

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalIncome  = transactions.filter(tx => tx.type === "income") .reduce((s, tx) => s + parseFloat(tx.amount), 0);
  const totalExpense = transactions.filter(tx => tx.type === "expense").reduce((s, tx) => s + parseFloat(tx.amount), 0);
  const net          = totalIncome - totalExpense;

  const summaryY = 36;
  const colW3    = COL_W / 3;
  const cards    = [
    { label: t("income"),   value: `+${symbol}${fmt(totalIncome)}`,  color: [22, 163, 74] },
    { label: t("expenses"), value: `-${symbol}${fmt(totalExpense)}`, color: [220, 38, 38] },
    { label: "Net",         value: `${net >= 0 ? "+" : ""}${symbol}${fmt(net)}`, color: net >= 0 ? [22, 163, 74] : [220, 38, 38] },
  ];

  cards.forEach(({ label, value, color }, i) => {
    const x = MARGIN + i * colW3;
    doc.setFillColor(248, 248, 252);
    doc.roundedRect(x, summaryY, colW3 - 2, 18, 2, 2, "F");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 140);
    doc.setFont("helvetica", "normal");
    doc.text(label.toUpperCase(), x + 4, summaryY + 6);
    doc.setFontSize(11);
    doc.setTextColor(...color);
    doc.setFont("helvetica", "bold");
    doc.text(value, x + 4, summaryY + 14);
  });

  // ── Category breakdown ────────────────────────────────────────────────────
  const catMap = {};
  transactions.filter(tx => tx.type === "expense").forEach(tx => {
    catMap[tx.category] = (catMap[tx.category] || 0) + parseFloat(tx.amount);
  });
  const catRows = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, val]) => [
      `${CAT_EMOJI[cat] || ""}  ${t(cat)}`,
      `${symbol}${fmt(val)}`,
      `${totalExpense > 0 ? ((val / totalExpense) * 100).toFixed(1) : 0}%`,
    ]);

  let cursorY = summaryY + 26;

  if (catRows.length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 100);
    doc.setFont("helvetica", "bold");
    doc.text(t("byCategory").toUpperCase(), MARGIN, cursorY);
    cursorY += 4;

    autoTable(doc, {
      startY: cursorY,
      head: [[t("category"), t("amount"), "%"]],
      body: catRows,
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 248, 252] },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right", cellWidth: 18 } },
    });
    cursorY = doc.lastAutoTable.finalY + 8;
  }

  // ── Transactions table ────────────────────────────────────────────────────
  const txRows = transactions
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(tx => [
      (tx.date || "").slice(0, 10),
      tx.description || "",
      `${CAT_EMOJI[tx.category] || ""}  ${t(tx.category)}`,
      { content: `${tx.type === "income" ? "+" : "−"}${symbol}${fmt(tx.amount)}`,
        styles: { textColor: tx.type === "income" ? [22, 163, 74] : [220, 38, 38] } },
    ]);

  doc.setFontSize(9);
  doc.setTextColor(80, 80, 100);
  doc.setFont("helvetica", "bold");
  doc.text(t("transactions").toUpperCase(), MARGIN, cursorY);
  cursorY += 4;

  autoTable(doc, {
    startY: cursorY,
    head: [[t("date"), t("description"), t("category"), t("amount")]],
    body: txRows,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    columnStyles: {
      0: { cellWidth: 24 },
      2: { cellWidth: 32 },
      3: { halign: "right", cellWidth: 28 },
    },
  });

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(180, 180, 200);
    doc.setFont("helvetica", "normal");
    doc.text(`Birik · ${stamp} · ${i}/${pageCount}`, PAGE_W / 2, 290, { align: "center" });
  }

  const filename = `birik-report-${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
