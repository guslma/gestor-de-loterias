import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Loader2, Printer } from "lucide-react"
import { toast } from "@/hooks/use-toast"

// No iPhone/iPad o PWA não imprime: lá o botão gera o PDF e abre a tela de
// compartilhar do iOS. No computador e no Android a impressão funciona.
const IS_IOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

// Largura de uma folha A4 em px de CSS: o relatório é desenhado nesse tamanho
// e reduzido para caber na tela do celular.
const PAGE_WIDTH = 794

// Pré-visualização do relatório dentro do próprio app. Abrir numa janela nova
// (window.open) não funciona no PWA do celular: a janela abre sem barra, sem
// como voltar, e a impressão automática não dispara.
export function ReportPreview({
  html,
  title,
  makePdf,
  onClose,
}: {
  html: string
  title: string
  makePdf: () => Promise<File>
  onClose: () => void
}) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const makePdfRef = useRef(makePdf)
  const [scale, setScale] = useState(1)
  const [height, setHeight] = useState(1123)
  const [pdf, setPdf] = useState<File | null>(null)
  const [pdfFailed, setPdfFailed] = useState(false)

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

  // No iOS o PDF é gerado já na abertura: a tela de compartilhar só abre se
  // for chamada logo depois do toque, sem esperar a geração.
  useEffect(() => {
    if (!IS_IOS) return
    makePdfRef
      .current()
      .then(setPdf)
      .catch(() => setPdfFailed(true))
  }, [])

  const onFrameLoad = () => {
    const doc = frameRef.current?.contentDocument
    if (doc) setHeight(doc.documentElement.scrollHeight)
  }

  const fail = () =>
    toast({ title: "Aviso", description: "Não foi possível abrir a impressão neste aparelho", variant: "destructive" })

  const printOrShare = async () => {
    if (!IS_IOS) {
      try {
        frameRef.current?.contentWindow?.focus()
        frameRef.current?.contentWindow?.print()
      } catch {
        fail()
      }
      return
    }
    if (!pdf || !navigator.canShare?.({ files: [pdf] })) return fail()
    try {
      await navigator.share({ files: [pdf], title: `Relatório ${title}` })
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") fail()
    }
  }

  const preparing = IS_IOS && !pdf && !pdfFailed

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Relatório ${title}`}
      className="fixed inset-0 z-[60] flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-green-50 text-[14px] text-slate-900"
    >
      <div className="header-glass pt-[env(safe-area-inset-top)] shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 md:px-5">
          <button
            type="button"
            onClick={() => history.back()}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-slate-300 bg-white px-3.5 font-medium hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <span className="hidden truncate text-[17px] font-bold sm:block">Relatório {title}</span>
          <button
            type="button"
            onClick={printOrShare}
            disabled={preparing || pdfFailed}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-blue-700 px-3.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {preparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            {preparing ? "Preparando PDF…" : pdfFailed ? "PDF indisponível" : IS_IOS ? "Imprimir / Compartilhar" : "Imprimir / Salvar PDF"}
          </button>
        </div>
      </div>
      <div ref={areaRef} className="flex-1 overflow-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div
          className="mx-auto overflow-hidden rounded-[6px] bg-white shadow-[0_6px_24px_rgba(15,23,42,0.12)]"
          style={{ width: PAGE_WIDTH * scale, height: height * scale }}
        >
          <iframe
            ref={frameRef}
            title={`Relatório ${title}`}
            srcDoc={html}
            onLoad={onFrameLoad}
            scrolling="no"
            style={{ width: PAGE_WIDTH, height, border: 0, transform: `scale(${scale})`, transformOrigin: "top left" }}
          />
        </div>
      </div>
    </div>
  )
}
