import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Edit2, History, Trash2, CheckCircle2, XCircle, AlertTriangle, Info, ScanSearch, Database } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 审核结果中的判定类型（仅用于规则测试等展示，规则本体不配置此字段） */
export type RuleCategory = 'trigger' | 'missing' | 'low';
export type RuleStatus = 'active' | 'inactive' | 'draft';

/** 与审核页 RiskItem.ruleMode 一致：评审结果（BPM 结构化回传）vs 仅识别展示 */
export type RuleOutputMode = 'bpm_structured' | 'recognition_only';

export const ruleOutputModeMeta: Record<
  RuleOutputMode,
  { label: string; short: string; description: string; icon: React.ReactNode }
> = {
  bpm_structured: {
    label: '评审结果',
    short: '评审结果',
    description: '输出 category、结论、评审要点（structuredFields）等，参与审核点结构化回传 BPM。',
    icon: <Database className="w-3 h-3" />,
  },
  recognition_only: {
    label: '仅识别',
    short: '仅识别',
    description: '输出 recognitionClauses（识别结果），不向 BPM 回传审核点结构化字段。',
    icon: <ScanSearch className="w-3 h-3" />,
  },
};

export interface RuleVersion {
  version: number;
  updatedAt: string;
  updatedBy: string;
  changeNote: string;
}

export interface MockRule {
  id: string;
  name: string;
  module: string;
  status: RuleStatus;
  currentVersion: number;
  updated: string;
  updatedBy: string;
  desc: string;
  /** 规则输出模式：评审结果 / 仅识别，决定审核页卡片形态与 BPM 回传策略 */
  ruleMode: RuleOutputMode;
  systemPrompt: string;
  userPrompt: string;
  /** 仅「评审结果」模式使用；「仅识别」规则可为空数组 */
  fieldTemplate: string[];
  versions: RuleVersion[];
}

/** 规则所属模块（组织维度）枚举，与筛选「全部模块」一致 */
export const ruleModules = [
  '履约交付平台',
  '知识产权部',
  '财务部',
  '合规部',
  '信用应收',
  '法务部',
  '质量管理部',
] as const;

export const moduleFilterOptions = ['全部模块', ...ruleModules];

export const categoryMeta: Record<RuleCategory, { label: string; color: string; bg: string; dot: string; icon: React.ReactNode }> = {
  trigger: {
    label: '触发风险',
    color: 'text-risk-high',
    bg: 'bg-red-50',
    dot: 'bg-red-500',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  missing: {
    label: '信息缺失',
    color: 'text-risk-medium',
    bg: 'bg-amber-50',
    dot: 'bg-amber-500',
    icon: <Info className="w-3 h-3" />,
  },
  low: {
    label: '规则内',
    color: 'text-risk-low',
    bg: 'bg-green-50',
    dot: 'bg-green-500',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
};

export const mockRules: MockRule[] = [
  {
    id: 'R001',
    name: '交货方式要求',
    module: '履约交付平台',
    status: 'active',
    currentVersion: 3,
    updated: '2025-03-21',
    updatedBy: '王敏',
    desc: '检查是否约定车板交货或主变基础交货',
    ruleMode: 'bpm_structured',
    systemPrompt: '你是一名专业的合同条款审查助手。请严格根据合同原文进行判断，不得编造信息。输出必须为 JSON 格式，每次引用原文必须携带对应的 locationId（段落ID）。输出字段包含：category、summary、conclusion、reason、quote、locationId、structuredFields。',
    userPrompt: '请检查合同中是否明确约定了交货方式。合规的交货方式为「车板交货」或「主变基础交货」。\n\n判断标准：\n- 若合同中交货方式为上述两种之一，判定为 low（规则内）\n- 若交货方式为其他形式，判定为 trigger（触发风险）\n- 若合同中未找到交货方式条款，判定为 missing（信息缺失）\n\n需提取字段：交货方式、交货地点',
    fieldTemplate: ['交货方式', '交货地点'],
    versions: [
      { version: 3, updatedAt: '2025-03-21 14:30', updatedBy: '王敏', changeNote: '补充交货地点提取字段' },
      { version: 2, updatedAt: '2025-03-15 09:00', updatedBy: '李哲', changeNote: '细化判断标准描述' },
      { version: 1, updatedAt: '2025-02-20 11:00', updatedBy: '张工', changeNote: '初始版本' },
    ],
  },
  {
    id: 'R002',
    name: '付款方式要求',
    module: '财务部',
    status: 'active',
    currentVersion: 2,
    updated: '2025-03-20',
    updatedBy: '李哲',
    desc: '检查是否为转账/电汇/6月内汇票',
    ruleMode: 'bpm_structured',
    systemPrompt: '你是一名专业的合同条款审查助手。请严格根据合同原文进行判断，不得编造信息。输出必须为 JSON 格式，每次引用原文必须携带对应的 locationId（段落ID）。',
    userPrompt: '请检查合同中的付款方式条款。合规的付款方式为：转账、电汇、或 6 个月内到期的银行承兑汇票。\n\n判断标准：\n- 付款方式在上述范围内 → low\n- 付款方式不在范围内 → trigger\n- 未找到付款方式条款 → missing\n\n需提取字段：付款方式',
    fieldTemplate: ['付款方式'],
    versions: [
      { version: 2, updatedAt: '2025-03-20 10:15', updatedBy: '李哲', changeNote: '增加汇票期限说明' },
      { version: 1, updatedAt: '2025-02-18 09:00', updatedBy: '张工', changeNote: '初始版本' },
    ],
  },
  {
    id: 'R003',
    name: '质保期要求',
    module: '质量管理部',
    status: 'active',
    currentVersion: 1,
    updated: '2025-03-15',
    updatedBy: '张工',
    desc: '检查质保期是否满足至少12个月要求',
    ruleMode: 'bpm_structured',
    systemPrompt: '你是一名专业的合同条款审查助手。请严格根据合同原文进行判断，不得编造信息。输出必须为 JSON 格式，每次引用原文必须携带对应的 locationId（段落ID）。',
    userPrompt: '请检查合同中的质保期条款。规则要求质保期不少于 12 个月。\n\n判断标准：\n- 质保期 ≥ 12 个月 → low\n- 质保期 < 12 个月 → trigger\n- 未找到质保期条款 → missing\n\n需提取字段：质保期',
    fieldTemplate: ['质保期'],
    versions: [{ version: 1, updatedAt: '2025-03-15 16:00', updatedBy: '张工', changeNote: '初始版本' }],
  },
  {
    id: 'R004',
    name: '违约金上限',
    module: '法务部',
    status: 'inactive',
    currentVersion: 2,
    updated: '2025-03-10',
    updatedBy: '王敏',
    desc: '检查违约金总额是否超过合同金额的30%',
    ruleMode: 'bpm_structured',
    systemPrompt: '你是一名专业的合同条款审查助手。请严格根据合同原文进行判断，不得编造信息。输出必须为 JSON 格式，每次引用原文必须携带对应的 locationId（段落ID）。',
    userPrompt: '请检查合同中的违约金条款。规则要求违约金总额不得超过合同总金额的 30%。\n\n判断标准：\n- 违约金未超过 30% → low\n- 违约金超过或可能超过 30% → trigger\n- 未找到违约金条款 → missing\n\n需提取字段：违约金比例',
    fieldTemplate: ['违约金比例'],
    versions: [
      { version: 2, updatedAt: '2025-03-10 11:20', updatedBy: '王敏', changeNote: '调整上限比例描述' },
      { version: 1, updatedAt: '2025-02-25 15:00', updatedBy: '张工', changeNote: '初始版本' },
    ],
  },
  {
    id: 'R005',
    name: '发票开具要求',
    module: '财务部',
    status: 'active',
    currentVersion: 1,
    updated: '2025-03-01',
    updatedBy: '李哲',
    desc: '检查是否明确开具增值税专用发票',
    ruleMode: 'bpm_structured',
    systemPrompt: '你是一名专业的合同条款审查助手。请严格根据合同原文进行判断，不得编造信息。输出必须为 JSON 格式，每次引用原文必须携带对应的 locationId（段落ID）。',
    userPrompt: '请检查合同中是否明确约定开具增值税专用发票。\n\n判断标准：\n- 明确约定开具增值税专用发票 → low\n- 约定了其他类型发票或不明确 → trigger\n- 未找到发票条款 → missing\n\n需提取字段：发票类型',
    fieldTemplate: ['发票类型'],
    versions: [{ version: 1, updatedAt: '2025-03-01 08:30', updatedBy: '李哲', changeNote: '初始版本' }],
  },
  {
    id: 'R006',
    name: '运输方式（仅识别）',
    module: '履约交付平台',
    status: 'active',
    currentVersion: 1,
    updated: '2026-03-28',
    updatedBy: '王敏',
    desc: '提取合同约定运输方式，供业务参考；不参与 BPM 结构化回传',
    ruleMode: 'recognition_only',
    systemPrompt:
      '你是一名合同信息提取助手。输出 JSON。ruleMode 为仅识别：不向 BPM 回传 structuredFields。请输出 recognitionClauses 数组，每项含 id、topic（业务主题）、valueSummary（与 topic 组成首行「主题：摘要」，如运输方式：公路运输）、anchorLabel（展示用章节名，如第2章第1节）、locationId（须与合同段落 ID 一致）、excerpt（该处原文摘录）。category 建议为 low；summary 可简述「合同侧信息已提取」。',
    userPrompt:
      '请从合同中识别「设备/物资运输方式」相关约定：提取运输责任方与运输方式（如公路、铁路等）。按 recognitionClauses 输出，可多段；同一业务主题下后续条可省略重复 topic。',
    fieldTemplate: [],
    versions: [{ version: 1, updatedAt: '2026-03-28 10:00', updatedBy: '王敏', changeNote: '仅识别规则初版' }],
  },
  {
    id: 'R007',
    name: '检验与试验不合格处罚（仅识别）',
    module: '质量管理部',
    status: 'active',
    currentVersion: 1,
    updated: '2026-03-28',
    updatedBy: '张工',
    desc: '提取到货检验、送样试验不合格时的处罚与补救约定（仅识别）',
    ruleMode: 'recognition_only',
    systemPrompt:
      '你是一名合同信息提取助手。输出 JSON。本规则为仅识别：输出 recognitionClauses，每项含 id、topic（长主题可只在首条填写）、valueSummary（可选）、anchorLabel、locationId、excerpt。不要求输出 conclusion/reason 长文；审核页仅展示「识别结果」与原文锚点。',
    userPrompt:
      '请识别合同中与「到货检验、送样试验或类似检验试验不合格」相关的处罚、补救、解除或违约金条款。按章节拆分为多条 recognitionClauses，anchorLabel 与 locationId 与段落 ID 对齐。',
    fieldTemplate: [],
    versions: [{ version: 1, updatedAt: '2026-03-28 11:00', updatedBy: '张工', changeNote: '初始版本' }],
  },
];

const statusMeta: Record<RuleStatus, { label: string; icon: React.ReactNode; cls: string }> = {
  active: { label: '已生效', icon: <CheckCircle2 className="w-3 h-3" />, cls: 'text-green-600 bg-green-50 border-green-100' },
  inactive: { label: '已停用', icon: <XCircle className="w-3 h-3" />, cls: 'text-surface-500 bg-surface-100 border-surface-200' },
  draft: { label: '草稿', icon: <Edit2 className="w-3 h-3" />, cls: 'text-blue-600 bg-blue-50 border-blue-100' },
};

export default function RulesPage() {
  const [activeModule, setActiveModule] = useState('全部模块');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    return mockRules.filter((r) => {
      const modOk = activeModule === '全部模块' || r.module === activeModule;
      const q = query.trim().toLowerCase();
      const textOk = !q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q);
      return modOk && textOk;
    });
  }, [activeModule, query]);

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-surface-900 tracking-tight">规则管理</h2>
          <p className="text-surface-500 mt-1 text-sm">配置和管理 AI 智能评审的底层规则引擎。</p>
        </div>
        <Link
          to="/admin/rules/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm flex items-center gap-2 active:scale-95"
        >
          <Plus className="w-4 h-4" /> 新建规则
        </Link>
      </div>

      <div className="bg-white p-3 rounded-2xl border border-surface-200 shadow-sm flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-2 pr-2 overflow-x-auto hide-scrollbar w-full sm:w-auto">
          {moduleFilterOptions.map((mod) => (
            <button
              key={mod}
              onClick={() => setActiveModule(mod)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                activeModule === mod ? 'bg-blue-50 text-blue-700' : 'text-surface-600 hover:bg-surface-50'
              )}
            >
              {mod}
            </button>
          ))}
        </div>
        <div className="hidden sm:block h-6 w-px bg-surface-200" />
        <div className="flex-1 relative w-full">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索规则名称、ID 或描述..."
            className="w-full pl-10 pr-4 py-2 bg-surface-50 border border-transparent rounded-lg focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-medium text-surface-900 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="py-4 px-6 font-semibold text-xs text-surface-500 uppercase tracking-wider bg-white">规则名称 / ID</th>
                <th className="py-4 px-6 font-semibold text-xs text-surface-500 uppercase tracking-wider bg-white">所属模块</th>
                <th className="py-4 px-6 font-semibold text-xs text-surface-500 uppercase tracking-wider bg-white">输出模式</th>
                <th className="py-4 px-6 font-semibold text-xs text-surface-500 uppercase tracking-wider bg-white">状态</th>
                <th className="py-4 px-6 font-semibold text-xs text-surface-500 uppercase tracking-wider bg-white">版本</th>
                <th className="py-4 px-6 font-semibold text-xs text-surface-500 uppercase tracking-wider bg-white">最后更新</th>
                <th className="py-4 px-6 font-semibold text-xs text-surface-500 uppercase tracking-wider text-right bg-white">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {filtered.map((rule) => {
                const st = statusMeta[rule.status];
                return (
                  <tr key={rule.id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="py-4 px-6">
                      <Link to={`/admin/rules/${rule.id}`} className="block">
                        <div className="font-semibold text-surface-900 text-sm mb-0.5 group-hover:text-blue-700 transition-colors">{rule.name}</div>
                        <div className="text-xs text-surface-400 font-mono">{rule.id}</div>
                      </Link>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-100 text-surface-700">
                        {rule.module}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {(() => {
                        const om = ruleOutputModeMeta[rule.ruleMode];
                        return (
                          <span
                            title={om.description}
                            className={cn(
                              'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border',
                              rule.ruleMode === 'recognition_only'
                                ? 'text-slate-700 bg-slate-50 border-slate-200'
                                : 'text-blue-800 bg-blue-50 border-blue-100'
                            )}
                          >
                            {om.icon}
                            {om.short}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-4 px-6">
                      <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border', st.cls)}>
                        {st.icon} {st.label}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-xs text-surface-600 font-mono bg-surface-50 px-2 py-0.5 rounded">v{rule.currentVersion}</span>
                    </td>
                    <td className="py-4 px-6 text-sm text-surface-500 tabular-nums">
                      <div>{rule.updated}</div>
                      <div className="text-xs text-surface-400">{rule.updatedBy}</div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/admin/rules/${rule.id}`}
                          className="p-2 text-surface-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="编辑配置"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/admin/rules/${rule.id}?tab=versions`}
                          className="p-2 text-surface-400 hover:text-surface-900 hover:bg-surface-100 rounded-lg transition-colors"
                          title="版本历史"
                        >
                          <History className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          className={cn(
                            'p-2 rounded-lg transition-colors',
                            rule.status !== 'active'
                              ? 'text-surface-400 hover:text-red-600 hover:bg-red-50'
                              : 'text-surface-200 cursor-not-allowed'
                          )}
                          title={rule.status === 'active' ? '生效中不可删除' : '删除'}
                          disabled={rule.status === 'active'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-4 border-t border-surface-200 flex items-center justify-between text-sm">
          <span className="text-surface-500 font-medium">共 {filtered.length} 条规则</span>
          <div className="flex gap-1">
            <button type="button" className="px-3 py-1.5 text-surface-500 hover:text-surface-900 font-medium rounded-lg hover:bg-surface-100 transition-colors">
              上一页
            </button>
            <button type="button" className="px-3 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-lg">
              1
            </button>
            <button type="button" className="px-3 py-1.5 text-surface-500 hover:text-surface-900 font-medium rounded-lg hover:bg-surface-100 transition-colors">
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
