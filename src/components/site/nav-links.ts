export type NavItem = {
  href: string;
  label: string;
  hint: string;
};

/** 一级导航：顺序即学习动线（学 → 练 → 问 → 看进度） */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "首页", hint: "从这里开始" },
  { href: "/learn", label: "课程", hint: "28 章循序渐进" },
  { href: "/exercises", label: "题库", hint: "做题检验" },
  { href: "/playground", label: "练习场", hint: "随手写点 C" },
  { href: "/forum", label: "论坛", hint: "问与答" },
  { href: "/progress", label: "我的进度", hint: "存档与成就" },
];
