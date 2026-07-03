import { useAtom } from 'jotai'

import { FormSection } from './FormSection'
import { TEMPLATES } from '../../../../lib/templates/constants'
import { selectedTemplateAtom } from '../../../../atoms/resume'

export function TemplatesSection() {
  const [selectedTemplate, setSelectedTemplate] = useAtom(selectedTemplateAtom)

  return (
    <FormSection title="Choose a Template">
      <p style={{ opacity: 0.7, marginBottom: 12 }}>
        Pick one here, or tap <strong>MAKE</strong> to preview your resume in
        every template and choose from the gallery.
      </p>
      {TEMPLATES.map((templateId) => (
        <label key={templateId} style={{ display: 'inline-block', padding: 8 }}>
          Template {templateId}
          <input
            type="radio"
            name="selectedTemplate"
            value={templateId}
            checked={selectedTemplate === templateId}
            onChange={(e) => setSelectedTemplate(Number(e.target.value))}
          />
        </label>
      ))}
    </FormSection>
  )
}
