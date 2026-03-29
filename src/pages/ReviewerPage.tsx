import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronLeft, FileText, AlertTriangle, CheckCircle2, Info, Search, LayoutTemplate, ChevronUp, ChevronDown, Download, ThumbsUp, ThumbsDown, ScanSearch } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { exportElementToSvg } from '../utils/exportSvg';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 结构化卡片右上角审核状态：固定为徽章样式，与可点击操作按钮区分 */
function StructuredReviewStatusBadge(props: {
  ignored?: boolean;
  isAccepted?: boolean;
  acceptedAfterEdit?: boolean;
}) {
  const { ignored, isAccepted, acceptedAfterEdit } = props;
  let label: string;
  let tone: 'pending' | 'adopted' | 'ignored';
  if (ignored) {
    label = '已忽略';
    tone = 'ignored';
  } else if (isAccepted) {
    label = acceptedAfterEdit ? '已确认' : '已采纳';
    tone = 'adopted';
  } else {
    label = '待处理';
    tone = 'pending';
  }
  return (
    <span
      role="status"
      aria-label={`审核状态：${label}`}
      className={cn(
        'inline-flex items-center min-h-[1.5rem] px-2 py-0.5 rounded-md text-xs font-semibold tracking-tight leading-none shrink-0 select-none',
        tone === 'pending' && 'bg-amber-100 text-amber-950',
        tone === 'adopted' && 'bg-emerald-100 text-emerald-950',
        tone === 'ignored' && 'bg-surface-200 text-surface-700'
      )}
    >
      {label}
    </span>
  );
}

const structuredActionBtn =
  'px-2 py-1 text-xs font-medium rounded-md border border-surface-300 bg-white text-surface-700 hover:bg-surface-50 transition-colors';
const structuredPrimaryActionBtn =
  'px-2 py-1 text-xs font-medium rounded-md border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50/80 transition-colors';

type RiskCategory = 'trigger' | 'missing' | 'low';

/** bpm_structured：参与审核点结构化回传；recognition_only：仅识别展示，不回传 BPM 结构化字段 */
export type RuleMode = 'bpm_structured' | 'recognition_only';

export interface StructuredField {
  id: string;
  label: string;
  value: string;
  sourceText?: string;
  locationId?: string;
  /** 仅当 ruleMode === bpm_structured 时，采纳后用于 BPM 回传 */
  confirmed?: boolean;
}

/** 仅识别：一条业务对象下可有多处原文摘录，章节文案可点击定位左侧合同 */
export interface RecognitionClauseItem {
  id: string;
  /** 业务对象/主题；可与 valueSummary 组成首行「主题：摘要」 */
  topic?: string;
  /** 与 topic 组合为「运输方式：公路运输」；同主题后续条可省略 */
  valueSummary?: string;
  /** 展示为可点击锚点，如「第3章第2节」 */
  anchorLabel: string;
  /** 与左侧合同 DOM id 一致 */
  locationId: string;
  /** 该章节下的摘录正文 */
  excerpt: string;
}

export interface RiskItem {
  id: string;
  title: string;
  summary: string;
  details: string;
  conclusion: string;
  reason: string;
  reasonLocationId?: string;
  category: RiskCategory;
  quote?: string;
  locationId?: string;
  ruleMode: RuleMode;
  /** 结构化审核：采纳/确认后参与 BPM；仅识别模式不使用 */
  isAccepted?: boolean;
  /** 为 true 表示用户曾在编辑后点击「确认」（与「采纳」提交效果一致，仅文案区分） */
  acceptedAfterEdit?: boolean;
  /** 用户点击「忽略」：全盘不接受本条，与采纳/确认互斥 */
  ignored?: boolean;
  /** 仅识别：赞/踩反馈，不参与 BPM 结构化回传 */
  recognitionFeedback?: 'up' | 'down' | null;
  structuredFields: StructuredField[];
  /** 仅识别：按业务对象列举摘录（优先于 structuredFields 展示） */
  recognitionClauses?: RecognitionClauseItem[];
}

/** 汇总智能评审在结果中引用过的段落 id（与左侧合同 DOM id 对齐） */
function collectReferencedLocationIds(items: RiskItem[]): Set<string> {
  const s = new Set<string>();
  for (const item of items) {
    if (item.locationId) s.add(item.locationId);
    if (item.reasonLocationId) s.add(item.reasonLocationId);
    for (const f of item.structuredFields) {
      if (f.locationId) s.add(f.locationId);
    }
    item.recognitionClauses?.forEach((c) => {
      if (c.locationId) s.add(c.locationId);
    });
  }
  return s;
}

/** 进入页左右 5.5 : 4.5（左合同 : 右审核），右栏占可用宽度 4.5/10 = 45% */
const RIGHT_PANEL_FRACTION = 4.5 / (5.5 + 4.5);

function getInitialRightPanelWidth(): number {
  const clamp = (raw: number) => Math.max(320, Math.min(799, Math.round(raw)));
  if (typeof window === 'undefined') {
    return clamp(1280 * RIGHT_PANEL_FRACTION);
  }
  const vw = document.documentElement.clientWidth || window.innerWidth;
  const dragPx = 4;
  return clamp((vw - dragPx) * RIGHT_PANEL_FRACTION);
}

function ReviewerPage() {
  const [activeRiskId, setActiveRiskId] = useState<string | null>(null);
  const [riskItems, setRiskItems] = useState<RiskItem[]>([
    {
      id: 'risk-1',
      title: '交货方式要求',
      summary: '命中风险审核规则',
      details: '合同约定交货方式为卖方负责交付并承担卸货费用，与规则要求“车板交货/主变基础交货”不一致。',
      conclusion: '合同交货方式与风险规则不匹配，判定触发风险。',
      reason: '根据第3条第3.1款“卖方负责将设备交付至指定地点，并承担卸货费用”，与“车板交货/主变基础交货”要求冲突，存在风险。',
      reasonLocationId: 'risk-1',
      category: 'trigger',
      quote: '第3条 交货方式与地点 3.1 交货方式：卖方负责将设备交付至指定地点，并承担卸货费用。',
      locationId: 'risk-1',
      structuredFields: [
        {
          id: 'f-1-1',
          label: '交货方式',
          value: '卖方负责交付并承担卸货费用',
          sourceText: '3.1 交货方式：卖方负责将设备交付至指定地点，并承担卸货费用。',
          locationId: 'risk-1',
          confirmed: false,
        },
        {
          id: 'f-1-2',
          label: '交货地点',
          value: '买方XX变电站项目现场',
          sourceText: '3.2 交货地点：买方XX变电站项目现场。',
          locationId: 'risk-1',
          confirmed: false,
        },
      ],
      ruleMode: 'bpm_structured',
      isAccepted: false,
    },
    {
      id: 'risk-2',
      title: '质保期要求',
      summary: '没有支持判断的原文依据',
      details: '',
      conclusion: '合同中未明确约定质保期条款，无法判断是否满足规则中的12个月要求。',
      reason: '合同全文未找到质保期条款（如第5条/第6条），无法用原文确认是否符合12个月要求。',
      category: 'missing',
      structuredFields: [
        {
          id: 'f-2-1',
          label: '质保期',
          value: '未约定',
          confirmed: false,
        },
      ],
      ruleMode: 'bpm_structured',
      isAccepted: false,
    },
    {
      id: 'risk-3',
      title: '付款方式要求',
      summary: '在规则要求内',
      details: '合同约定支付为电汇或6个月内银行承兑汇票，符合规则要求。',
      conclusion: '付款方式符合规则要求，判定低风险。',
      reason: '根据第4条第4.3款“应通过电汇或6个月内到期的银行承兑汇票支付货款”，在规则范围内。',
      reasonLocationId: 'risk-3',
      category: 'low',
      quote: '4.3 到货款：设备到达现场并验收合格后，应通过电汇或6个月内到期的银行承兑汇票支付货款。',
      locationId: 'risk-3',
      structuredFields: [
        {
          id: 'f-3-1',
          label: '付款方式',
          value: '电汇/6个月承兑汇票',
          sourceText: '应通过电汇或6个月内到期的银行承兑汇票支付货款。',
          locationId: 'risk-3',
          confirmed: false,
        },
      ],
      ruleMode: 'bpm_structured',
      isAccepted: false,
    },
    {
      id: 'risk-4',
      title: '违约金比例',
      summary: '存在潜在违约金额问题',
      details: '违约金设定为逾期金额千分之五，需与合规规则比对上限。',
      conclusion: '违约金比例可能超过规则上限，判定触发风险。',
      reason: '根据第5条第5.1款“每逾期一日应支付逾期交货部分货款的千分之五”，需与最高30％上限对比判断。',
      reasonLocationId: 'risk-4',
      category: 'trigger',
      quote: '5.1 卖方未能按期交货，每逾期一日应支付逾期交货部分货款的千分之五。',
      locationId: 'risk-4',
      ruleMode: 'bpm_structured',
      isAccepted: false,
      structuredFields: [
        {
          id: 'f-4-1',
          label: '违约金比例',
          value: '千分之五',
          sourceText: '每逾期一日，应支付逾期交货部分货款的千分之五。',
          locationId: 'risk-4',
          confirmed: false,
        },
      ],
    },
    {
      id: 'risk-5',
      title: '检验与试验不合格处罚（仅识别）',
      summary: '合同侧信息已提取',
      details: '本规则仅做识别展示，不生成审核点结构化回传；主数据或标准比对需人工进行。',
      conclusion:
        '已定位与「到货检验、送样试验不合格」相关的处罚约定，请以识别摘录为准核对；不向 BPM 回传本项结构化字段。',
      reason: '下列条款摘自合同正文，章节链接可跳转左侧原文（本项为仅识别）。',
      category: 'low',
      ruleMode: 'recognition_only',
      recognitionFeedback: null,
      structuredFields: [],
      recognitionClauses: [
        {
          id: 'rc-5-1',
          topic: '国网对产品到货检验、送样试验等不合格的处罚条款',
          anchorLabel: '第3章第2节',
          locationId: 'rec-sgw-c3s2',
          excerpt:
            '买方有权对合同设备进行到货检验或送样试验；结果不合格的，卖方应在收到通知之日起15日内免费更换或补足，并承担相关费用。',
        },
        {
          id: 'rc-5-2',
          anchorLabel: '第4章第3节',
          locationId: 'rec-sgw-c4s3',
          excerpt:
            '同一缺陷经两次整改仍不合格的，买方有权解除合同，并可要求卖方支付合同总额20%的违约金。',
        },
      ],
    },
    {
      id: 'risk-6',
      title: '运输方式（仅识别）',
      summary: '合同侧信息已提取',
      details: '本规则仅做识别展示，不向 BPM 回传结构化评审字段。',
      conclusion: '识别结果：合同约定设备由卖方负责公路运输至项目现场。',
      reason: '运输方式条款见下文摘录（仅识别）。',
      category: 'low',
      ruleMode: 'recognition_only',
      recognitionFeedback: null,
      structuredFields: [],
      recognitionClauses: [
        {
          id: 'rc-6-1',
          topic: '运输方式',
          valueSummary: '公路运输',
          anchorLabel: '第2章第1节',
          locationId: 'rec-trans-c2s1',
          excerpt: '设备运输由卖方负责，采用公路运输方式运至买方指定的项目现场。',
        },
      ],
    },
  ]);

  const referencedLocationIds = useMemo(() => collectReferencedLocationIds(riskItems), [riskItems]);

  // 审核意见相关状态
  const [opinionText, setOpinionText] = useState('');
  const [isOpinionExpanded, setIsOpinionExpanded] = useState(true);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);
  const pageRef = useRef<HTMLDivElement>(null);

  /** 各卡片「智能审核原文案」基线，用于判断用户是否编辑过结论文案或评审要点 */
  const reviewBaselinesRef = useRef<Record<string, { mergedConclusion: string; fields: Record<string, string> }>>({});

  /** 审核结论区展示为一段总结：结论与补充说明用空格衔接，避免出现空行分段 */
  const getMergedConclusionText = (item: RiskItem) =>
    [item.conclusion, item.details]
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .join(' ');

  const ensureReviewBaseline = (item: RiskItem) => {
    if (!reviewBaselinesRef.current[item.id]) {
      reviewBaselinesRef.current[item.id] = {
        mergedConclusion: getMergedConclusionText(item),
        fields: Object.fromEntries(item.structuredFields.map((f) => [f.id, f.value])),
      };
    }
  };

  const isReviewDirty = (item: RiskItem): boolean => {
    if (item.ruleMode !== 'bpm_structured' || item.ignored) return false;
    ensureReviewBaseline(item);
    const b = reviewBaselinesRef.current[item.id]!;
    if (getMergedConclusionText(item) !== b.mergedConclusion) return true;
    return item.structuredFields.some((f) => f.value !== b.fields[f.id]);
  };

  const updateReviewBaseline = (item: RiskItem) => {
    reviewBaselinesRef.current[item.id] = {
      mergedConclusion: getMergedConclusionText(item),
      fields: Object.fromEntries(item.structuredFields.map((f) => [f.id, f.value])),
    };
  };

  const handleAcceptRisk = (itemId: string) => {
    const item = riskItems.find((r) => r.id === itemId);
    if (!item || item.ruleMode !== 'bpm_structured' || item.ignored) return;

    const wasDirty = isReviewDirty(item);
    const merged = getMergedConclusionText(item).trim();
    if (merged) {
      setOpinionText((o) => (o.trim() ? `${o.trim()}\n${merged}` : merged));
    }
    updateReviewBaseline(item);

    setRiskItems((prev) =>
      prev.map((risk) =>
        risk.id === itemId
          ? {
              ...risk,
              ignored: false,
              isAccepted: true,
              acceptedAfterEdit: wasDirty,
              structuredFields: risk.structuredFields.map((field) => ({ ...field, confirmed: true })),
            }
          : risk
      )
    );
  };

  /** 忽略：清掉采纳/确认，进入 ignored；不改动结论文案与要点内容 */
  const handleIgnoreRisk = (riskId: string) => {
    setRiskItems((prev) =>
      prev.map((risk) =>
        risk.id === riskId && risk.ruleMode === 'bpm_structured'
          ? {
              ...risk,
              ignored: true,
              isAccepted: false,
              acceptedAfterEdit: false,
              structuredFields: risk.structuredFields.map((field) => ({ ...field, confirmed: false })),
            }
          : risk
      )
    );
  };

  /** 取消确认/采纳：回到 pending，保留当前结论文案与要点（不重置基线、不还原 AI 初值） */
  const handleCancelAccept = (riskId: string) => {
    setRiskItems((prev) =>
      prev.map((risk) =>
        risk.id === riskId && risk.ruleMode === 'bpm_structured'
          ? {
              ...risk,
              isAccepted: false,
              acceptedAfterEdit: false,
              structuredFields: risk.structuredFields.map((field) => ({ ...field, confirmed: false })),
            }
          : risk
      )
    );
  };

  const handleCancelIgnore = (riskId: string) => {
    setRiskItems((prev) =>
      prev.map((risk) =>
        risk.id === riskId && risk.ruleMode === 'bpm_structured' ? { ...risk, ignored: false } : risk
      )
    );
  };

  const handleRecognitionFeedback = (riskId: string, feedback: 'up' | 'down' | null) => {
    setRiskItems((prev) =>
      prev.map((risk) =>
        risk.id === riskId && risk.ruleMode === 'recognition_only'
          ? { ...risk, recognitionFeedback: feedback }
          : risk
      )
    );
  };

  const handleSubmit = () => {
    const structuredRisks = riskItems.filter((r) => r.ruleMode === 'bpm_structured');
    const accepted = structuredRisks.filter((risk) => risk.isAccepted && !risk.ignored);
    const confirmedFields = structuredRisks.flatMap((risk) =>
      risk.structuredFields
        .filter((field) => field.confirmed)
        .map((field) => ({ ...field, riskId: risk.id }))
    );

    const recognitionFeedbackLog = riskItems
      .filter((r) => r.ruleMode === 'recognition_only' && r.recognitionFeedback)
      .map((r) => ({ riskId: r.id, title: r.title, feedback: r.recognitionFeedback }));

    const payload = {
      opinion: opinionText,
      /** 仅含需 BPM 结构化回传的项 */
      acceptedRisks: accepted,
      confirmedFields,
      /** 赞/踩仅作体验反馈记录，不写入审核点结构化字段 */
      recognitionFeedback: recognitionFeedbackLog,
    };

    console.log('提交至BPM payload:', payload);
    // TODO: 替换为真正的提交流程（例如调用 POST /bpm/review）

    // 模拟提交成功后可清理状态逻辑
    // setOpinionText('');
  };

  // 拖动侧边栏状态（初始约 1:1 分栏）
  const [rightPanelWidth, setRightPanelWidth] = useState(getInitialRightPanelWidth);
  const isResizing = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = document.body.clientWidth - e.clientX;
      // 设置最小和最大宽度限制
      if (newWidth > 320 && newWidth < 800) {
        setRightPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // 监听右侧滚动，仅在向下滑动时自动收缩意见框，上滑不自动展开
  useEffect(() => {
    const handleScroll = () => {
      if (rightScrollRef.current) {
        const scrollTop = rightScrollRef.current.scrollTop;
        
        // 判断是否是向下滚动
        const isScrollingDown = scrollTop > lastScrollTop.current;
        
        if (isScrollingDown && scrollTop > 50 && isOpinionExpanded) {
          setIsOpinionExpanded(false);
        }
        
        lastScrollTop.current = scrollTop;
      }
    };

    const scrollContainer = rightScrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isOpinionExpanded]);

  const sortedRiskItems = useMemo(() => {
    return riskItems.slice().sort((a, b) => {
      const modeRank = (x: RiskItem) => (x.ruleMode === 'bpm_structured' ? 0 : 1);
      if (modeRank(a) !== modeRank(b)) return modeRank(a) - modeRank(b);
      const order: RiskCategory[] = ['trigger', 'missing', 'low'];
      return order.indexOf(a.category) - order.indexOf(b.category);
    });
  }, [riskItems]);

  type OverviewSegment = 'trigger' | 'missing' | 'low' | 'recognition_only';

  /** 当前定位对应的概览分类（用于胶囊选中态，与左侧/卡片联动） */
  const selectedOverviewSegment = useMemo((): OverviewSegment | null => {
    if (!activeRiskId) return null;
    const item = sortedRiskItems.find(
      (i) => i.id === activeRiskId || i.recognitionClauses?.some((c) => c.locationId === activeRiskId)
    );
    if (!item) return null;
    if (item.ruleMode === 'recognition_only') return 'recognition_only';
    return item.category;
  }, [activeRiskId, sortedRiskItems]);

  /** 点击统计区：滚动右侧列表到该类型第一条卡片（与列表排序一致） */
  const scrollToFirstCardOfSegment = (segment: 'trigger' | 'missing' | 'low' | 'recognition_only') => {
    const first = sortedRiskItems.find((item) => {
      if (segment === 'recognition_only') return item.ruleMode === 'recognition_only';
      return item.ruleMode === 'bpm_structured' && item.category === segment;
    });
    if (!first) return;
    setActiveRiskId(first.id);
    requestAnimationFrame(() => {
      document.getElementById(`risk-card-${first.id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  /** 在「待处理」结构化卡片中顺序跳转（与列表排序一致）；当前不在列表中时从下一条视为第一条 */
  const scrollToNextPending = useCallback(() => {
    const pending = sortedRiskItems.filter(
      (item) => item.ruleMode === 'bpm_structured' && !item.isAccepted && !item.ignored
    );
    if (pending.length === 0) return;
    const ids = pending.map((item) => item.id);
    const idx = ids.indexOf(activeRiskId ?? '');
    const nextIdx = idx === -1 ? 0 : (idx + 1) % ids.length;
    const id = ids[nextIdx]!;
    setActiveRiskId(id);
    requestAnimationFrame(() => {
      document.getElementById(`risk-card-${id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, [sortedRiskItems, activeRiskId]);

  /** 定位到第一条「已处理」或「已忽略」结构化卡片（与列表排序一致） */
  const scrollToFirstStructuredReviewState = useCallback(
    (kind: 'resolved' | 'ignored') => {
      const first = sortedRiskItems.find((item) => {
        if (item.ruleMode !== 'bpm_structured') return false;
        if (kind === 'resolved') return !!item.isAccepted && !item.ignored;
        return !!item.ignored;
      });
      if (!first) return;
      setActiveRiskId(first.id);
      requestAnimationFrame(() => {
        document.getElementById(`risk-card-${first.id}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    },
    [sortedRiskItems]
  );

  // 定位到对应的风险原文
  const scrollToRisk = (riskId: string) => {
    setActiveRiskId(riskId);
    
    // 给一点小延迟，等待高亮样式渲染完成后再滚动
    setTimeout(() => {
      const element = document.getElementById(riskId);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center', // 将高亮内容居中显示
        });
        
        // 可选：添加一个短暂的闪烁效果增强引导
        element.classList.add('ring-4', 'ring-primary-500/30');
        setTimeout(() => {
          element.classList.remove('ring-4', 'ring-primary-500/30');
        }, 1500);
      }
    }, 50);
  };

  /** 左侧段落：当前定位 = 彩色强高亮；仅被引用 = 浅黄底提示 */
  const citeBlockClass = (blockId: string, activeTone: 'slate' | 'high' | 'low') => {
    const isRef = referencedLocationIds.has(blockId);
    const isAct = activeRiskId === blockId;
    if (isAct) {
      if (activeTone === 'slate') {
        return 'bg-slate-100 border-slate-400 shadow-[0_0_0_4px_rgba(148,163,184,0.25)]';
      }
      if (activeTone === 'high') {
        return 'bg-risk-high/10 border-risk-high shadow-[0_0_0_4px_rgba(239,68,68,0.2)]';
      }
      return 'bg-risk-low/10 border-risk-low shadow-[0_0_0_4px_rgba(16,185,129,0.2)]';
    }
    if (isRef) {
      return 'bg-amber-50/90 border-amber-200 border-2';
    }
    return 'border-transparent';
  };

  const citeSpanClass = (blockId: string, activeSpanClass: string) => {
    const isRef = referencedLocationIds.has(blockId);
    const isAct = activeRiskId === blockId;
    return cn('font-medium', isAct && activeSpanClass, !isAct && isRef && 'bg-amber-100/90 text-amber-950/90');
  };

  return (
    <div ref={pageRef} className="flex flex-col h-screen bg-surface-50 overflow-hidden">
      {/* 顶部导航栏 */}
      <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-surface-200 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 text-surface-500 hover:text-surface-900 transition-colors">
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium text-sm">返回BPM任务</span>
          </button>
          <div className="h-4 w-[1px] bg-surface-300"></div>
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-primary-50 text-primary-600 rounded-md">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-semibold text-surface-900 leading-tight">设备采购合同_XX变电站项目.pdf</h1>
              <div className="flex items-center gap-2 text-xs text-surface-500 mt-0.5">
                <span>任务ID: CON-20250321-001</span>
                <span>•</span>
                <span>项目: XX变电站项目</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => exportElementToSvg(pageRef.current, 'reviewer-page')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-surface-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            title="导出当前页面为 SVG"
          >
            <Download className="w-4 h-4" /> 导出 SVG
          </button>
          <div className="px-3 py-1.5 bg-surface-100 rounded-full flex items-center gap-2 border border-surface-200 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-primary-500"></div>
            <span className="text-sm font-medium text-surface-700">财务部视图</span>
          </div>
        </div>
      </header>

      {/* 主体内容区 */}
      <main className="flex-1 flex overflow-hidden">
        {/* 左侧区域：合同原文预览区 */}
        <section className="flex-1 bg-surface-200 relative p-4 flex flex-col">
          {/* 模拟PDF工具栏 */}
          <div className="h-12 bg-white rounded-t-lg shadow-sm flex items-center justify-between px-4 z-10">
            <div className="flex items-center gap-3 text-surface-600">
              <span className="text-sm font-medium">1 / 12 页</span>
              <div className="h-4 w-[1px] bg-surface-300"></div>
              <span className="text-sm">100%</span>
            </div>
            <div className="flex gap-2 shrink-0">
              <button className="p-1.5 hover:bg-surface-100 rounded text-surface-600"><Search className="w-4 h-4" /></button>
              <button className="p-1.5 hover:bg-surface-100 rounded text-surface-600"><LayoutTemplate className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="bg-amber-50/90 border-b border-amber-100 px-4 py-1.5 text-[11px] text-surface-600 leading-snug shrink-0">
            <span className="font-medium text-amber-900/90">引用高亮：</span>
            浅黄底为智能评审已引用段落；彩色描边为当前定位。未标注段落请自行复核是否遗漏。
          </div>

          {/* 模拟PDF页面 */}
          <div className="flex-1 bg-surface-100 overflow-y-auto overflow-x-hidden flex justify-center pb-8 rounded-b-lg">
            <div className="w-full max-w-[800px] mt-4 space-y-6">
              
              {/* 第一页 */}
              <div className="bg-white min-h-[1000px] shadow-sm p-12 relative font-serif text-justify text-surface-800 leading-relaxed text-sm">
                <h2 className="text-2xl font-bold text-center mb-8">设备采购合同</h2>
                
                <p className="mb-4">甲方（买方）：XX变电站项目部</p>
                <p className="mb-8">乙方（卖方）：XXX电气设备有限公司</p>
                
                <p className="mb-4 indent-8">甲乙双方经友好协商，就买方向卖方采购设备事宜，达成如下协议，以资共同遵守。</p>
                
                <h3 className="font-bold mb-2 mt-6">第一条 合同标的</h3>
                <p className="mb-4 indent-8">1.1 卖方向买方提供变压器、断路器等设备，具体型号、规格、数量、单价详见附件一《采购清单》。</p>
                
                <h3 className="font-bold mb-2 mt-6">第二条 合同金额</h3>
                <p className="mb-4 indent-8">2.1 本合同总金额为人民币（大写）伍佰万元整（¥5,000,000.00）。该价格包含设备款、包装费、运输费、保险费、安装指导费等全部费用。</p>

                <h3 className="font-bold mb-2 mt-6">第二章 运输与交付准备</h3>
                <div
                  id="rec-trans-c2s1"
                  className={cn('p-3 rounded-md transition-all duration-300 border-2 mb-4', citeBlockClass('rec-trans-c2s1', 'slate'))}
                >
                  <p className="font-bold text-sm mb-2">第1节 运输方式</p>
                  <p className="indent-8 text-sm leading-relaxed">
                    设备运输由卖方负责，采用
                    <span className={citeSpanClass('rec-trans-c2s1', 'bg-slate-200/90')}>公路运输</span>
                    方式运至买方指定的项目现场；运输费用及保险由卖方承担。
                  </p>
                </div>

                <h3 className="font-bold mb-2 mt-6">第三章 检验与试验</h3>
                <div
                  id="rec-sgw-c3s2"
                  className={cn('p-3 rounded-md transition-all duration-300 border-2 mb-4', citeBlockClass('rec-sgw-c3s2', 'slate'))}
                >
                  <p className="font-bold text-sm mb-2">第2节 到货检验与送样试验</p>
                  <p className="indent-8 text-sm leading-relaxed">
                    买方有权依据合同约定对合同设备进行到货检验或送样试验。检验或试验结果
                    <span className={citeSpanClass('rec-sgw-c3s2', 'bg-slate-200/90')}>不合格的</span>
                    ，卖方应在收到买方书面通知之日起15日内免费更换、修理或补足，并承担由此产生的运输、装卸等全部费用。
                  </p>
                </div>

                <h3 className="font-bold mb-2 mt-6">第四章 违约责任</h3>
                <div
                  id="rec-sgw-c4s3"
                  className={cn('p-3 rounded-md transition-all duration-300 border-2 mb-4', citeBlockClass('rec-sgw-c4s3', 'slate'))}
                >
                  <p className="font-bold text-sm mb-2">第3节 质量违约与合同解除</p>
                  <p className="indent-8 text-sm leading-relaxed">
                    因卖方原因导致同一缺陷经两次整改仍不合格的，买方有权解除本合同，并可要求卖方支付
                    <span className={citeSpanClass('rec-sgw-c4s3', 'bg-slate-200/90')}>合同总额20%的违约金</span>
                    ，违约金不足以弥补损失的，卖方应继续赔偿。
                  </p>
                </div>

                <h3 className="font-bold mb-2 mt-6">第三条 交货方式与地点</h3>
                <div
                  id="risk-1"
                  className={cn('p-2 rounded-md transition-all duration-300 border-2', citeBlockClass('risk-1', 'high'))}
                >
                  <p className="indent-8">
                    3.1{' '}
                    <span className={citeSpanClass('risk-1', 'bg-risk-high/20')}>
                      交货方式：卖方负责将设备交付至指定地点，并承担卸货费用。
                    </span>
                  </p>
                  <p className="indent-8">3.2 交货地点：买方XX变电站项目现场。</p>
                </div>
                
                <h3 className="font-bold mb-2 mt-6">第四条 付款方式</h3>
                <div
                  id="risk-3"
                  className={cn('p-2 rounded-md transition-all duration-300 border-2 mt-2', citeBlockClass('risk-3', 'low'))}
                >
                  <p className="indent-8">4.1 预付款：合同签订后10个工作日内，买方支付合同总价的30%作为预付款。</p>
                  <p className="indent-8">4.2 发货款：设备生产完毕发货前，买方支付合同总价的30%。</p>
                  <p className="indent-8">
                    4.3 到货款：设备到达现场并验收合格后，买方
                    <span className={citeSpanClass('risk-3', 'bg-risk-low/20')}>应通过电汇或6个月内到期的银行承兑汇票支付货款</span>
                    （合同总价的30%）。
                  </p>
                </div>

                {/* 因为展示滚动效果，增加一些占位的长文本让页面可滚动 */}
                <h3 className="font-bold mb-2 mt-6">第五条 违约责任</h3>
                <div className="p-2 border-2 border-transparent">
                  <div id="risk-4" className={cn('-mx-2 px-2 py-1 rounded-md transition-all duration-300 border-2 mb-2', citeBlockClass('risk-4', 'high'))}>
                    <p className="indent-8">
                      5.1 卖方未能按期交货的，每逾期一日，应向买方支付逾期交货部分货款的
                      <span className={citeSpanClass('risk-4', 'bg-risk-high/20')}>千分之五作为违约金</span>。
                    </p>
                  </div>
                  <p className="indent-8 mb-2">5.2 买方未能按期付款的，每逾期一日，应向卖方支付逾期付款金额的千分之五作为违约金。</p>
                  <p className="indent-8">5.3 任何一方违反本合同其他约定的，应赔偿因此给守约方造成的全部损失。</p>
                </div>
                
                <h3 className="font-bold mb-2 mt-6">第六条 争议解决</h3>
                <div className="p-2 border-2 border-transparent">
                  <p className="indent-8 mb-2">6.1 凡因执行本合同所发生的或与本合同有关的一切争议，双方应首先通过友好协商解决。</p>
                  <p className="indent-8">6.2 协商不成的，任何一方均有权向买方所在地有管辖权的人民法院提起诉讼。</p>
                </div>

                <h3 className="font-bold mb-2 mt-6">第七条 其他约定</h3>
                <div className="p-2 border-2 border-transparent">
                  <p className="indent-8 mb-2">7.1 本合同自双方签字盖章之日起生效。</p>
                  <p className="indent-8 mb-2">7.2 本合同一式肆份，双方各执贰份，具有同等法律效力。</p>
                  <p className="indent-8">7.3 本合同未尽事宜，双方可签订补充协议，补充协议与本合同具有同等法律效力。</p>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* 拖动调节宽度的手柄 */}
        <div 
          className="w-1 bg-surface-200 hover:bg-primary-400 cursor-col-resize z-30 transition-colors shrink-0 flex items-center justify-center group"
          onMouseDown={(e) => {
            e.preventDefault();
            isResizing.current = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
        >
          {/* 手柄上的小圆点指示器 */}
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-1 h-1 rounded-full bg-surface-400"></div>
            <div className="w-1 h-1 rounded-full bg-surface-400"></div>
            <div className="w-1 h-1 rounded-full bg-surface-400"></div>
          </div>
        </div>

        {/* 右侧区域：吸顶「智能审核结果」+ 风险类型 / 仅识别导航，下列表可滚动 */}
        <section 
          className="bg-white flex flex-col shrink-0 min-h-0 shadow-[-4px_0_24px_-8px_rgba(0,0,0,0.05)] z-20 relative"
          style={{ width: rightPanelWidth }}
        >
          <div className="flex-1 overflow-y-auto relative min-h-0" ref={rightScrollRef}>
            <div
              className={cn(
                'sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 px-5 py-3.5',
                'border-b border-surface-100 bg-white/95 backdrop-blur-sm supports-[backdrop-filter]:bg-white/90'
              )}
            >
              <h2 className="text-lg font-bold text-surface-900 flex items-center min-w-0 shrink-0">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-blue-600">
                  智能审核结果
                </span>
              </h2>
              {/* 处理进度 + 风险概览：均仅统计/跳转「评审结果」结构化项；仅识别见右侧胶囊 */}
              <div className="flex flex-wrap items-center justify-end gap-1.5 text-xs font-medium bg-surface-100 p-1 rounded-full border border-surface-200">
                {(() => {
                  const structured = riskItems.filter((item) => item.ruleMode === 'bpm_structured');
                  const nPending = structured.filter((item) => !item.isAccepted && !item.ignored).length;
                  const nResolved = structured.filter((item) => item.isAccepted && !item.ignored).length;
                  const nIgnored = structured.filter((item) => item.ignored).length;
                  const nTrigger = riskItems.filter((item) => item.ruleMode === 'bpm_structured' && item.category === 'trigger').length;
                  const nMissing = riskItems.filter((item) => item.ruleMode === 'bpm_structured' && item.category === 'missing').length;
                  const nLow = riskItems.filter((item) => item.ruleMode === 'bpm_structured' && item.category === 'low').length;
                  const nRec = riskItems.filter((item) => item.ruleMode === 'recognition_only').length;
                  const chipBtn =
                    'rounded-full flex items-center gap-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1';
                  const chipSelected = 'bg-white shadow-sm ring-1 ring-black/[0.06]';
                  const statBase =
                    'rounded-full flex items-center gap-1 px-2 py-0.5 tabular-nums leading-none shrink-0';
                  const statBtn =
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1';
                  return (
                    <>
                      <div
                        className={cn(
                          statBase,
                          'pl-2 pr-0.5 gap-0.5 bg-white/75 text-orange-900 ring-1 ring-orange-200/45 shadow-[0_1px_0_rgba(0,0,0,0.03)]'
                        )}
                        title="待处理：未采纳/确认且未忽略（评审结果）"
                      >
                        <span className="text-[11px] font-medium text-orange-800/90 tracking-tight">待处理</span>
                        <span className="min-w-[1.1ch] text-center text-xs font-semibold">{nPending}</span>
                        <button
                          type="button"
                          disabled={nPending === 0}
                          onClick={scrollToNextPending}
                          className={cn(
                            'p-0.5 rounded-full transition-colors',
                            nPending === 0
                              ? 'opacity-40 cursor-not-allowed'
                              : 'text-orange-800 hover:bg-orange-100/80 cursor-pointer'
                          )}
                          title="下一条待处理"
                          aria-label="下一条待处理"
                        >
                          <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-90" strokeWidth={2.25} />
                        </button>
                      </div>
                      <button
                        type="button"
                        disabled={nResolved === 0}
                        onClick={() => scrollToFirstStructuredReviewState('resolved')}
                        className={cn(
                          statBase,
                          statBtn,
                          'bg-white/55 text-emerald-900 ring-1 ring-emerald-200/40 shadow-[0_1px_0_rgba(0,0,0,0.02)]',
                          nResolved === 0
                            ? 'opacity-40 cursor-not-allowed'
                            : 'hover:bg-emerald-50/90 cursor-pointer'
                        )}
                        title="已处理：已采纳/确认且未忽略，点击定位第一条"
                        aria-label="定位到第一条已处理"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-[11px] font-medium text-emerald-800/88 tracking-tight">已处理</span>
                        <span className="text-xs font-semibold">{nResolved}</span>
                      </button>
                      <button
                        type="button"
                        disabled={nIgnored === 0}
                        onClick={() => scrollToFirstStructuredReviewState('ignored')}
                        className={cn(
                          statBase,
                          statBtn,
                          'bg-white/50 text-surface-700 ring-1 ring-surface-200/80',
                          nIgnored === 0
                            ? 'opacity-40 cursor-not-allowed'
                            : 'hover:bg-surface-100/90 cursor-pointer'
                        )}
                        title="已忽略，点击定位第一条"
                        aria-label="定位到第一条已忽略"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-surface-400 shrink-0" />
                        <span className="text-[11px] font-medium text-surface-600 tracking-tight">已忽略</span>
                        <span className="text-xs font-semibold text-surface-800">{nIgnored}</span>
                      </button>
                      <div className="w-px h-4 bg-surface-300/65 shrink-0 self-center mx-0.5" aria-hidden />
                      <button
                        type="button"
                        disabled={nTrigger === 0}
                        title="定位到第一条触发风险"
                        onClick={() => scrollToFirstCardOfSegment('trigger')}
                        className={cn(
                          chipBtn,
                          'px-2 py-0.5 text-risk-high',
                          selectedOverviewSegment === 'trigger' ? chipSelected : 'hover:bg-red-50/90',
                          nTrigger === 0 && 'opacity-40 cursor-not-allowed'
                        )}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-risk-high shrink-0" />
                        {nTrigger}
                      </button>
                      <button
                        type="button"
                        disabled={nMissing === 0}
                        title="定位到第一条信息缺失"
                        onClick={() => scrollToFirstCardOfSegment('missing')}
                        className={cn(
                          chipBtn,
                          'px-2 py-0.5 text-risk-medium',
                          selectedOverviewSegment === 'missing' ? chipSelected : 'hover:bg-amber-50/90',
                          nMissing === 0 && 'opacity-40 cursor-not-allowed'
                        )}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-risk-medium shrink-0" />
                        {nMissing}
                      </button>
                      <button
                        type="button"
                        disabled={nLow === 0}
                        title="定位到第一条低风险"
                        onClick={() => scrollToFirstCardOfSegment('low')}
                        className={cn(
                          chipBtn,
                          'px-2 py-0.5 text-risk-low',
                          selectedOverviewSegment === 'low' ? chipSelected : 'hover:bg-emerald-50/90',
                          nLow === 0 && 'opacity-40 cursor-not-allowed'
                        )}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-risk-low shrink-0" />
                        {nLow}
                      </button>
                      <button
                        type="button"
                        disabled={nRec === 0}
                        title="定位到第一条仅识别"
                        onClick={() => scrollToFirstCardOfSegment('recognition_only')}
                        className={cn(
                          chipBtn,
                          'px-2 py-0.5 text-slate-600 border-l border-surface-200 pl-2 ml-0.5',
                          selectedOverviewSegment === 'recognition_only' ? chipSelected : 'hover:bg-slate-100',
                          nRec === 0 && 'opacity-40 cursor-not-allowed'
                        )}
                      >
                        <ScanSearch className="w-3 h-3 shrink-0" /> 仅识别 {nRec}
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* 风险卡片列表 */}
            <div className="px-5 pb-5 pt-4 space-y-4">
                {sortedRiskItems.map((item) => {
                    const clauseActive =
                      item.recognitionClauses?.some((c) => c.locationId === activeRiskId) ?? false;
                    const isActive = activeRiskId === item.id || clauseActive;
                    const isRecognition = item.ruleMode === 'recognition_only';

                    const structuredMeta = {
                      trigger: { bg: 'bg-risk-high/5', border: 'border-risk-high', text: 'text-risk-high', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
                      missing: { bg: 'bg-risk-medium/5', border: 'border-risk-medium', text: 'text-risk-medium', icon: <Info className="w-3.5 h-3.5" /> },
                      low: { bg: 'bg-risk-low/5', border: 'border-risk-low', text: 'text-risk-low', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                    }[item.category];

                    const categoryMeta = isRecognition
                      ? {
                          bg: 'bg-slate-50',
                          border: 'border-slate-300',
                          text: 'text-slate-600',
                          icon: <ScanSearch className="w-3.5 h-3.5" />,
                        }
                      : structuredMeta;

                    const categoryLabel = isRecognition
                      ? '仅识别'
                      : item.category === 'trigger'
                        ? '触发风险'
                        : item.category === 'missing'
                          ? '信息缺失'
                          : '低风险';
                    const hoverBorderClass = isRecognition
                      ? 'hover:border-slate-300/80'
                      : item.category === 'trigger'
                        ? 'hover:border-risk-high/50'
                        : item.category === 'missing'
                          ? 'hover:border-risk-medium/50'
                          : 'hover:border-risk-low/50';
                    const ringClass = isRecognition
                      ? 'ring-slate-200/80'
                      : item.category === 'trigger'
                        ? 'ring-risk-high/20'
                        : item.category === 'missing'
                          ? 'ring-risk-medium/20'
                          : 'ring-risk-low/20';

                    return (
                      <div
                        key={item.id}
                        id={`risk-card-${item.id}`}
                        className={cn(
                          'border rounded-lg overflow-hidden transition-all duration-200 scroll-mt-24',
                          !isRecognition && item.ignored && 'opacity-[0.92] border-dashed border-surface-300 bg-surface-50/30',
                          isActive
                            ? `${categoryMeta.border} shadow-md ring-1 ${ringClass}`
                            : `border-surface-200 ${hoverBorderClass}`
                        )}
                      >
                        <div className={cn(categoryMeta.bg, 'p-3 border-b border-surface-100 flex items-start justify-between gap-2')}>
                          <div className="flex items-start gap-2 min-w-0">
                            <div className={cn('mt-0.5 p-1 rounded-full shrink-0', categoryMeta.bg, categoryMeta.text)}>{categoryMeta.icon}</div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold text-surface-900">{item.title}</h4>
                              <p className={cn('text-xs font-medium mt-0.5', categoryMeta.text)}>
                                {categoryLabel}：{item.summary}
                              </p>
                            </div>
                          </div>

                          {isRecognition ? (
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRecognitionFeedback(item.id, item.recognitionFeedback === 'up' ? null : 'up')
                                  }
                                  className={cn(
                                    'p-1.5 rounded-md border transition-colors',
                                    item.recognitionFeedback === 'up'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-white text-surface-500 border-surface-200 hover:bg-surface-50'
                                  )}
                                  title="赞"
                                >
                                  <ThumbsUp className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRecognitionFeedback(item.id, item.recognitionFeedback === 'down' ? null : 'down')
                                  }
                                  className={cn(
                                    'p-1.5 rounded-md border transition-colors',
                                    item.recognitionFeedback === 'down'
                                      ? 'bg-orange-50 text-orange-800 border-orange-200'
                                      : 'bg-white text-surface-500 border-surface-200 hover:bg-surface-50'
                                  )}
                                  title="踩"
                                >
                                  <ThumbsDown className="w-4 h-4" />
                                </button>
                              </div>
                              {item.recognitionFeedback === 'up' && (
                                <span className="text-[10px] text-blue-600 font-medium">已赞</span>
                              )}
                              {item.recognitionFeedback === 'down' && (
                                <span className="text-[10px] text-orange-700 font-medium">已踩</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2 shrink-0 justify-end">
                              <StructuredReviewStatusBadge
                                ignored={item.ignored}
                                isAccepted={item.isAccepted}
                                acceptedAfterEdit={item.acceptedAfterEdit}
                              />
                              <div className="flex flex-wrap items-center gap-1.5 justify-end">
                                {item.ignored ? (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelIgnore(item.id)}
                                    className={structuredActionBtn}
                                  >
                                    取消忽略
                                  </button>
                                ) : item.isAccepted ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleCancelAccept(item.id)}
                                      className={structuredActionBtn}
                                    >
                                      取消确认
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleIgnoreRisk(item.id)}
                                      className={structuredActionBtn}
                                    >
                                      忽略
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    {!isReviewDirty(item) && (
                                      <button
                                        type="button"
                                        onClick={() => handleAcceptRisk(item.id)}
                                        className={structuredPrimaryActionBtn}
                                      >
                                        采纳
                                      </button>
                                    )}
                                    {isReviewDirty(item) && (
                                      <button
                                        type="button"
                                        onClick={() => handleAcceptRisk(item.id)}
                                        className={structuredPrimaryActionBtn}
                                      >
                                        确认
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleIgnoreRisk(item.id)}
                                      className={structuredActionBtn}
                                    >
                                      忽略
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="p-3 bg-white space-y-4 border border-surface-200 rounded-lg shadow-sm">
                          {isRecognition && (
                            <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 leading-relaxed">
                              已提取识别结果供参考；<span className="font-semibold">不向 BPM 回传审核点结构化字段</span>。
                              主数据核对需人工进行。
                            </p>
                          )}

                          {!isRecognition && (
                            <>
                              <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                                审核结论
                              </div>
                              <textarea
                                value={getMergedConclusionText(item)}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setRiskItems((prev) =>
                                    prev.map((r) =>
                                      r.id === item.id ? { ...r, conclusion: v, details: '' } : r
                                    )
                                  );
                                }}
                                rows={4}
                                readOnly={item.isAccepted || item.ignored}
                                className={cn(
                                  'w-full rounded-lg bg-surface-50 px-3 py-2 text-sm text-surface-900 leading-relaxed border border-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 resize-y min-h-[88px]',
                                  (item.isAccepted || item.ignored) && 'bg-surface-100/80 cursor-not-allowed text-surface-600'
                                )}
                              />

                              <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                                结论原因
                              </div>
                              <div className="rounded-lg bg-surface-50 px-3 py-2 text-sm text-surface-500">
                                {(() => {
                                  const reasonMatch = item.reason.match(/第\d+条第\d+\.\d+款/);
                                  if (!reasonMatch) {
                                    return <span>{item.reason}</span>;
                                  }
                                  const [before, after] = item.reason.split(reasonMatch[0]);
                                  return (
                                    <span>
                                      {before}
                                      <button
                                        type="button"
                                        onClick={() => scrollToRisk(item.reasonLocationId || item.id)}
                                        className="text-primary-600 hover:text-primary-700 underline"
                                      >
                                        {reasonMatch[0]}
                                      </button>
                                      {after}
                                    </span>
                                  );
                                })()}
                              </div>
                            </>
                          )}

                          {isRecognition && item.recognitionClauses && item.recognitionClauses.length > 0 ? (
                            <div className="bg-slate-50/80 p-3 rounded-md border border-slate-200">
                              <h5 className="text-xs font-semibold text-slate-700 mb-3">识别结果</h5>
                              <ul className="space-y-4 list-none m-0 p-0">
                                {item.recognitionClauses.map((clause, cIdx) => {
                                  const prev = cIdx > 0 ? item.recognitionClauses![cIdx - 1] : undefined;
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
                                        <button
                                          type="button"
                                          onClick={() => scrollToRisk(clause.locationId)}
                                          className={cn(
                                            'font-medium text-primary-600 hover:text-primary-800 underline underline-offset-2 decoration-primary-400/80'
                                          )}
                                        >
                                          {clause.anchorLabel}
                                        </button>
                                        <span className="text-surface-800">「{clause.excerpt}」</span>
                                      </p>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ) : (
                            item.structuredFields.length > 0 && (
                              <div className="bg-surface-50 p-3 rounded-md border border-surface-200">
                                <h5 className="text-xs font-semibold text-surface-600 mb-2">评审要点提取</h5>
                                <div className="space-y-2">
                                  {item.structuredFields.map((field) => (
                                    <div key={field.id} className="flex flex-col gap-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-surface-500">{field.label}</span>
                                          {field.confirmed && (
                                            <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full border border-green-200">
                                              已确认
                                            </span>
                                          )}
                                        </div>
                                        {field.locationId ? (
                                          <button
                                            type="button"
                                            onClick={() => scrollToRisk(field.locationId!)}
                                            className="text-xs text-primary-600 hover:text-primary-700"
                                          >
                                            定位原文
                                          </button>
                                        ) : (
                                          <span className="text-[10px] text-surface-400">—</span>
                                        )}
                                      </div>
                                      <input
                                        value={field.value}
                                        readOnly={item.isAccepted || item.ignored}
                                        onChange={(e) => {
                                          setRiskItems((prev) =>
                                            prev.map((prevItem) =>
                                              prevItem.id === item.id
                                                ? {
                                                    ...prevItem,
                                                    structuredFields: prevItem.structuredFields.map((p) =>
                                                      p.id === field.id ? { ...p, value: e.target.value } : p
                                                    ),
                                                  }
                                                : prevItem
                                            )
                                          );
                                        }}
                                        className={cn(
                                          'w-full px-2 py-1 border border-surface-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20',
                                          (item.isAccepted || item.ignored) && 'bg-surface-100/80 text-surface-600 cursor-not-allowed'
                                        )}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
            </div>

            {/* 留出底部空间给固定的审核操作区 */}
            <div className={cn("transition-all duration-300", isOpinionExpanded ? "h-64" : "h-20")}></div>
          </div>

          {/* 底部固定区：审核意见填写与提交 */}
          <div className={cn(
            "absolute bottom-0 left-0 right-0 border-t transition-all duration-300 z-30 flex flex-col",
            isOpinionExpanded 
              ? "bg-white border-surface-200 shadow-[0_-4px_24px_rgba(0,0,0,0.05)]" 
              : opinionText.trim().length === 0
                ? "bg-orange-50 border-orange-200 shadow-[0_-8px_30px_rgba(249,115,22,0.15)] ring-1 ring-orange-500/20" // 未填写时强调改为橙色系
                : "bg-surface-800 border-surface-700 shadow-[0_-8px_30px_rgba(0,0,0,0.2)]" // 已填写时变为深色突出状态
          )}>
            {/* 意见区头部/收起状态 */}
            <div 
              className={cn(
                "px-5 py-3.5 flex items-center justify-between cursor-pointer select-none transition-colors",
                isOpinionExpanded ? "hover:bg-surface-50" : (opinionText.trim().length === 0 ? "hover:bg-orange-100" : "hover:bg-surface-700"),
                !isOpinionExpanded && "border-b-0"
              )}
              onClick={() => setIsOpinionExpanded(!isOpinionExpanded)}
            >
              <div className="flex items-center gap-3">
                <label className={cn(
                  "text-sm font-semibold cursor-pointer flex items-center",
                  isOpinionExpanded ? "text-surface-900" : (opinionText.trim().length === 0 ? "text-orange-800" : "text-white")
                )}>
                  审核意见<span className={cn("ml-1", isOpinionExpanded || opinionText.trim().length === 0 ? "text-risk-high" : "text-risk-high/80")}>*</span>
                </label>
                
                {!isOpinionExpanded && (
                  <div className={cn(
                    "flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors shadow-sm",
                    opinionText.trim().length > 0 
                      ? "bg-risk-low/20 text-risk-low border border-risk-low/20" 
                      : "bg-white text-orange-600 border border-orange-200"
                  )}>
                    {opinionText.trim().length === 0 && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                      </span>
                    )}
                    <span>{opinionText.trim().length > 0 ? "已填写，点击展开并提交" : "待填写意见"}</span>
                  </div>
                )}
              </div>
              <div className={cn(
                "flex items-center gap-2 text-xs font-medium",
                isOpinionExpanded ? "text-surface-400" : (opinionText.trim().length === 0 ? "text-orange-600" : "text-surface-300")
              )}>
                {!isOpinionExpanded && <span>点击展开</span>}
                <button className={cn(
                  "p-1 rounded-md transition-colors",
                  isOpinionExpanded 
                    ? "hover:text-surface-700 hover:bg-surface-100" 
                    : (opinionText.trim().length === 0 ? "bg-white/50 hover:bg-white" : "hover:bg-surface-600 text-white")
                )}>
                  {isOpinionExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 展开的意见输入与提交区 */}
            <div 
              className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out bg-white",
                isOpinionExpanded ? "max-h-[300px] opacity-100 px-5 pb-5" : "max-h-0 opacity-0 px-5 pb-0"
              )}
            >
              <textarea 
                className="w-full h-24 p-3 bg-surface-50 border border-surface-200 rounded-lg text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none transition-all"
                placeholder="请基于AI辅助信息，填写您的最终审核意见。此意见将提交至BPM系统..."
                value={opinionText}
                onChange={(e) => setOpinionText(e.target.value)}
              ></textarea>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-xs text-surface-500 leading-snug">被确认的评审要点信息将和评审意见一同提交</span>
                <button 
                  onClick={handleSubmit}
                  className={cn(
                    "px-6 py-2 text-white text-sm font-semibold rounded-lg shadow-md transition-colors active:scale-95 flex items-center gap-2",
                    opinionText.trim().length > 0 
                      ? "bg-surface-900 hover:bg-surface-800 shadow-surface-900/20" 
                      : "bg-surface-300 cursor-not-allowed shadow-none"
                  )}
                  disabled={opinionText.trim().length === 0}
                >
                  提交结论并返回
                </button>
              </div>
            </div>
          </div>

        </section>
      </main>
    </div>
  );
}

export default ReviewerPage;
