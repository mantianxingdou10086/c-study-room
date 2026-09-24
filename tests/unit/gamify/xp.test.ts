import { describe, expect, it } from "vitest";
import {
  dayKey,
  daysBetween,
  earnedBadges,
  lessonXp,
  levelFromXp,
  nextStreak,
  xpForLevel,
  xpToNextLevel,
} from "@/lib/gamify/xp";

describe("经验值与等级", () => {
  it("动手课比概念课值钱", () => {
    expect(lessonXp("LAB")).toBeGreaterThan(lessonXp("READING"));
  });

  it("等级门槛是单调递增的", () => {
    for (let n = 1; n < 20; n++) {
      expect(xpForLevel(n + 1)).toBeGreaterThan(xpForLevel(n));
    }
    expect(xpForLevel(1)).toBe(0);
  });

  it("等级换算：刚好踩线时升级，差 1 点时不升级", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(49)).toBe(1);
    expect(levelFromXp(50)).toBe(2);
    expect(levelFromXp(149)).toBe(2);
    expect(levelFromXp(150)).toBe(3);
    expect(levelFromXp(500)).toBe(5);
  });

  it("离下一级的进度能对上", () => {
    const r = xpToNextLevel(100);
    expect(r.level).toBe(2);
    expect(r.current).toBe(50); // 100 - xpForLevel(2)=50
    expect(r.needed).toBe(100); // xpForLevel(3)-xpForLevel(2) = 150-50
  });
});

describe("自然日换算（固定 UTC+8）", () => {
  it("中国时间的跨零点不会被算成同一天", () => {
    // 北京时间 2026-09-24 07:30 = UTC 2026-09-23 23:30
    expect(dayKey(new Date("2026-09-23T23:30:00Z"))).toBe("2026-09-24");
    // 北京时间 2026-09-24 00:30 = UTC 2026-09-23 16:30
    expect(dayKey(new Date("2026-09-23T16:30:00Z"))).toBe("2026-09-24");
    // 北京时间 2026-09-23 23:30 = UTC 2026-09-23 15:30
    expect(dayKey(new Date("2026-09-23T15:30:00Z"))).toBe("2026-09-23");
  });

  it("日期间隔按自然日算", () => {
    expect(daysBetween("2026-09-23", "2026-09-24")).toBe(1);
    expect(daysBetween("2026-09-23", "2026-09-23")).toBe(0);
    expect(daysBetween("2026-09-01", "2026-09-23")).toBe(22);
  });
});

describe("连续打卡", () => {
  it("同一天重复学习不会重复累加（幂等）", () => {
    const r = nextStreak({
      lastActiveDate: "2026-09-24",
      todayKey: "2026-09-24",
      current: 5,
      best: 9,
    });
    expect(r.current).toBe(5);
    expect(r.isNewDay).toBe(false);
  });

  it("昨天学过 → 今天 +1", () => {
    const r = nextStreak({
      lastActiveDate: "2026-09-23",
      todayKey: "2026-09-24",
      current: 5,
      best: 9,
    });
    expect(r.current).toBe(6);
    expect(r.best).toBe(9);
  });

  it("断过一天就重置为 1", () => {
    const r = nextStreak({
      lastActiveDate: "2026-09-21",
      todayKey: "2026-09-24",
      current: 5,
      best: 9,
    });
    expect(r.current).toBe(1);
  });

  it("第一次学习 → 1", () => {
    const r = nextStreak({
      lastActiveDate: null,
      todayKey: "2026-09-24",
      current: 0,
      best: 0,
    });
    expect(r.current).toBe(1);
    expect(r.best).toBe(1);
  });

  it("刷新最长记录", () => {
    const r = nextStreak({
      lastActiveDate: "2026-09-23",
      todayKey: "2026-09-24",
      current: 9,
      best: 9,
    });
    expect(r.current).toBe(10);
    expect(r.best).toBe(10);
  });
});

describe("徽章", () => {
  it("完成第一节 → 拿到「开张」", () => {
    const codes = earnedBadges({
      lessonsDone: 1,
      chaptersFullyDone: [],
      streakCurrent: 1,
      xp: 10,
    });
    expect(codes).toContain("first-lesson");
    expect(codes).not.toContain("chapter-1-done");
  });

  it("第 1 章全部完成 → 拿到章节徽章", () => {
    const codes = earnedBadges({
      lessonsDone: 4,
      chaptersFullyDone: [1],
      streakCurrent: 1,
      xp: 60,
    });
    expect(codes).toContain("chapter-1-done");
  });

  it("连续 7 天会同时拿到 3 天和 7 天两个徽章", () => {
    const codes = earnedBadges({
      lessonsDone: 10,
      chaptersFullyDone: [1],
      streakCurrent: 7,
      xp: 600,
    });
    expect(codes).toContain("streak-3");
    expect(codes).toContain("streak-7");
    expect(codes).toContain("xp-500");
  });

  it("什么都没做时不给徽章", () => {
    expect(
      earnedBadges({ lessonsDone: 0, chaptersFullyDone: [], streakCurrent: 0, xp: 0 }),
    ).toEqual([]);
  });
});
