import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Printer } from "lucide-react"
import { toast } from "@/hooks/use-toast"

// Largura de uma folha A4 em px de CSS: o relatório é desenhado nesse tamanho
// e reduzido para caber na tela do celular.
const PAGE_WIDTH = 794

// Pré-visualização do relatório dentro do próprio app. Abrir numa janela nova
// (window.open) não funciona no PWA do celular: a janela abre sem barra, sem
// como voltar, e a impressão automática não dispara.
export function ReportPreview({ html, title, onClose }: { html: string; title: string; onClose: () => void }) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const [scale, setScale] = useState(1)
  const [height, setHeight] = useState(1123)

  useEffect(() => {
    const area = areaRef.current
    if (!area) return
    const update = () => setScale(Math.min(1, (area.clientWidth - 24) / PAGE_WIDTH))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(area)
    return () => observer.disconnect()
  }, [])

  // Entrada própria no histórico: o botão/gesto "voltar" do celular fecha a
  // pré-visualização em vez de sair da página.
  useEffect(() => {
    if (!history.state?.reportPreview) {
      history.pushState({ ...history.state, reportPreview: true }, "")
    }
    const onPop = () => onCloseRef.current()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") history.back()
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("popstate", onPop)
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener("popstate", onPop)
      window.removeEventListener("keydown", onKey)
    }
  }, [])

  const measure = () => {
    const doc = frameRef.current?.contentDocument
    if (doc) setHeight(doc.documentElement.scrollHeight)
  }

  const print = () => {
    const win = frameRef.current?.contentWindow
    try {
      win?.focus()
      win?.print()
    } catch {
      toast({ title: "Aviso", description: "Não foi possível abrir a impressão neste aparelho", variant: "destructive" })
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={`Relatório ${title}`} className="fixed inset-0 z-[60] flex flex-col bg-slate-200 text-[14px] text-slate-900">
      <div className="flex items-center justify-between gap-2 border-b border-slate-300 bg-white px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button type="button" onClick={() => history.back()} className="inline-flex h-10 items-center gap-1.5 rounded-[10px] px-2.5 font-medium hover:bg-slate-100">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <span className="hidden truncate font-semibold sm:block">{title}</span>
        <button type="button" onClick={print} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-blue-700 px-3.5 font-semibold text-white hover:bg-blue-800">
          <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
        </button>
      </div>
      <div ref={areaRef} className="flex-1 overflow-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto overflow-hidden bg-white shadow-md" style={{ width: PAGE_WIDTH * scale, height: height * scale }}>
          <iframe
            ref={frameRef}
            title={`Relatório ${title}`}
            srcDoc={html}
            onLoad={measure}
            scrolling="no"
            style={{ width: PAGE_WIDTH, height, border: 0, transform: `scale(${scale})`, transformOrigin: "top left" }}
          />
        </div>
      </div>
    </div>
  )
}
