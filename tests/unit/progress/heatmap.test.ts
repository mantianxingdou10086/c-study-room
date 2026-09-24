import { describe, expect, it } from "vitest";
import { buildHeatmapGrid } from "@/components/progress/study-heatmap";

/**
 * 热力图网格的回归测试。
 *
 * 这个函数被写错过一次：当时网格的最后一格是"本周周一"，导致**今天不在网格里** ——
 * 界面显示"0 天有学习记录"，而汇总 XP 却是对的（汇总走原始数据，不走网格），
 * 所以肉眼看不出是网格错了。这类"差一格"的错误只有单测能钉住。
 */
describe("buildHeatmapGrid", () => {
  it("格子数正好是 weeks × 7", () => {
    expect(buildHeatmapGrid("2026-09-24", 12)).toHaveLength(84);
    expect(buildHeatmapGrid("2026-09-24", 4)).toHaveLength(28);
  });

  it("**今天必须在网格里**，且不被标成未来", () => {
    // 周四
    const grid = buildHeatmapGrid("2026-09-24", 12);
    const today = grid.find((d) => d.key === "2026-09-24");
    expect(today, "今天不在网格里 —— 这正是当初那个 bug").toBeDefined();
    expect(today?.inFuture).toBe(false);
  });

  it("第一格是周一，最后一格是周日", () => {
    const grid = buildHeatmapGrid("2026-09-24", 12);
    // 2026-07-06 是周一，2026-09-27 是周日
    expect(grid[0].key).toBe("2026-07-06");
    expect(new Date(`${grid[0].key}T00:00:00.000Z`).getUTCDay()).toBe(1); // 周一
    expect(grid[grid.length - 1].key).toBe("2026-09-27");
    expect(new Date(`${grid[grid.length - 1].key}T00:00:00.000Z`).getUTCDay()).toBe(0); // 周日
  });

  it("日期连续、无重复", () => {
    const grid = buildHeatmapGrid("2026-09-24", 12);
    const keys = grid.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (let i = 1; i < keys.length; i++) {
      const prev = new Date(`${keys[i - 1]}T00:00:00.000Z`).getTime();
      const cur = new Date(`${keys[i]}T00:00:00.000Z`).getTime();
      expect(cur - prev).toBe(86_400_000);
    }
  });

  it("今天之后的格子标成未来（本周还没到的日子）", () => {
    // 2026-09-24 是周四 → 本周还剩周五、周六、周日三天
    const grid = buildHeatmapGrid("2026-09-24", 12);
    const future = grid.filter((d) => d.inFuture).map((d) => d.key);
    expect(future).toEqual(["2026-09-25", "2026-09-26", "2026-09-27"]);
  });

  it("刚好周日时，未来的格子数为 0", () => {
    const grid = buildHeatmapGrid("2026-09-27", 12);
    expect(grid.filter((d) => d.inFuture)).toHaveLength(0);
  });

  it("周一时的边界：今天在网格里，且后面 6 天是未来", () => {
    const grid = buildHeatmapGrid("2026-09-21", 12);
    expect(grid.find((d) => d.key === "2026-09-21")?.inFuture).toBe(false);
    expect(grid.filter((d) => d.inFuture)).toHaveLength(6);
  });
});
