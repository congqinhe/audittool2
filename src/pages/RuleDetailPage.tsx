import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Sparkles,
  Lock,
  Plus,
  X,
  Upload,
  Play,
  Clock,
  RotateCcw,
  FileText,
  ScanSearch,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  mockRules,
  categoryMeta,
  ruleModules,
  ruleOutputModeMeta,
  type MockRule,
  type RuleCategory,
  type RuleOutputMode,
} from './RulesPage';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const IS_ADMIN = true;

const tabs = [
  { key: 'config', label: '规则配置' },
  { key: 'test', label: '规则测试' },
  { key: 'versions', label: '版本历史' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

type TestResultState =
  | {
      mode: 'bpm_structured';
      category: RuleCategory;
      summary: string;
      conclusion: string;
      reason: string;
      quote: string;
      fields: { label: string; value: string }[];
    }
  | {
      mode: 'recognition_only';
      summary: string;
      clauses: {
        id: string;
        topic?: string;
        valueSummary?: string;
        anchorLabel: string;
        excerpt: string;
      }[];
    };

function emptyRule(): MockRule {
  return {
    id: '',
    name: '',
    module: ruleModules[0],
    status: 'draft',
    currentVersion: 0,
    updated: '',
    updatedBy: '',
    desc: '',
    ruleMode: 'bpm_structured',
    systemPrompt:
      '你是一名专业的合同条款审查助手。请严格根据合同原文进行判断，不得编造信息。输出必须为 JSON 格式，每次引用原文必须携带对应的 locationId（段落ID）。输出字段包含：category、summary、conclusion、reason、quote、locationId、structuredFields。',
    userPrompt: '',
    fieldTemplate: [],
    versions: [],
  };
}

export default function RuleDetailPage() {
  const { ruleId } = useParams<{ ruleId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = ruleId === 'new';

  const initial = useMemo(() => {
    if (isNew) return emptyRule();
    return mockRules.find((r) => r.id === ruleId) ?? { ...emptyRule(), id: ruleId ?? '', name: `未知规则 ${ruleId}` };
  }, [isNew, ruleId]);

  const [name, setName] = useState(initial.name);
  const [module, setModule] = useState(initial.module);
  const [desc, setDesc] = useState(initial.desc);
  const [systemPrompt, setSystemPrompt] = useState(initial.systemPrompt);
  const [userPrompt, setUserPrompt] = useState(initial.userPrompt);
  const [fieldTemplate, setFieldTemplate] = useState<string[]>(initial.fieldTemplate);
  const [newField, setNewField] = useState('');
  const [ruleMode, setRuleMode] = useState<RuleOutputMode>(initial.ruleMode ?? 'bpm_structured');

  const defaultTab = (searchParams.get('tab') as TabKey) || 'config';
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);

  const [savedFlash, setSavedFlash] = useState(false);
  const [testFile, setTestFile] = useState<string | null>(null);
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<null | TestResultState>(null);

  const handleSave = () => {
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  };

  const handleAddField = () => {
    const v = newField.trim();
    if (v && !fieldTemplate.includes(v)) {
      setFieldTemplate([...fieldTemplate, v]);
      setNewField('');
    }
  };

  const handleRemoveField = (f: string) => {
    setFieldTemplate(fieldTemplate.filter((x) => x !== f));
  };

  const handleRunTest = () => {
    if (!testFile) return;
    setTestRunning(true);
    setTestResult(null);
    window.setTimeout(() => {
      setTestRunning(false);
      if (ruleMode === 'recognition_only') {
        setTestResult({
          mode: 'recognition_only',
          summary: '合同侧信息已提取（模拟）',
          clauses: [
            {
              id: 'sim-1',
              topic: name.replace(/（仅识别）/g, '') || '识别主题',
              valueSummary: '模拟摘要值',
              anchorLabel: '第2章第1节',
              excerpt: '（模拟）与样本合同段落 ID 对齐后，此处为原文摘录。',
            },
          ],
        });
      } else {
        setTestResult({
          mode: 'bpm_structured',
          category: 'trigger',
          summary: '命中风险审核规则（模拟）',
          conclusion: `合同中${name}条款与规则要求不一致，判定触发风险。（模拟结果）`,
          reason: '根据第3条第3.1款原文内容进行判断。（模拟）',
          quote: '3.1 卖方负责将设备交付至指定地点，并承担卸货费用。（模拟引用）',
          fields: fieldTemplate.map((f) => ({ label: f, value: `模拟提取值 - ${f}` })),
        });
      }
    }, 1500);
  };

  const switchTab = (t: TabKey) => {
    setActiveTab(t);
    setSearchParams(t === 'config' ? {} : { tab: t });
  };

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      {/* 顶部返回 + 标题 + 操作 */}
      <div className="flex items-center gap-4">
        <Link to="/admin/rules" className="inline-flex items-center gap-1.5 text-sm font-medium text-surface-600 hover:text-blue-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 返回列表
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-surface-900 tracking-tight">{isNew ? '新建规则' : '规则配置'}</h2>
          <p className="text-surface-500 mt-1 text-sm">
            {isNew ? '创建新的评审规则' : `${initial.id} · v${initial.currentVersion} · ${initial.module}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedFlash && (
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-lg border border-green-100 animate-in fade-in duration-300">
              已保存
            </span>
          )}
          <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-xl text-sm font-medium border border-surface-200 bg-white text-surface-700 hover:bg-surface-50 transition-colors">
            取消
          </button>
          <button onClick={handleSave} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors active:scale-[0.98]">
            <Save className="w-4 h-4" /> 保存
          </button>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 bg-surface-100 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === t.key ? 'bg-white text-blue-700 shadow-sm' : 'text-surface-600 hover:text-surface-900'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ========== Tab: 规则配置 ========== */}
      {activeTab === 'config' && (
        <div className="grid gap-6">
          {/* 基础信息 */}
          <section className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6 space-y-5">
            <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wide">基础信息</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-surface-500">规则名称</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-surface-200 px-3 py-2 text-sm focus:border-blue-300 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-surface-500">所属模块</span>
                <select
                  value={module}
                  onChange={(e) => setModule(e.target.value)}
                  className="w-full rounded-xl border border-surface-200 px-3 py-2 text-sm bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                >
                  {ruleModules.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium text-surface-500">输出模式</span>
                <p className="text-[11px] text-surface-400 mb-2">须与审核页卡片形态一致；切换后请相应调整系统提示词中的 JSON 约定。</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(['bpm_structured', 'recognition_only'] as const).map((m) => {
                    const meta = ruleOutputModeMeta[m];
                    const active = ruleMode === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setRuleMode(m);
                          if (m === 'recognition_only') setFieldTemplate([]);
                        }}
                        className={cn(
                          'flex items-start gap-3 text-left rounded-xl border px-4 py-3 transition-all',
                          active
                            ? m === 'recognition_only'
                              ? 'border-slate-400 bg-slate-50 ring-1 ring-slate-200'
                              : 'border-blue-400 bg-blue-50/80 ring-1 ring-blue-200'
                            : 'border-surface-200 bg-white hover:border-surface-300 hover:bg-surface-50/80'
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 p-1.5 rounded-lg shrink-0',
                            active ? (m === 'recognition_only' ? 'bg-slate-200 text-slate-700' : 'bg-blue-200 text-blue-800') : 'bg-surface-100 text-surface-400'
                          )}
                        >
                          {meta.icon}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-surface-900">{meta.label}</span>
                          <span className="block text-xs text-surface-500 mt-0.5 leading-relaxed">{meta.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </label>
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-surface-500">规则描述</span>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-surface-200 px-3 py-2 text-sm focus:border-blue-300 focus:ring-4 focus:ring-blue-100 outline-none resize-y min-h-[64px] transition-all"
              />
            </label>
          </section>

          {/* 系统提示词 */}
          <section className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-surface-400" />
                <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wide">系统提示词（System Prompt）</h3>
              </div>
              {!IS_ADMIN && (
                <span className="text-xs text-surface-400 bg-surface-50 px-2 py-0.5 rounded border border-surface-200">仅管理员可编辑</span>
              )}
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              readOnly={!IS_ADMIN}
              rows={6}
              className={cn(
                'w-full rounded-xl border px-3 py-3 text-sm font-mono leading-relaxed outline-none resize-y min-h-[120px] transition-all',
                IS_ADMIN
                  ? 'border-surface-200 focus:border-blue-300 focus:ring-4 focus:ring-blue-100'
                  : 'border-surface-100 bg-surface-50 text-surface-600 cursor-default'
              )}
            />
            <p className="text-xs text-surface-400">
              系统提示词约束模型行为，包含输出格式、安全边界、locationId 携带要求等。
              {ruleMode === 'recognition_only' && (
                <span className="block mt-1 text-slate-600">
                  当前为<strong className="font-semibold">仅识别</strong>：请在提示词中约定输出 <code className="text-[11px] bg-slate-100 px-1 rounded">recognitionClauses</code>
                  （含 topic、valueSummary、anchorLabel、locationId、excerpt），与审核页「识别结果」区块一致。
                </span>
              )}
              {IS_ADMIN ? ' 当前为管理员，可编辑。' : ' 如需修改请联系管理员。'}
            </p>
          </section>

          {/* 用户提示词 */}
          <section className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wide">用户提示词（User Prompt）</h3>
            </div>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              rows={10}
              placeholder="描述规则审查逻辑、判据、例外场景…&#10;&#10;支持变量：{{规则名}}、{{模块}}、{{合同类型}}"
              className="w-full rounded-xl border border-surface-200 px-3 py-3 text-sm font-mono leading-relaxed focus:border-blue-300 focus:ring-4 focus:ring-blue-100 outline-none resize-y min-h-[200px] transition-all"
            />
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-surface-400">可用变量：</span>
              {['{{规则名}}', '{{模块}}', '{{合同类型}}'].map((v) => (
                <code key={v} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 font-mono">
                  {v}
                </code>
              ))}
            </div>
          </section>

          {/* 评审结果：需提取字段模板 / 仅识别：输出说明 */}
          {ruleMode === 'bpm_structured' ? (
            <section className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wide">需提取字段模板</h3>
              </div>
              <p className="text-xs text-surface-500">
                配置后模型将按此列表提取结构化字段（structuredFields），展示在审核页的「评审要点提取」区域，并参与 BPM 回传。
              </p>
              <div className="flex flex-wrap gap-2">
                {fieldTemplate.map((f) => (
                  <span key={f} className="inline-flex items-center gap-1 bg-surface-100 text-surface-800 px-3 py-1.5 rounded-lg text-sm font-medium border border-surface-200">
                    {f}
                    <button onClick={() => handleRemoveField(f)} className="text-surface-400 hover:text-red-500 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    value={newField}
                    onChange={(e) => setNewField(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddField()}
                    placeholder="添加字段…"
                    className="w-32 rounded-lg border border-dashed border-surface-300 px-3 py-1.5 text-sm outline-none focus:border-blue-400 transition-colors"
                  />
                  <button onClick={handleAddField} className="p-1.5 text-surface-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ScanSearch className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wide">识别结果输出（仅识别）</h3>
              </div>
              <p className="text-xs text-surface-500 leading-relaxed">
                此类规则<strong className="font-medium text-surface-700">不配置</strong>字段模板。模型应输出{' '}
                <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded border border-slate-200">recognitionClauses</code>
                数组；审核页仅展示「识别结果」：首行为 <code className="text-[11px] bg-slate-100 px-1 rounded">主题：摘要</code>（由 topic + valueSummary
                组成），次行为可点击锚点 <code className="text-[11px] bg-slate-100 px-1 rounded">原文 + 章节 + 「摘录」</code>，章节须带{' '}
                <code className="text-[11px] bg-slate-100 px-1 rounded">locationId</code> 以定位左侧合同。
              </p>
              <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 leading-relaxed">
                已提取识别结果供参考；不向 BPM 回传审核点结构化字段。主数据核对需人工进行。（与审核页提示一致）
              </p>
            </section>
          )}
        </div>
      )}

      {/* ========== Tab: 规则测试 ========== */}
      {activeTab === 'test' && (
        <div className="grid gap-6">
          <section className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6 space-y-5">
            <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wide">上传样本合同</h3>
            <p className="text-xs text-surface-500">
              上传合同文件后执行测试，系统将使用当前系统提示词 + 用户提示词进行模拟评审。
              {ruleMode === 'recognition_only' ? ' 仅识别规则的测试结果结构与审核页「识别结果」一致。' : ' 「评审结果」规则展示审核结论与评审要点提取。'}
            </p>

            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
                testFile ? 'border-blue-300 bg-blue-50/50' : 'border-surface-300 hover:border-blue-400 hover:bg-surface-50'
              )}
            >
              {testFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-surface-900">{testFile}</span>
                  <button onClick={() => { setTestFile(null); setTestResult(null); }} className="text-surface-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-surface-300" />
                  <span className="text-sm text-surface-500">点击选择或拖拽 PDF / Word 文件</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setTestFile(f.name);
                    }}
                  />
                </label>
              )}
            </div>

            <button
              onClick={handleRunTest}
              disabled={!testFile || testRunning}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm',
                testFile && !testRunning
                  ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
                  : 'bg-surface-200 text-surface-400 cursor-not-allowed'
              )}
            >
              <Play className="w-4 h-4" />
              {testRunning ? '测试中…' : '执行测试'}
            </button>
          </section>

          {/* 测试结果 */}
          {testResult && (
            <section className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wide">测试结果</h3>
                  <span className="text-xs text-surface-400">
                    {testResult.mode === 'recognition_only' ? '与审核页「仅识别」卡片一致' : '与审核页「评审结果」卡片一致'}
                  </span>
                </div>

                {testResult.mode === 'bpm_structured' ? (
                  <>
                    <div className={cn('flex items-center gap-2 p-3 rounded-xl', categoryMeta[testResult.category].bg)}>
                      <span className={cn('w-2.5 h-2.5 rounded-full', categoryMeta[testResult.category].dot)} />
                      <span className={cn('text-sm font-semibold', categoryMeta[testResult.category].color)}>
                        {categoryMeta[testResult.category].label}
                      </span>
                      <span className="text-sm text-surface-600 ml-1">— {testResult.summary}</span>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">审核结论</div>
                      <div className="rounded-lg bg-surface-50 px-3 py-2 text-sm text-surface-900">{testResult.conclusion}</div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">结论原因</div>
                      <div className="rounded-lg bg-surface-50 px-3 py-2 text-sm text-surface-600">{testResult.reason}</div>
                    </div>

                    {testResult.quote && (
                      <div>
                        <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">原文引用</div>
                        <div className="rounded-lg bg-surface-50 px-3 py-2 text-sm text-surface-600 italic border-l-2 border-blue-300">
                          {testResult.quote}
                        </div>
                      </div>
                    )}

                    {testResult.fields.length > 0 && (
                      <div className="bg-surface-50 p-4 rounded-xl border border-surface-200">
                        <h5 className="text-xs font-semibold text-surface-600 mb-3">评审要点提取</h5>
                        <div className="space-y-2">
                          {testResult.fields.map((f) => (
                            <div key={f.label} className="flex items-center gap-3">
                              <span className="text-xs text-surface-500 w-24 shrink-0">{f.label}</span>
                              <span className="text-sm text-surface-900 font-medium">{f.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <ScanSearch className="w-4 h-4 text-slate-600 shrink-0" />
                      <span className="text-sm font-semibold text-slate-700">仅识别</span>
                      <span className="text-sm text-surface-600">— {testResult.summary}</span>
                    </div>
                    <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 leading-relaxed">
                      已提取识别结果供参考；<span className="font-semibold">不向 BPM 回传审核点结构化字段</span>。主数据核对需人工进行。
                    </p>
                    <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                      <h5 className="text-xs font-semibold text-slate-700 mb-3">识别结果</h5>
                      <ul className="space-y-4 list-none m-0 p-0">
                        {testResult.clauses.map((clause, cIdx) => {
                          const prev = cIdx > 0 ? testResult.clauses[cIdx - 1] : undefined;
                          const topicChanged = !!clause.topic && clause.topic !== prev?.topic;
                          const showResultLine =
                            (clause.topic && clause.valueSummary) ||
                            (topicChanged && clause.topic && !clause.valueSummary) ||
                            (!clause.topic && !!clause.valueSummary);
                          return (
                            <li key={clause.id} className="text-sm leading-relaxed">
                              {showResultLine && (
                                <p className="text-surface-900 font-medium mb-1.5">
                                  {clause.topic && clause.valueSummary
                                    ? `${clause.topic}：${clause.valueSummary}`
                                    : clause.topic
                                      ? clause.topic
                                      : clause.valueSummary}
                                </p>
                              )}
                              <p className="text-surface-700">
                                <span className="text-surface-600">原文</span>
                                <span className="font-medium text-primary-600 underline underline-offset-2 decoration-primary-400/80 mx-0.5">
                                  {clause.anchorLabel}
                                </span>
                                <span className="text-surface-800">「{clause.excerpt}」</span>
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ========== Tab: 版本历史 ========== */}
      {activeTab === 'versions' && (
        <section className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-surface-100">
            <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wide">版本历史</h3>
            <p className="text-xs text-surface-500 mt-1">每次保存/发布生成新版本，支持回滚。回滚将生成新版本记录。</p>
          </div>
          <div className="divide-y divide-surface-100">
            {initial.versions.length === 0 ? (
              <div className="p-8 text-center text-sm text-surface-400">暂无版本记录</div>
            ) : (
              initial.versions.map((v, i) => (
                <div key={v.version} className={cn('flex items-center justify-between p-4 hover:bg-surface-50 transition-colors', i === 0 && 'bg-blue-50/30')}>
                  <div className="flex items-start gap-3">
                    <div className={cn('mt-0.5 p-1.5 rounded-lg', i === 0 ? 'bg-blue-100 text-blue-600' : 'bg-surface-100 text-surface-400')}>
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-surface-900">v{v.version}</span>
                        {i === 0 && <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">当前</span>}
                      </div>
                      <p className="text-xs text-surface-500 mt-0.5">{v.changeNote}</p>
                      <p className="text-xs text-surface-400 mt-0.5">{v.updatedBy} · {v.updatedAt}</p>
                    </div>
                  </div>
                  {i !== 0 && (
                    <button className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-surface-600 hover:text-blue-700 hover:bg-blue-50 border border-surface-200 rounded-lg transition-colors">
                      <RotateCcw className="w-3 h-3" /> 回滚到此版本
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
