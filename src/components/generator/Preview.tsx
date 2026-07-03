import { useAtom } from 'jotai'
import { useState, useCallback, useEffect } from 'react'
import { pdfjs, Document, Page } from 'react-pdf'
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api'
import styled from 'styled-components'
import {
  MdPictureAsPdf,
  MdCode,
  MdDataObject,
  MdGridView
} from 'react-icons/md'
import {
  resumeAtom,
  selectedTemplateAtom,
  TemplatePreview
} from '../../atoms/resume'
import { MiniButton } from '../core/Button'
import getTemplateData from '../../lib/templates'
import { FormValues } from '../../types'
import * as colors from '../../theme/colors'

const workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

const Output = styled.output`
  grid-area: preview;
  background: ${colors.background};
  overflow-y: auto;
`

const Toolbar = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px;
  flex-wrap: wrap;
`

const ExportButton = styled(MiniButton)`
  display: flex;
  align-items: center;
  gap: 6px;

  svg {
    font-size: 1.15em;
  }
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
  padding: 1.5em 0;

  &:last-of-type {
    padding-bottom: 10rem;
  }

  canvas {
    max-width: 95% !important;
    height: auto !important;
  }
`

const Gallery = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  padding: 16px;
`

const Card = styled.button<{ selected: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px;
  cursor: pointer;
  background: ${(props) => (props.selected ? colors.gray : 'transparent')};
  border: 2px solid
    ${(props) => (props.selected ? colors.green : colors.borders)};
  border-radius: 8px;
  color: ${colors.foreground};
  transition: border-color 0.15s ease;

  &:hover {
    border-color: ${colors.green};
  }
`

const CardLabel = styled.span<{ selected: boolean }>`
  font-size: 0.9rem;
  font-weight: ${(props) => (props.selected ? 700 : 400)};
`

const Thumb = styled.div`
  width: 100%;
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 4px;
  overflow: hidden;

  canvas {
    max-width: 100% !important;
    height: auto !important;
  }
`

const Placeholder = styled.span`
  color: #666;
  font-size: 0.85rem;
  padding: 24px;
  text-align: center;
`

const THUMB_WIDTH = 200

function PreviewCard({
  preview,
  selected,
  onSelect
}: {
  preview: TemplatePreview
  selected: boolean
  onSelect: (preview: TemplatePreview) => void
}) {
  return (
    <Card
      type="button"
      selected={selected}
      onClick={() => onSelect(preview)}
    >
      <Thumb>
        {preview.status === 'loading' && (
          <Placeholder>Rendering…</Placeholder>
        )}
        {preview.status === 'error' && (
          <Placeholder>Preview unavailable</Placeholder>
        )}
        {preview.status === 'done' && preview.url && (
          <Document file={preview.url} loading="">
            <Page
              pageNumber={1}
              width={THUMB_WIDTH}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              loading=""
            />
          </Document>
        )}
      </Thumb>
      <CardLabel selected={selected}>Template {preview.template}</CardLabel>
    </Card>
  )
}

export function Preview() {
  const [resume, setResume] = useAtom(resumeAtom)
  const [selectedTemplate, setSelectedTemplate] = useAtom(selectedTemplateAtom)
  const [pageCount, setPageCount] = useState(1)
  const [scale] = useState(document.body.clientWidth > 1440 ? 1.75 : 1)
  // 'gallery' shows every template; 'single' shows the selected one full-size.
  const [view, setView] = useState<'gallery' | 'single'>('gallery')

  const previews = resume.previews
  const selectedPreview = previews.find((p) => p.template === selectedTemplate)

  // A fresh MAKE resets all cards to loading — snap back to the gallery so the
  // user sees the comparison view again.
  useEffect(() => {
    if (previews.length > 0 && previews.every((p) => p.status === 'loading')) {
      setView('gallery')
    }
  }, [previews])

  // The preview (and "export as pdf") always follows the selected template,
  // using its already-rendered PDF so switching is instant.
  useEffect(() => {
    if (selectedPreview?.status === 'done' && selectedPreview.url) {
      setPageCount(1)
      setResume((prev) =>
        prev.url === selectedPreview.url
          ? prev
          : { ...prev, url: selectedPreview.url }
      )
    }
  }, [selectedPreview?.url, selectedPreview?.status, setResume])

  const handleDocumentLoadSuccess = useCallback((pdf: PDFDocumentProxy) => {
    setPageCount(pdf.numPages)
  }, [])

  const handleSelect = useCallback(
    (preview: TemplatePreview) => {
      setSelectedTemplate(preview.template)
      if (preview.url) {
        setView('single')
      }
    },
    [setSelectedTemplate]
  )

  const exportPdf = useCallback(() => {
    if (resume.url) {
      window.open(resume.url)
    }
  }, [resume.url])

  const exportTex = useCallback(() => {
    const formValues = getFormValues()
    if (!formValues) return
    const { texDoc } = getTemplateData({
      ...formValues,
      selectedTemplate
    })
    downloadFile('resume.tex', texDoc, 'application/x-tex')
  }, [selectedTemplate])

  const exportJson = useCallback(() => {
    const formValues = getFormValues()
    if (!formValues) return
    downloadFile(
      'resume.json',
      JSON.stringify({ ...formValues, selectedTemplate }, null, 2),
      'application/json'
    )
  }, [selectedTemplate])

  const hasGallery = previews.length > 0
  const showGallery = hasGallery && view === 'gallery'
  const documentUrl =
    (selectedPreview?.status === 'done' && selectedPreview.url) ||
    resume.url ||
    '/blank.pdf'

  return (
    <Output>
      <Toolbar>
        {hasGallery && view === 'single' && (
          <ExportButton onClick={() => setView('gallery')}>
            <MdGridView /> all templates
          </ExportButton>
        )}
        <ExportButton onClick={exportPdf} disabled={!resume.url}>
          <MdPictureAsPdf /> export as pdf
        </ExportButton>
        <ExportButton onClick={exportTex}>
          <MdCode /> export as tex
        </ExportButton>
        <ExportButton onClick={exportJson}>
          <MdDataObject /> export as json
        </ExportButton>
      </Toolbar>
      {showGallery ? (
        <Gallery>
          {previews.map((preview) => (
            <PreviewCard
              key={preview.template}
              preview={preview}
              selected={preview.template === selectedTemplate}
              onSelect={handleSelect}
            />
          ))}
        </Gallery>
      ) : (
        <PdfContainer>
          <ResumeDocument
            file={documentUrl}
            onLoadSuccess={handleDocumentLoadSuccess}
            loading=""
          >
            {Array.from({ length: pageCount }, (_, index) => (
              <ResumePage
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                scale={scale}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                loading=""
              />
            ))}
          </ResumeDocument>
        </PdfContainer>
      )}
    </Output>
  )
}
