import { useCallback, useEffect } from 'react'
import { useRouter } from 'next/router'
import { FormProvider, useForm } from 'react-hook-form'
import { useAtom } from 'jotai'
import styled from 'styled-components'

import { TemplatesSection } from './sections/TemplatesSection'
import { ProfileSection } from './sections/ProfileSection'
import { EducationSection } from './sections/EducationSection'
import { WorkSection } from './sections/WorkSection'
import { SkillsSection } from './sections/SkillsSection'
import { AwardSection } from './sections/AwardsSection'
import { ProjectsSection } from './sections/projectsSection'
import { resumeAtom, selectedTemplateAtom } from '../../../atoms/resume'
import { FormValues } from '../../../types'
import { TEMPLATES } from '../../../lib/templates/constants'

import latex from '../../../lib/latex'
import getTemplateData from '../../../lib/templates'

async function generateResume(formData: FormValues): Promise<string> {
  const { texDoc, opts } = getTemplateData(formData)
  return latex(texDoc, opts)
}

// Cache rendered PDFs (blob URLs) so re-running MAKE with unchanged content is
// instant. Keyed by template id + a hash of the content (everything except the
// selected template, which only affects which card is highlighted).
const previewCache = new Map<string, string>()

function contentKey(formData: FormValues): string {
  return JSON.stringify({ ...formData, selectedTemplate: 0 })
}

const StyledForm = styled.form`
  grid-area: form;
  overflow: auto;
`

const initialFormValues: FormValues = {
  headings: {},
  sections: ['profile', 'education', 'work', 'skills', 'projects', 'awards'],
  selectedTemplate: 1
}

export function Form() {
  const router = useRouter()
  const { section: currSection = 'basics' } = router.query

  const [, setResume] = useAtom(resumeAtom)
  const [selectedTemplate, setSelectedTemplate] = useAtom(selectedTemplateAtom)
  const formContext = useForm<FormValues>({ defaultValues: initialFormValues })

  // TODO: move this to a custom react hook
  useEffect(() => {
    const lastSession = localStorage.getItem('jsonResume')
    if (lastSession) {
      // TODO: validate JSON schema using Zod
      const jsonResume = JSON.parse(lastSession) as FormValues
      formContext.reset(jsonResume)
      if (jsonResume.selectedTemplate) {
        setSelectedTemplate(jsonResume.selectedTemplate)
      }
    }
    const subscription = formContext.watch((data) => {
      localStorage.setItem('jsonResume', JSON.stringify(data))
    })
    return () => subscription.unsubscribe()
  }, [formContext, setSelectedTemplate])

  // Keep the form's selectedTemplate (persisted to localStorage) in sync with
  // the shared atom, which the picker radios and the gallery cards both write.
  useEffect(() => {
    formContext.setValue('selectedTemplate', selectedTemplate)
  }, [formContext, selectedTemplate])

  const handleFormSubmit = useCallback(async () => {
    const baseValues = { ...formContext.getValues(), selectedTemplate }

    setResume((prev) => ({
      ...prev,
      isLoading: true,
      isError: false,
      previews: TEMPLATES.map((template) => ({
        template,
        url: previewCache.get(`${template}:${contentKey(baseValues)}`) || '',
        status: previewCache.has(`${template}:${contentKey(baseValues)}`)
          ? ('done' as const)
          : ('loading' as const)
      }))
    }))

    // Render each template in turn (the LaTeX engine is serialized), filling in
    // each card as soon as it finishes so the user sees progress.
    for (const template of TEMPLATES) {
      const cacheKey = `${template}:${contentKey(baseValues)}`
      let url = previewCache.get(cacheKey) || ''
      if (!url) {
        try {
          url = await generateResume({ ...baseValues, selectedTemplate: template })
          previewCache.set(cacheKey, url)
        } catch (error) {
          console.error(`Template ${template} failed to render`, error)
          setResume((prev) => ({
            ...prev,
            previews: prev.previews.map((p) =>
              p.template === template ? { ...p, status: 'error' as const } : p
            )
          }))
          continue
        }
      }
      setResume((prev) => ({
        ...prev,
        previews: prev.previews.map((p) =>
          p.template === template
            ? { ...p, url, status: 'done' as const }
            : p
        )
      }))
    }

    setResume((prev) => {
      const selected = prev.previews.find((p) => p.template === selectedTemplate)
      return { ...prev, url: selected?.url || '', isLoading: false }
    })
  }, [formContext, selectedTemplate, setResume])

  return (
    <FormProvider {...formContext}>
      <StyledForm
        id="resume-form"
        onSubmit={formContext.handleSubmit(handleFormSubmit)}
      >
        {currSection === 'templates' && <TemplatesSection />}
        {currSection === 'basics' && <ProfileSection />}
        {currSection === 'education' && <EducationSection />}
        {currSection === 'work' && <WorkSection />}
        {currSection === 'skills' && <SkillsSection />}
        {currSection === 'awards' && <AwardSection />}
        {currSection === 'projects' && <ProjectsSection />}
      </StyledForm>
    </FormProvider>
  )
}
