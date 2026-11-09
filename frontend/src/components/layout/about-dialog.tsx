import { Clover, Heart } from "lucide-react"

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

const REPO_URL = "https://github.com/guslma/gestor-de-loterias"
const AUTHOR_URL = "https://github.com/guslma"

// A lucide não tem mais ícones de marcas; este é o símbolo do GitHub.
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

export function AboutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100%-2rem)] gap-0 rounded-2xl border-slate-200 bg-white p-6 sm:max-w-[440px] [&>button:last-child]:right-5 [&>button:last-child]:top-9"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-3 pr-8">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-blue-500 to-green-500">
            <Clover className="h-5 w-5 text-white" />
          </div>
          <DialogTitle className="text-[19px] font-bold leading-tight text-slate-900">Sobre o Gestor de Loterias</DialogTitle>
          <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
            v{__APP_VERSION__}
          </span>
        </div>

        <DialogDescription className="mt-4 text-[15px] leading-relaxed text-slate-600">
          O Gestor de Loterias organiza as receitas e despesas da sua lotérica, com relatórios, importação de
          planilhas e leitura de comprovantes por foto.
        </DialogDescription>

        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex w-fit items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 py-3 pl-3 pr-16 font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
            <GitHubIcon className="h-[18px] w-[18px] text-slate-800" />
          </span>
          GitHub
        </a>

        <div className="mt-5 border-t border-slate-200 pt-4 text-center text-sm text-slate-500">
          Feito com <Heart className="mx-0.5 inline h-4 w-4 -translate-y-px fill-rose-500 text-rose-500" aria-label="amor" /> by{" "}
          <a
            href={AUTHOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-green-600 hover:underline"
          >
            guslma
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
