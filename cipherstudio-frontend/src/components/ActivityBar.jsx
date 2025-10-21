import { Files, GitCompare, Settings, Search } from "lucide-react";

const ActivityBar = ({ active = "explorer", onChange }) => {
  const btn = (id, Icon, title, extra) => (
    <button
      className={`rounded p-2 hover:bg-slate-800/70 hover:text-slate-100 ${active === id ? "text-slate-100 bg-slate-800/60" : "text-slate-300"}`}
      title={title}
      onClick={() => onChange?.(id)}
    >
      <Icon size={16} />
      {extra}
    </button>
  );
  return (
    <nav className="flex w-11 flex-col items-center gap-3 border-r border-slate-800/60 bg-slate-950/90 py-3 text-slate-400">
      {btn("explorer", Files, "Explorer")}
      {btn("search", Search, "Search")}
      {btn("scm", GitCompare, "Source Control")}
      <div className="mt-auto" />
      {btn("settings", Settings, "Settings")}
    </nav>
  );
};

export default ActivityBar;
