import React, { useMemo, useState } from 'react';
import { INSPIRATION_CASES, InspirationCase } from '../data';

interface Props {
  onSelect: (prompt: string) => void;
}

const FILTERS = [
  '全部',
  '组织/社团/班级负责人',
  '线下实体门店',
  '电商平台搜索',
  '学校比赛/期末提案需求',
  '企业与机构',
];

const getDomainLabel = (category: string) => {
  if (!category) return '其他';
  if (category.includes('公司负责人') || category.includes('企业')) return '企业与机构';
  if (category.includes('校外商家') || category.includes('门店') || category.includes('商家')) return '线下实体门店';
  if (category.includes('电商')) return '电商平台搜索';
  if (category.includes('学校比赛') || category.includes('期末提案')) return '学校比赛/期末提案需求';
  if (category.includes('班级负责人') || category.includes('社团') || category.includes('组织')) return '组织/社团/班级负责人';
  return category;
};

const matchesFilter = (item: InspirationCase, filter: string) => {
  if (filter === '全部') return true;
  const domain = getDomainLabel(item.category);
  if (domain === filter) return true;
  return item.category.includes(filter);
};

const resolveImageUrl = (url: string) => {
  if (!url) return '';
  if (/^(https?:|data:)/.test(url)) return url;
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedUrl = url.replace(/^\//, '');
  return `${normalizedBase}${normalizedUrl}`;
};

const InspirationFlow: React.FC<Props> = ({ onSelect }) => {
  const [activeFilter, setActiveFilter] = useState('全部');
  const [selected, setSelected] = useState<InspirationCase | null>(null);
  const [copied, setCopied] = useState(false);

  const filteredCases = useMemo(
    () => INSPIRATION_CASES.filter((item) => matchesFilter(item, activeFilter)),
    [activeFilter]
  );

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-end px-2">
        <div>
          <h2 className="text-2xl font-bold italic">今日爆梗</h2>
          <p className="text-xs text-zinc-500 font-mono">灵感发现 · 实时案例</p>
        </div>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#0057FF] animate-pulse"></div>
          <span className="text-[10px] font-mono text-zinc-500">同步中</span>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`whitespace-nowrap px-4 py-2 rounded-full border text-xs font-bold transition-all ${
              activeFilter === filter
                ? 'bg-[#0057FF] text-white border-[#0057FF]'
                : 'border-black/10 text-zinc-600 hover:border-[#0057FF] hover:text-[#0057FF]'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="columns-2 gap-4 space-y-4">
        {filteredCases.map((card) => (
          <div
            key={card.id}
            className="group relative break-inside-avoid rounded-xl overflow-hidden glass border border-black/10 hover:border-[#0057FF]/40 transition-all duration-500 cursor-pointer"
            onClick={() => setSelected(card)}
          >
            <img
              src={resolveImageUrl(card.imageUrl)}
              alt={card.style}
              className="w-full grayscale-[20%] group-hover:grayscale-0 transition-all duration-700"
              loading="lazy"
              onError={(e) => {
                const target = e.currentTarget;
                const fallback = resolveImageUrl('/images/case-01.png');
                if (target.src !== fallback) {
                  target.src = fallback;
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
              <div className="text-white text-sm font-bold">{card.style || '未命名风格'}</div>
              <div className="flex flex-wrap gap-1 mt-2">
                {card.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-[10px] font-mono text-white/80 border border-white/20 rounded-full px-2 py-0.5">
                    #{tag}
                  </span>
                ))}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(card.promptJson || card.style || '灵感设计');
                }}
                className="mt-3 w-full py-2 bg-white text-black text-xs font-bold rounded flex items-center justify-center gap-2 hover:bg-[#0057FF] hover:text-white transition-colors"
              >
                应用此配方
              </button>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex flex-wrap gap-1">
                {card.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-[10px] font-mono text-zinc-500 border border-black/10 rounded-full px-2 py-0.5">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="text-[10px] font-mono text-zinc-500">
                {card.style || '未命名风格'}
              </div>
              <div className="text-[10px] font-mono text-zinc-500">
                领域：{getDomainLabel(card.category)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-black/10 px-4 py-3 flex justify-between items-center">
              <span className="font-bold">设计配方详情</span>
              <button onClick={() => setSelected(null)} className="text-sm text-zinc-500">关闭</button>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-black/10 overflow-hidden">
                <img
                  src={resolveImageUrl(selected.imageUrl)}
                  alt={selected.style}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    const fallback = resolveImageUrl('/images/case-01.png');
                    if (target.src !== fallback) {
                      target.src = fallback;
                    }
                  }}
                />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-zinc-500 font-mono">风格标签</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selected.tags.map((tag) => (
                      <span key={tag} className="text-[11px] font-mono text-zinc-600 border border-black/10 rounded-full px-3 py-1">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-zinc-500 font-mono">色彩方案</p>
                  <div className="mt-2 text-sm text-zinc-700 space-y-1">
                    <div>底色：{selected.colors.base || '—'}</div>
                    <div>印花色：{selected.colors.print || '—'}</div>
                    <div>辅助色：{selected.colors.aux || '—'}</div>
                    {selected.colors.raw && (
                      <div className="text-xs text-zinc-500">备注：{selected.colors.raw}</div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-zinc-500 font-mono">尺寸规范</p>
                  <ul className="mt-2 text-sm text-zinc-700 space-y-1 list-disc list-inside">
                    {selected.sizes.length ? selected.sizes.map((item) => (
                      <li key={item}>{item}</li>
                    )) : <li>暂无尺寸建议</li>}
                  </ul>
                </div>


                <button
                  onClick={() => {
                    onSelect(selected.promptJson || selected.style || '灵感设计');
                    setSelected(null);
                  }}
                  className="w-full py-3 bg-[#0057FF] text-white rounded-xl font-bold text-sm hover:bg-[#0046CC] transition-colors"
                >
                  应用此配方生成
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspirationFlow;
