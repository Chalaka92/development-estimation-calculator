import { useProjectStore } from '../../app/useProjectStore'
import { Panel, PanelHeader, StepBadge } from '../../components/ui'
import { NumberField } from './NumberField'
import { RiskBufferField } from './RiskBufferField'
import { SectionResetButton } from './SectionResetButton'

export function ProjectSettingsPanel() {
  const projectName = useProjectStore((state) => state.project.name)
  const schedule = useProjectStore((state) => state.project.schedule)
  const actions = useProjectStore((state) => state.actions)

  return (
    <Panel className="calculator-settings" aria-labelledby="settings-title">
      <PanelHeader
        eyebrow="Estimate setup"
        title="Project settings"
        titleId="settings-title"
        actions={
          <div className="ui-panel-header__actions">
            <SectionResetButton
              sectionName="project settings"
              confirmation="Reset the project name and delivery settings to their defaults? Development and QA work will be kept."
              onReset={() => actions.resetProjectSettings()}
            />
            <StepBadge>01</StepBadge>
          </div>
        }
      />

      <div className="calculator-field calculator-field--wide">
        <label htmlFor="project-name">Project or release name</label>
        <input
          id="project-name"
          aria-describedby="project-name-hint"
          type="text"
          value={projectName}
          onChange={(event) => actions.renameProject(event.target.value)}
          placeholder="Untitled Estimate"
        />
        <small id="project-name-hint">
          Used as the heading in summaries and future exports.
        </small>
      </div>

      <div className="calculator-field-grid">
        <RiskBufferField
          value={schedule.riskBufferPercentage}
          onCommit={(riskBufferPercentage) =>
            actions.updateSchedule({ riskBufferPercentage })
          }
        />
        <NumberField
          id="hours-per-day"
          label="Hours per person-day"
          value={schedule.workingHoursPerPersonDay}
          min={0.25}
          max={24}
          step={0.25}
          suffix="h"
          hint="Productive hours for one person."
          onCommit={(workingHoursPerPersonDay) =>
            actions.updateSchedule({ workingHoursPerPersonDay })
          }
        />
        <NumberField
          id="total-manpower"
          label="Total manpower"
          value={schedule.totalManpower}
          min={0.1}
          step={0.1}
          suffix="FTE"
          hint="Decimals such as 1.5 are supported."
          onCommit={(totalManpower) =>
            actions.updateSchedule({ totalManpower })
          }
        />
        <NumberField
          id="business-days"
          label="Business days per week"
          value={schedule.businessDaysPerWeek}
          min={1}
          max={7}
          suffix="days"
          hint="Used to calculate delivery weeks."
          onCommit={(businessDaysPerWeek) =>
            actions.updateSchedule({ businessDaysPerWeek })
          }
        />
      </div>
    </Panel>
  )
}
