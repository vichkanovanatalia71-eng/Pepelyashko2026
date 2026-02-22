interface Tab {
  id: string;
  label: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
}

/**
 * Уніфікована панель вкладок.
 * Використовується в Expenses, Taxes, Settings, NHSU тощо.
 */
export default function TabBar({ tabs, activeTab, onChange }: TabBarProps) {
  return (
    <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 -mb-1" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border whitespace-nowrap
                      focus-visible:outline-2 focus-visible:outline-accent-400
                      ${activeTab === tab.id
                        ? "bg-accent-500/15 text-accent-400 border-accent-500/30"
                        : "bg-dark-400/50 text-gray-400 border-dark-50/10 hover:text-white hover:bg-dark-300/50"
                      }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
