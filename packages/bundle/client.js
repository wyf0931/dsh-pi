/**
 * Client half of the dsh-pi bundle: the Pi provider's configuration page on the
 * Plugins page. The Host declares model, effort, timeout, and disallowed tools
 * as volatile Config fields; the shared settings form persists an edit into the
 * profile patch and the provider reads the new value on the next delegation.
 *
 * @module dsh-pi/client
 */
window.__ModuleLoader__.load({
  id: 'dsh-pi',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'dshPi'

    const en = {
      summary: 'Model, thinking level, timeout, and excluded tools for Pi delegations.',
      title: 'Pi delegation',
      intro: 'These values apply to the next delegation. Pi still resolves its own authentication, extensions, and skills from its agent directory.',
      model: 'Model',
      modelPlaceholder: 'provider/model',
      modelHint: "For example deepseek/deepseek-flash. Leave empty to use Pi's own default model.",
      effort: 'Thinking level',
      effortDefault: 'Pi default',
      timeout: 'Turn timeout (ms)',
      timeoutPlaceholder: 'no timeout',
      timeoutHint: 'Empty cancels only when the parent turn is cancelled.',
      disallowedTools: 'Excluded tools',
      disallowedPlaceholder: 'tool_a, tool_b',
      disallowedHint: 'Comma-separated Pi tool names. Empty excludes none.',
      save: 'Save',
      saving: 'Saving…',
      saved: 'Saved',
      restore: 'Restore defaults',
      loading: 'Loading configuration…',
      unavailable: 'This configuration is not editable in this deployment.',
      readOnly: 'The profile is read-only for this configuration.',
      conflict: 'Another change landed first. The form was refreshed; review and save again.',
      invalidModel: 'Use provider/model, for example deepseek/deepseek-flash.',
      invalidTimeout: 'Enter a positive whole number of milliseconds.',
      saveFailed: 'The Host refused the change.',
    }

    const zh = {
      summary: 'Pi 委派的模型、思考级别、超时与被排除的工具。',
      title: 'Pi 委派',
      intro: '这些值对下一次委派生效。Pi 仍会从自己的 agent 目录解析认证、扩展和技能。',
      model: '模型',
      modelPlaceholder: 'provider/model',
      modelHint: '例如 deepseek/deepseek-flash。留空则使用 Pi 自己的默认模型。',
      effort: '思考级别',
      effortDefault: 'Pi 默认',
      timeout: '回合超时（毫秒）',
      timeoutPlaceholder: '不超时',
      timeoutHint: '留空表示只在父回合被取消时取消。',
      disallowedTools: '排除的工具',
      disallowedPlaceholder: 'tool_a, tool_b',
      disallowedHint: '用逗号分隔的 Pi 工具名。留空表示不排除。',
      save: '保存',
      saving: '保存中…',
      saved: '已保存',
      restore: '恢复默认',
      loading: '正在读取配置…',
      unavailable: '当前部署不允许编辑这项配置。',
      readOnly: '该配置在此 profile 中为只读。',
      conflict: '已有其他修改先落地。表单已刷新，请检查后重新保存。',
      invalidModel: '请使用 provider/model，例如 deepseek/deepseek-flash。',
      invalidTimeout: '请输入正整数的毫秒值。',
      saveFailed: 'Host 拒绝了这次修改。',
    }

    const LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']

    const css = `
.dsp-config { display: flex; flex-direction: column; gap: 18px; }
.dsp-config .dsp-intro { margin: 0; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary); }
.dsp-config .dsp-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.dsp-config .dsp-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.dsp-config .dsp-field > label { font-size: 13px; font-weight: 500; line-height: 20px; color: var(--dsw-alias-label-primary); }
.dsp-config .dsp-input {
  box-sizing: border-box; width: 100%; height: 36px; padding: 0 10px;
  font: inherit; font-size: 13px; color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-3);
  border: 0.5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-md); outline: none;
}
.dsp-config .dsp-input:focus {
  border-color: var(--dsw-alias-state-business-primary);
  box-shadow: inset 0 0 0 0.5px var(--dsw-alias-state-business-primary);
}
.dsp-config .dsp-input[aria-invalid='true'] {
  border-color: var(--dsw-alias-state-error-primary);
  box-shadow: none;
}
.dsp-config .dsp-hint { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dsp-config .dsp-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.dsp-config .dsp-button {
  height: 32px; padding: 0 14px; font: inherit; font-size: 13px; line-height: 20px;
  border-radius: var(--dsw-radius-md); cursor: pointer;
}
.dsp-config .dsp-button:disabled { opacity: 0.55; cursor: default; }
.dsp-config .dsp-primary { border: 0; background: var(--dsw-alias-state-business-primary); color: var(--dsw-alias-label-primary-foreground); }
.dsp-config .dsp-ghost { border: 0.5px solid var(--dsw-alias-border-l4); background: transparent; color: var(--dsw-alias-label-secondary); }
.dsp-config .dsp-status { font-size: 12.5px; line-height: 20px; color: var(--dsw-alias-label-secondary); }
.dsp-config .dsp-error { margin: 0; font-size: 12.5px; line-height: 20px; color: var(--dsw-alias-state-error-primary); }
@media (max-width: 560px) { .dsp-config .dsp-grid { grid-template-columns: 1fr; } }
`

    /** Read the form's effective values into editable text fields. */
    function readDraft(value) {
      const source = value !== null && typeof value === 'object' ? value : {}
      return {
        model: typeof source.model === 'string' ? source.model : '',
        effort: typeof source.effort === 'string' ? source.effort : '',
        timeoutMs: typeof source.timeoutMs === 'number' ? String(source.timeoutMs) : '',
        disallowedTools: Array.isArray(source.disallowedTools) ? source.disallowedTools.join(', ') : '',
      }
    }

    /** Parse the comma-separated excluded-tool field. */
    function readTools(text) {
      return text.split(',').map(item => item.trim()).filter(item => item.length > 0)
    }

    /** Build the atomic operation list that turns the current values into the draft. */
    function buildOperations(draft, value) {
      const current = value !== null && typeof value === 'object' ? value : {}
      const operations = []
      const model = draft.model.trim()
      if (model !== (typeof current.model === 'string' ? current.model : '')) {
        operations.push(model === '' ? { op: 'unset', path: ['model'] } : { op: 'set', path: ['model'], value: model })
      }
      if (draft.effort !== (typeof current.effort === 'string' ? current.effort : '')) {
        operations.push(draft.effort === ''
          ? { op: 'unset', path: ['effort'] }
          : { op: 'set', path: ['effort'], value: draft.effort })
      }
      const timeoutText = draft.timeoutMs.trim()
      const timeoutMs = timeoutText === '' ? undefined : Number(timeoutText)
      if (timeoutMs !== current.timeoutMs) {
        operations.push(timeoutMs === undefined
          ? { op: 'unset', path: ['timeoutMs'] }
          : { op: 'set', path: ['timeoutMs'], value: timeoutMs })
      }
      const tools = readTools(draft.disallowedTools)
      const currentTools = Array.isArray(current.disallowedTools) ? current.disallowedTools : []
      if (tools.join('\u0000') !== currentTools.join('\u0000')) {
        operations.push(tools.length === 0
          ? { op: 'unset', path: ['disallowedTools'] }
          : { op: 'set', path: ['disallowedTools'], value: tools })
      }
      return operations
    }

    /** One labelled field with an optional hint. */
    function Field(props) {
      return h('div', { className: 'dsp-field' },
        h('label', { htmlFor: props.htmlFor }, props.label),
        props.children,
        props.hint === undefined ? null : h('p', { className: 'dsp-hint' }, props.hint))
    }

    /** The editable provider settings. Mounted only for a ready form. */
    function PiConfigForm(props) {
      const { t, form } = props
      const state = form.state
      const current = readDraft(state.value)
      const [draft, setDraft] = React.useState(() => current)
      const [saving, setSaving] = React.useState(false)
      const [notice, setNotice] = React.useState('')
      const [failure, setFailure] = React.useState('')
      const justSaved = React.useRef(false)
      const prefix = React.useId()

      React.useEffect(() => {
        setDraft(readDraft(form.state.value))
        if (justSaved.current) {
          setNotice(t('saved'))
          justSaved.current = false
        } else {
          setNotice('')
          setFailure('')
        }
        // The revision is the form's identity; the bound translator is stable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [state.revision])

      const update = key => (event) => {
        const next = event.target.value
        setDraft(previous => ({ ...previous, [key]: next }))
        setNotice('')
        setFailure('')
      }

      async function commit(operations) {
        if (operations.length === 0) {
          setNotice(t('saved'))
          return
        }
        setSaving(true)
        setFailure('')
        setNotice('')
        try {
          const accepted = await form.mutate(operations, state.revision)
          if (accepted === false) setFailure(t('conflict'))
          else {
            justSaved.current = true
            setNotice(t('saved'))
          }
        } catch (error) {
          setFailure(error !== null && typeof error === 'object' && 'message' in error
            ? String(error.message)
            : t('saveFailed'))
        } finally {
          setSaving(false)
        }
      }

      function save() {
        if (saving) return
        const model = draft.model.trim()
        if (model !== '' && !/^[^/\s]+\/[^/\s]+$/.test(model)) {
          setFailure(t('invalidModel'))
          return
        }
        const timeoutText = draft.timeoutMs.trim()
        if (timeoutText !== '') {
          const timeoutMs = Number(timeoutText)
          if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2147483647) {
            setFailure(t('invalidTimeout'))
            return
          }
        }
        void commit(buildOperations(draft, state.value))
      }

      function restore() {
        if (saving) return
        const operations = []
        for (const [path, present] of [
          ['model', current.model !== ''],
          ['effort', current.effort !== ''],
          ['timeoutMs', current.timeoutMs !== ''],
          ['disallowedTools', current.disallowedTools !== ''],
        ]) {
          if (present) operations.push({ op: 'unset', path: [path] })
        }
        void commit(operations)
      }

      const disabled = saving || state.writable === false

      return h('div', { className: 'dsp-config' },
        h('style', null, css),
        h('p', { className: 'dsp-intro' }, t('intro')),
        h('div', { className: 'dsp-grid' },
          h(Field, {
            label: t('model'),
            htmlFor: `${prefix}-model`,
            hint: t('modelHint'),
          }, h('input', {
            id: `${prefix}-model`,
            className: 'dsp-input',
            type: 'text',
            spellCheck: false,
            autoComplete: 'off',
            placeholder: t('modelPlaceholder'),
            value: draft.model,
            onChange: update('model'),
          })),
          h(Field, {
            label: t('effort'),
            htmlFor: `${prefix}-effort`,
          }, h('select', {
            id: `${prefix}-effort`,
            className: 'dsp-input',
            value: draft.effort,
            onChange: update('effort'),
          }, [
            h('option', { key: 'default', value: '' }, t('effortDefault')),
            ...LEVELS.map(level => h('option', { key: level, value: level }, level)),
          ]))),
        h('div', { className: 'dsp-grid' },
          h(Field, {
            label: t('timeout'),
            htmlFor: `${prefix}-timeout`,
            hint: t('timeoutHint'),
          }, h('input', {
            id: `${prefix}-timeout`,
            className: 'dsp-input',
            type: 'number',
            min: 1,
            step: 1,
            placeholder: t('timeoutPlaceholder'),
            value: draft.timeoutMs,
            onChange: update('timeoutMs'),
          })),
          h(Field, {
            label: t('disallowedTools'),
            htmlFor: `${prefix}-tools`,
            hint: t('disallowedHint'),
          }, h('input', {
            id: `${prefix}-tools`,
            className: 'dsp-input',
            type: 'text',
            spellCheck: false,
            autoComplete: 'off',
            placeholder: t('disallowedPlaceholder'),
            value: draft.disallowedTools,
            onChange: update('disallowedTools'),
          }))),
        failure === '' ? null : h('p', { className: 'dsp-error', role: 'alert' }, failure),
        h('div', { className: 'dsp-actions' },
          h('button', {
            type: 'button',
            className: 'dsp-button dsp-primary',
            disabled,
            onClick: save,
          }, saving ? t('saving') : t('save')),
          h('button', {
            type: 'button',
            className: 'dsp-button dsp-ghost',
            disabled,
            onClick: restore,
          }, t('restore')),
          notice === '' ? null : h('span', { className: 'dsp-status', role: 'status' }, notice)),
        state.writable === false ? h('p', { className: 'dsp-hint' }, t('readOnly')) : null)
    }

    const NOOP_UNSUBSCRIBE = () => {}
    const noopSubscribe = () => NOOP_UNSUBSCRIBE

    /** Find the settings namespace the Host serves for one profile row. */
    function pickNamespace(view, rowId) {
      const names = (view?.namespaces ?? []).map(item => item.ns)
      return names.includes(rowId)
        ? rowId
        : names.find(name => name.endsWith(`:${rowId}`)) ?? names.find(name => name.endsWith(`#${rowId}`))
    }

    /** The row's configuration page and its summary face. */
    function PiConfigPage(props) {
      const { t, view, configForms } = props
      const settings = React.useSyncExternalStore(
        React.useCallback(listener => configForms.describe().subscribe(listener), [configForms]),
        React.useCallback(() => configForms.describe().getSnapshot(), [configForms]),
      )
      const namespace = pickNamespace(settings.view, 'subagent-pi')
      const controller = React.useMemo(
        () => namespace === undefined ? undefined : configForms.get(namespace),
        [namespace, configForms],
      )
      const state = React.useSyncExternalStore(
        React.useCallback(listener => controller === undefined ? noopSubscribe() : controller.subscribe(listener), [controller]),
        React.useCallback(() => controller === undefined ? undefined : controller.getSnapshot(), [controller]),
      )
      const form = React.useMemo(
        () => controller === undefined || state === undefined
          ? undefined
          : { state, mutate: (operations, revision) => controller.mutate(operations, revision) },
        [controller, state],
      )
      if (view === 'summary') return h('span', null, t('summary'))
      if (form === undefined || form.state.status === 'loading') {
        return h('p', { className: 'dsp-hint' }, t('loading'))
      }
      if (form.state.status === 'unavailable') {
        return h('p', { className: 'dsp-hint' }, t('unavailable'))
      }
      return h(PiConfigForm, { t, form })
    }

    return {
      inject: ['slots', 'locale', 'configForms'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'dsh-pi: dictionaries')
        ctx.slots.inject('plugins.row.config', () => ctx.slots.register({
          name: 'plugins.row.config',
          key: 'dsh-pi#subagent-pi',
          locale: NS,
          inject: () => ({ configForms: ctx.configForms }),
        }, PiConfigPage))
      },
    }
  },
})
