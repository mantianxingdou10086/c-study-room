/**
 * 题库汇总入口。加新章节时只改这里一行。
 */
import type { Exercise } from "@/lib/content/schema";
import { CHAPTER_01_EXERCISES } from "./ch01";
import { CHAPTER_02_EXERCISES } from "./ch02";
import { CHAPTER_03_EXERCISES } from "./ch03";
import { CHAPTER_04_EXERCISES } from "./ch04";
import { CHAPTER_05_EXERCISES } from "./ch05";
import { CHAPTER_06_EXERCISES } from "./ch06";
import { CHAPTER_07_EXERCISES } from "./ch07";
import { CHAPTER_08_EXERCISES } from "./ch08";
import { CHAPTER_09_EXERCISES } from "./ch09";
import { CHAPTER_10_EXERCISES } from "./ch10";

export const EXERCISES: Exercise[] = [
  ...CHAPTER_01_EXERCISES,
  ...CHAPTER_02_EXERCISES,
  ...CHAPTER_03_EXERCISES,
  ...CHAPTER_04_EXERCISES,
  ...CHAPTER_05_EXERCISES,
  ...CHAPTER_06_EXERCISES,
  ...CHAPTER_07_EXERCISES,
  ...CHAPTER_08_EXERCISES,
  ...CHAPTER_09_EXERCISES,
  ...CHAPTER_10_EXERCISES,
];

export const EXERCISE_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));
