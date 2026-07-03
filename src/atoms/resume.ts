import { atom } from 'jotai'

export type PreviewStatus = 'loading' | 'done' | 'error'

export interface TemplatePreview {
  template: number
  url: string
  status: PreviewStatus
}

export interface Resume {
  // URL of the currently selected template's PDF (used by "export as pdf").
  url: string
  isLoading: boolean
  isError: boolean
  // One entry per template, rendered on MAKE so the user can compare how their
  // resume looks in every template at once.
  previews: TemplatePreview[]
}

export const resumeAtom = atom<Resume>({
  url: '',
  isLoading: false,
  isError: false,
  previews: []
})

resumeAtom.debugLabel = 'resumeAtom'

// Single source of truth for the chosen template, shared between the form's
// template picker (radios) and the gallery in the preview pane (click a card).
export const selectedTemplateAtom = atom<number>(1)
selectedTemplateAtom.debugLabel = 'selectedTemplateAtom'
