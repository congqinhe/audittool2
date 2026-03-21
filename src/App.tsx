import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, FileText, AlertTriangle, CheckCircle2, Info, ArrowUpRight, Search, LayoutTemplate, ChevronUp, ChevronDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function App() {
  const [activeTab, setActiveTab] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [activeRiskId, setActiveRiskId] = useState<string | null>(null);
  
  // 审核意见相关状态
  const [opinionText, setOpinionText] = useState('');
  const [isOpinionExpanded, setIsOpinionExpanded] = useState(true);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);

  // 拖动侧边栏状态
  const [rightPanelWidth, setRightPanelWidth] = useState(480);
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
  
  return (
    <div className="flex flex-col h-screen bg-surface-50 overflow-hidden">
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
            <div className="flex gap-2">
              <button className="p-1.5 hover:bg-surface-100 rounded text-surface-600"><Search className="w-4 h-4" /></button>
              <button className="p-1.5 hover:bg-surface-100 rounded text-surface-600"><LayoutTemplate className="w-4 h-4" /></button>
            </div>
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

                <h3 className="font-bold mb-2 mt-6">第三条 交货方式与地点</h3>
                <div 
                  id="risk-1"
                  className={cn(
                  "p-2 rounded-md transition-all duration-300 border-2",
                  activeRiskId === 'risk-1' ? "bg-risk-high/10 border-risk-high shadow-[0_0_0_4px_rgba(239,68,68,0.2)]" : "border-transparent"
                )}>
                  <p className="indent-8">3.1 <span className={cn("font-medium", activeRiskId === 'risk-1' && "bg-risk-high/20")}>交货方式：卖方负责将设备交付至指定地点，并承担卸货费用。</span></p>
                  <p className="indent-8">3.2 交货地点：买方XX变电站项目现场。</p>
                </div>
                
                <h3 className="font-bold mb-2 mt-6">第四条 付款方式</h3>
                <div 
                  id="risk-3"
                  className={cn(
                  "p-2 rounded-md transition-all duration-300 border-2 mt-2",
                  activeRiskId === 'risk-3' ? "bg-risk-low/10 border-risk-low shadow-[0_0_0_4px_rgba(16,185,129,0.2)]" : "border-transparent"
                )}>
                  <p className="indent-8">4.1 预付款：合同签订后10个工作日内，买方支付合同总价的30%作为预付款。</p>
                  <p className="indent-8">4.2 发货款：设备生产完毕发货前，买方支付合同总价的30%。</p>
                  <p className="indent-8">4.3 到货款：设备到达现场并验收合格后，买方<span className={cn("font-medium", activeRiskId === 'risk-3' && "bg-risk-low/20")}>应通过电汇或6个月内到期的银行承兑汇票支付货款</span>（合同总价的30%）。</p>
                </div>

                {/* 因为展示滚动效果，增加一些占位的长文本让页面可滚动 */}
                <h3 className="font-bold mb-2 mt-6">第五条 违约责任</h3>
                <div className="p-2 border-2 border-transparent">
                  <p className="indent-8 mb-2">5.1 卖方未能按期交货的，每逾期一日，应向买方支付逾期交货部分货款的千分之五作为违约金。</p>
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

                {/* 模拟缺物质保期 - 删除左侧占位锚点 */}
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

        {/* 右侧区域：智能审核辅助与操作区 */}
        <section 
          className="bg-white flex flex-col shrink-0 shadow-[-4px_0_24px_-8px_rgba(0,0,0,0.05)] z-20 relative"
          style={{ width: rightPanelWidth }}
        >
          
          {/* Header */}
          <div className="p-5 border-b border-surface-100 shrink-0">
            <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-blue-600">智能审核辅助</span>
              <span className="text-xs font-normal px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full border border-primary-100">AI V1.3</span>
            </h2>
            <p className="text-sm text-surface-500 mt-1">已自动过滤与【财务部】相关的评审规则</p>
          </div>

          <div className="flex-1 overflow-y-auto relative" ref={rightScrollRef}>
            {/* 结构化提取信息 */}
            <div className="p-5 border-b border-surface-100">
              <h3 className="text-sm font-semibold text-surface-900 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-surface-400" />
                结构化关键要素
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="space-y-1">
                  <span className="text-xs text-surface-500">交货方式</span>
                  <p className="text-sm font-medium text-surface-900 bg-surface-50 px-2 py-1 rounded border border-surface-200">现场交货含卸货</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-surface-500">付款方式</span>
                  <p className="text-sm font-medium text-surface-900 bg-surface-50 px-2 py-1 rounded border border-surface-200">电汇/6月承兑</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-surface-500">质保期</span>
                  <p className="text-sm font-medium text-surface-400 bg-surface-50 px-2 py-1 rounded border border-surface-200 italic">未约定</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-surface-500">违约金比例</span>
                  <p className="text-sm font-medium text-surface-900 bg-surface-50 px-2 py-1 rounded border border-surface-200">未约定</p>
                </div>
              </div>
            </div>

            {/* 风险点列表 */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-surface-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-surface-400" />
                  规则评审结果
                </h3>
                
                {/* 风险概览 Pill */}
                <div className="flex items-center gap-1.5 text-xs font-medium bg-surface-100 p-1 rounded-full border border-surface-200">
                  <span className="px-2 py-0.5 bg-white text-risk-high rounded-full shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-risk-high"></span> 1
                  </span>
                  <span className="px-2 py-0.5 text-risk-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-risk-medium"></span> 1
                  </span>
                  <span className="px-2 py-0.5 text-risk-low flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-risk-low"></span> 1
                  </span>
                </div>
              </div>

              {/* 风险卡片列表 */}
              <div className="space-y-4">
                
                {/* 高风险 */}
                <div 
                  className={cn(
                    "border rounded-lg overflow-hidden transition-all duration-200",
                    activeRiskId === 'risk-1' ? "border-risk-high shadow-md ring-1 ring-risk-high/20" : "border-surface-200 hover:border-risk-high/50"
                  )}
                >
                  <div className="bg-risk-high/5 p-3 border-b border-surface-100 flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 p-1 bg-risk-high/10 rounded-full text-risk-high">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-surface-900">交货方式要求</h4>
                        <p className="text-xs font-medium text-risk-high mt-0.5">高风险：触发风险规则</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-white space-y-3">
                    <div className="text-sm text-surface-600 leading-relaxed">
                      合同约定交货方式为"卖方负责将设备交付至指定地点，并承担卸货费用"，不符合规则要求的"车板交货"或"主变基础交货"。
                    </div>
                    <div className="bg-surface-50 p-2.5 rounded-md border border-surface-200 relative group">
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => scrollToRisk('risk-1')}
                          className="flex items-center gap-1 text-xs font-medium text-primary-600 bg-white px-2 py-1 rounded shadow-sm border border-primary-100 hover:bg-primary-50"
                        >
                          <ArrowUpRight className="w-3 h-3" /> 定位
                        </button>
                      </div>
                      <p className="text-xs text-surface-500 font-mono leading-relaxed line-clamp-3">
                        "第3条 交货方式与地点 3.1 交货方式：卖方负责将设备交付至指定地点，并承担卸货费用。"
                      </p>
                    </div>
                  </div>
                </div>

                {/* 中风险 */}
                <div 
                  className={cn(
                    "border rounded-lg overflow-hidden transition-all duration-200",
                    activeRiskId === 'risk-2' ? "border-risk-medium shadow-md ring-1 ring-risk-medium/20" : "border-surface-200 hover:border-risk-medium/50"
                  )}
                >
                  <div className="bg-risk-medium/5 p-3 border-b border-surface-100 flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 p-1 bg-risk-medium/10 rounded-full text-risk-medium">
                        <Info className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-surface-900">质保期要求</h4>
                        <p className="text-xs font-medium text-risk-medium mt-0.5">中风险：无支持判断的条款要素</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-white space-y-3">
                    <div className="text-sm text-surface-600 leading-relaxed">
                      合同中未明确约定质保期条款，无法判断是否符合财务规则要求的"12个月"。
                    </div>
                    <div className="bg-surface-50 p-2.5 rounded-md border border-surface-200 flex items-center justify-between">
                      <p className="text-xs text-surface-400 italic">（合同中未找到相关条款，无法定位原文）</p>
                      {/* 移除标记全篇按钮，仅作为状态展示 */}
                    </div>
                  </div>
                </div>

                {/* 低风险 */}
                <div 
                  className={cn(
                    "border rounded-lg overflow-hidden transition-all duration-200",
                    activeRiskId === 'risk-3' ? "border-risk-low shadow-md ring-1 ring-risk-low/20" : "border-surface-200 hover:border-risk-low/50"
                  )}
                >
                  <div className="bg-risk-low/5 p-3 border-b border-surface-100 flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 p-1 bg-risk-low/10 rounded-full text-risk-low">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-surface-900">付款方式要求</h4>
                        <p className="text-xs font-medium text-risk-low mt-0.5">低风险：确认在规则要求内</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-white space-y-3">
                    <div className="text-sm text-surface-600 leading-relaxed">
                      合同约定付款方式为"电汇或6个月内银行承兑汇票"，符合规则要求的"转账/电汇/6月内汇票"。
                    </div>
                    <div className="bg-surface-50 p-2.5 rounded-md border border-surface-200 relative group">
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => scrollToRisk('risk-3')}
                          className="flex items-center gap-1 text-xs font-medium text-primary-600 bg-white px-2 py-1 rounded shadow-sm border border-primary-100 hover:bg-primary-50"
                        >
                          <ArrowUpRight className="w-3 h-3" /> 定位
                        </button>
                      </div>
                      <p className="text-xs text-surface-500 font-mono leading-relaxed line-clamp-3">
                        "...应通过电汇或6个月内到期的银行承兑汇票支付货款..."
                      </p>
                    </div>
                  </div>
                </div>

              </div>
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
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-surface-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 结构化字段将同步提交
                </span>
                <button 
                  className={cn(
                    "px-6 py-2 text-white text-sm font-semibold rounded-lg shadow-md transition-colors active:scale-95 flex items-center gap-2",
                    opinionText.trim().length > 0 
                      ? "bg-surface-900 hover:bg-surface-800 shadow-surface-900/20" 
                      : "bg-surface-300 cursor-not-allowed shadow-none"
                  )}
                  disabled={opinionText.trim().length === 0}
                >
                  提交结论并返回 BPM
                </button>
              </div>
            </div>
          </div>

        </section>
      </main>
    </div>
  );
}

export default App;
