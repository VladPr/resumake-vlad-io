import { useAtom } from 'jotai'
import { useState, useCallback } from 'react'
import { pdfjs, Document, Page } from 'react-pdf'
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api'
import styled from 'styled-components'
import { resumeAtom } from '../../atoms/resume'
import { MiniButton } from '../core/Button'
import getTemplateData from '../../lib/templates'
import { FormValues } from '../../types'

const workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

const Output = styled.output`
  grid-area: preview;
  background: ${(props) => props.theme.lightBlack};
  overflow-y: auto;
`

const Toolbar = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px;
  flex-wrap: wrap;
`

function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function getFormValues(): FormValues | null {
  const stored = localStorage.getItem('jsonResume')
  return stored ? (JSON.parse(stored) as FormValues) : null
}

const PdfContainer = styled.article`
  width: 100%;
  height: 100%;
`

const ResumeDocument = styled(Document)`
  width: 100%;
`

const ResumePage = styled(Page)`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.5em 0 10rem 0;

  canvas {
    max-width: 95% !important;
    height: auto !important;
  }
`

export function Preview() {
  const [resume] = useAtom(resumeAtom)
  const [, setPageCount] = useState(1)
  const [pageNumber] = useState(1)
  const [scale] = useState(document.body.clientWidth > 1440 ? 1.75 : 1)

  const handleDocumentLoadSuccess = useCallback((pdf: PDFDocumentProxy) => {
    setPageCount(pdf.numPages)
  }, [])

  const exportPdf = useCallback(() => {
    if (resume.url) {
      window.open(resume.url)
    }
  }, [resume.url])

  const exportTex = useCallback(() => {
    const formValues = getFormValues()
    if (!formValues) return
    const { texDoc } = getTemplateData(formValues)
    downloadFile('resume.tex', texDoc, 'application/x-tex')
  }, [])

  const exportJson = useCallback(() => {
    const formValues = getFormValues()
    if (!formValues) return
    downloadFile(
      'resume.json',
      JSON.stringify(formValues, null, 2),
      'application/json'
    )
  }, [])

  return (
    <Output>
      <Toolbar>
        <MiniButton onClick={exportPdf} disabled={!resume.url}>
          export as pdf
        </MiniButton>
        <MiniButton onClick={exportTex}>export as tex</MiniButton>
        <MiniButton onClick={exportJson}>export as json</MiniButton>
      </Toolbar>
      <PdfContainer>
        <ResumeDocument
          file={resume.url || '/blank.pdf'}
          onLoadSuccess={handleDocumentLoadSuccess}
          loading=""
        >
          <ResumePage
            pageNumber={pageNumber}
            scale={scale}
            renderAnnotationLayer={false}
            renderTextLayer={false}
            loading=""
          />
        </ResumeDocument>
      </PdfContainer>
    </Output>
  )
}
