import type { jsPDF as JsPdf } from "jspdf"
import type { Transaction } from "@/lib/api-client"
import { formatDatePtBR } from "@/lib/dates"
import {
  MONTHS,
  MONTHS_SHORT,
  byCategory,
  categoryByMonth,
  inPeriod,
  money,
  monthlyTotals,
  percent,
  periodLabel,
  totals,
  wholeNumber,
  type Period,
} from "@/lib/finance"

// PDF do relatório desenhado direto com o jsPDF (texto e formas de verdade),
// com o mesmo layout do relatório em HTML (report-export.ts). Usado no
// iPhone/iPad, onde o PWA instalado na tela inicial não consegue imprimir: o
// arquivo vai para a tela de compartilhar do iOS (Imprimir, Arquivos, WhatsApp).
// Gerar a partir de uma "foto" da página (html2canvas) deixava as palavras
// grudadas no Safari.

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN_X = 33
const MARGIN_TOP = 30
const FOOTER_Y = PAGE_H - 22
const CONTENT_BOTTOM = PAGE_H - 44
const W = PAGE_W - 2 * MARGIN_X

const INK = "#0f172a"
const MUTED = "#475569"
const LINE = "#cbd5e1"
const ALT = "#f8fafc"
const GREEN = "#047857"
const RED = "#be123c"

class Writer {
  y = MARGIN_TOP
  readonly pdf: JsPdf
  constructor(pdf: JsPdf) {
    this.pdf = pdf
  }

  font(size: number, style: "normal" | "bold" = "normal", color = INK) {
    this.pdf.setFont("helvetica", style)
    this.pdf.setFontSize(size)
    this.pdf.setTextColor(color)
  }

  text(value: string, x: number, y: number, align: "left" | "right" | "center" = "left", maxWidth?: number) {
    this.pdf.text(maxWidth ? this.fit(value, maxWidth) : value, x, y, { align, baseline: "middle" })
  }

  // Corta com reticências o que não cabe na coluna.
  fit(value: string, maxWidth: number) {
    if (this.pdf.getTextWidth(value) <= maxWidth) return value
    let out = value
    while (out.length > 1 && this.pdf.getTextWidth(`${out}…`) > maxWidth) out = out.slice(0, -1)
    return `${out.trimEnd()}…`
  }

  ensure(height: number, onNewPage?: () => void) {
    if (this.y + height <= CONTENT_BOTTOM) return
    this.pdf.addPage()
    this.y = MARGIN_TOP
    onNewPage?.()
  }

  heading(title: string, color = INK) {
    this.ensure(40)
    this.y += 12
    this.font(10, "bold", color)
    this.text(title, MARGIN_X, this.y + 5)
    this.y += 14
  }
}

function header(w: Writer, kicker: string, title: string, storeName: string) {
  const { pdf } = w
  w.font(8, "normal", MUTED)
  pdf.text(kicker.toUpperCase(), MARGIN_X, w.y + 6, { charSpace: 0.9 })
  w.font(19.5, "bold")
  pdf.text(title, MARGIN_X, w.y + 27)
  w.font(11, "bold")
  pdf.text(storeName, PAGE_W - MARGIN_X, w.y + 8, { align: "right" })
  w.font(9, "normal", MUTED)
  pdf.text("Gestor de Loterias", PAGE_W - MARGIN_X, w.y + 20, { align: "right" })
  w.y += 38
  pdf.setDrawColor(INK)
  pdf.setLineWidth(1.5)
  pdf.line(MARGIN_X, w.y, PAGE_W - MARGIN_X, w.y)
  w.y += 14
}

function cards(w: Writer, list: Transaction[]) {
  const t = totals(list)
  const margem = t.receitas ? (t.saldo / t.receitas) * 100 : 0
  const items: [string, string, string][] = [
    ["Receitas", money(t.receitas), GREEN],
    ["Despesas", money(t.despesas), RED],
    ["Saldo", money(t.saldo), INK],
    ["Margem", percent(margem), INK],
  ]
  const gap = 7.5
  const cw = (W - 3 * gap) / 4
  items.forEach(([label, value, color], i) => {
    const x = MARGIN_X + i * (cw + gap)
    w.pdf.setDrawColor(LINE)
    w.pdf.setLineWidth(0.75)
    w.pdf.roundedRect(x, w.y, cw, 42, 6, 6, "S")
    w.font(8, "normal", MUTED)
    w.text(label, x + 9, w.y + 12)
    w.font(12.5, "bold", color)
    w.text(value, x + 9, w.y + 29, "left", cw - 18)
  })
  w.y += 54
}

const ROW = 18

// Tabela de categorias (nome, valor, %) numa coluna; devolve a altura usada.
function categoryColumn(w: Writer, list: Transaction[], type: "receita" | "despesa", x: number, width: number, top: number) {
  const rows = byCategory(list, type)
  const total = rows.reduce((a, r) => a + r.value, 0)
  const color = type === "receita" ? GREEN : RED
  let y = top
  w.font(10, "bold", color)
  w.text(type === "receita" ? "Receitas" : "Despesas", x, y + 6)
  y += 16
  const valueX = x + width * 0.74
  rows.forEach((r, i) => {
    if (i % 2) {
      w.pdf.setFillColor(ALT)
      w.pdf.rect(x, y, width, ROW, "F")
    }
    w.font(9)
    w.text(r.name, x + 6, y + ROW / 2, "left", width * 0.74 - 70)
    w.text(money(r.value), valueX, y + ROW / 2, "right")
    w.font(9, "normal", MUTED)
    w.text(percent(total ? (r.value / total) * 100 : 0), x + width - 6, y + ROW / 2, "right")
    y += ROW
  })
  w.pdf.setDrawColor(INK)
  w.pdf.setLineWidth(0.75)
  w.pdf.line(x, y, x + width, y)
  w.font(9, "bold")
  w.text("Total", x + 6, y + ROW / 2)
  w.font(9, "bold", color)
  w.text(money(total), valueX, y + ROW / 2, "right")
  return y + ROW - top
}

function monthReport(w: Writer, list: Transaction[], period: Extract<Period, { mode: "month" }>) {
  const items = list.filter((t) => inPeriod(t, period))
  cards(w, items)

  const colW = (W - 15) / 2
  const rowsNeeded = Math.max(byCategory(items, "receita").length, byCategory(items, "despesa").length) + 2
  w.ensure(rowsNeeded * ROW)
  const top = w.y
  const left = categoryColumn(w, items, "receita", MARGIN_X, colW, top)
  const right = categoryColumn(w, items, "despesa", MARGIN_X + colW + 15, colW, top)
  w.y = top + Math.max(left, right) + 4

  const despesas = byCategory(items, "despesa")
  const despTotal = despesas.reduce((a, r) => a + r.value, 0)
  const top1 = despesas.length ? despesas[0].value : 1
  w.heading("Para onde foi o dinheiro")
  const barX = MARGIN_X + 135
  const barW = W - 135 - 120
  for (const r of despesas) {
    w.ensure(17)
    const mid = w.y + 8.5
    w.font(9)
    w.text(r.name, MARGIN_X, mid, "left", 125)
    w.pdf.setFillColor("#f1f5f9")
    w.pdf.roundedRect(barX, mid - 3.4, barW, 6.8, 3.4, 3.4, "F")
    const fill = Math.max(barW * (r.value / top1), 2)
    // #e11d48 com 75% de opacidade sobre branco, como no relatório em HTML.
    w.pdf.setFillColor(233, 86, 118)
    w.pdf.roundedRect(barX, mid - 3.4, fill, 6.8, Math.min(3.4, fill / 2), 3.4, "F")
    w.text(`${money(r.value)} · ${percent(despTotal ? (r.value / despTotal) * 100 : 0)}`, PAGE_W - MARGIN_X, mid, "right")
    w.y += 17
  }

  const biggest = items
    .filter((t) => t.type === "despesa")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
  w.heading("5 maiores despesas")
  biggest.forEach((t, i) => {
    w.ensure(ROW)
    if (i % 2) {
      w.pdf.setFillColor(ALT)
      w.pdf.rect(MARGIN_X, w.y, W, ROW, "F")
    }
    const mid = w.y + ROW / 2
    w.font(9, "normal", MUTED)
    w.text(formatDatePtBR(t.date), MARGIN_X + 6, mid)
    w.font(9)
    w.text(t.category, MARGIN_X + 175, mid, "left", W - 175 - 110)
    w.text(money(t.amount), PAGE_W - MARGIN_X - 6, mid, "right")
    w.y += ROW
  })
}

function yearReport(w: Writer, list: Transaction[], year: number) {
  const items = list.filter((t) => inPeriod(t, { mode: "year", year }))
  cards(w, items)

  // Gráfico de colunas: receitas (verde) e despesas (rosa) por mês.
  const { receitas, despesas } = monthlyTotals(items, year)
  const max = Math.max(...receitas, ...despesas, 1)
  const chartH = 90
  const slot = W / 12
  const baseY = w.y + chartH
  MONTHS_SHORT.forEach((label, m) => {
    const cx = MARGIN_X + slot * m + slot / 2
    const bw = slot * 0.3
    const rh = (receitas[m] / max) * chartH
    const dh = (despesas[m] / max) * chartH
    w.pdf.setFillColor("#059669")
    if (rh > 0) w.pdf.rect(cx - bw - 1, baseY - rh, bw, rh, "F")
    w.pdf.setFillColor("#fda4af")
    if (dh > 0) w.pdf.rect(cx + 1, baseY - dh, bw, dh, "F")
    w.font(7.5, "normal", MUTED)
    w.text(label, cx, baseY + 9, "center")
  })
  w.pdf.setDrawColor("#94a3b8")
  w.pdf.setLineWidth(0.75)
  w.pdf.line(MARGIN_X, baseY, PAGE_W - MARGIN_X, baseY)
  w.y = baseY + 18

  // Tabela mês a mês, com o cabeçalho repetido quando muda de página.
  w.heading("Mês a mês por categoria")
  const nameW = 104
  const totalW = 42
  const colW = (W - nameW - totalW) / 12
  const rowH = 13
  // Borda direita da coluna i (0–11 = meses, 12 = total), onde o número alinha.
  const colX = (i: number) => (i === 12 ? PAGE_W - MARGIN_X - 4 : MARGIN_X + nameW + colW * (i + 1) - 3)
  const tableHeader = () => {
    w.pdf.setFillColor(INK)
    w.pdf.rect(MARGIN_X, w.y, W, rowH + 2, "F")
    w.font(7, "bold", "#ffffff")
    const mid = w.y + (rowH + 2) / 2
    w.text("Categoria", MARGIN_X + 4, mid)
    MONTHS_SHORT.forEach((m, i) => w.text(m, colX(i), mid, "right"))
    w.text("Total", colX(12), mid, "right")
    w.y += rowH + 2
  }
  const row = (name: string, values: number[], total: number, opts: { alt?: boolean; bold?: boolean; color?: string; fill?: string; line?: boolean } = {}) => {
    w.ensure(rowH, tableHeader)
    if (opts.fill || opts.alt) {
      w.pdf.setFillColor(opts.fill ?? ALT)
      w.pdf.rect(MARGIN_X, w.y, W, rowH, "F")
    }
    if (opts.line) {
      w.pdf.setDrawColor(INK)
      w.pdf.setLineWidth(0.75)
      w.pdf.line(MARGIN_X, w.y, PAGE_W - MARGIN_X, w.y)
    }
    const mid = w.y + rowH / 2
    w.font(7, opts.bold ? "bold" : "normal", opts.color ?? INK)
    w.text(name, MARGIN_X + 4, mid, "left", nameW - 8)
    values.forEach((v, i) => w.text(wholeNumber(v), colX(i), mid, "right"))
    w.font(7, "bold", opts.color ?? INK)
    w.text(wholeNumber(total), colX(12), mid, "right")
    w.y += rowH
  }
  const group = (label: string, color: string) => {
    w.ensure(rowH + 6, tableHeader)
    w.y += 4
    w.font(7, "bold", color)
    w.pdf.text(label.toUpperCase(), MARGIN_X + 4, w.y + rowH / 2, { baseline: "middle", charSpace: 0.5 })
    w.y += rowH
  }
  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

  w.ensure(rowH * 4)
  tableHeader()
  group("Receitas", GREEN)
  categoryByMonth(items, "receita", year).forEach((c, i) => row(c.name, c.months, c.total, { alt: i % 2 === 1 }))
  row("Total de receitas", receitas, sum(receitas), { bold: true, color: GREEN, line: true })
  group("Despesas", RED)
  categoryByMonth(items, "despesa", year).forEach((c, i) => row(c.name, c.months, c.total, { alt: i % 2 === 1 }))
  row("Total de despesas", despesas, sum(despesas), { bold: true, color: RED, line: true })
  const saldo = receitas.map((r, m) => r - despesas[m])
  row("Saldo", saldo, sum(saldo), { bold: true, fill: "#f1f5f9" })

  w.ensure(16)
  w.font(7.5, "normal", MUTED)
  w.text("Valores em reais, sem centavos.", MARGIN_X, w.y + 10)
}

export function reportPdfFileName(period: Period) {
  const label = period.mode === "month" ? `${MONTHS[period.month]}-${period.year}` : String(period.year)
  return `Relatorio-${label.normalize("NFD").replace(/[̀-ͯ]/g, "")}.pdf`
}

export async function buildReportPdf(list: Transaction[], period: Period, storeName: string): Promise<File> {
  const { jsPDF } = await import("jspdf")
  const pdf = new jsPDF({ unit: "pt", format: "a4" })
  const w = new Writer(pdf)

  const title = period.mode === "month" ? `${MONTHS[period.month]} de ${period.year}` : String(period.year)
  header(w, period.mode === "month" ? "Relatório mensal" : "Relatório anual", title, storeName)
  if (period.mode === "month") monthReport(w, list, period)
  else yearReport(w, list, period.year)

  // Rodapé em todas as páginas.
  const now = new Date()
  const generated = `Gerado em ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
  const pages = pdf.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p)
    pdf.setDrawColor(LINE)
    pdf.setLineWidth(0.75)
    pdf.line(MARGIN_X, FOOTER_Y - 10, PAGE_W - MARGIN_X, FOOTER_Y - 10)
    w.font(8, "normal", MUTED)
    w.text(generated, MARGIN_X, FOOTER_Y)
    w.text(pages > 1 ? `${periodLabel(period)} · página ${p} de ${pages}` : periodLabel(period), PAGE_W - MARGIN_X, FOOTER_Y, "right")
  }

  pdf.setProperties({ title: `Relatório ${title}`, creator: "Gestor de Loterias" })
  return new File([pdf.output("blob")], reportPdfFileName(period), { type: "application/pdf" })
}
