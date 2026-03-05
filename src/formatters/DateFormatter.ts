import type { ReportLanguage } from "../types/i18n.types";

/**
 * Date and duration formatter.
 * Follows Single Responsibility: only formatting concerns.
 */
export class DateFormatter {
  constructor(private readonly language: ReportLanguage = "en") {}

  private get locale(): string {
    return this.language === "ru" ? "ru-RU" : "en-US";
  }

  private get durationUnits(): { day: string; hour: string; minute: string } {
    if (this.language === "ru") {
      return { day: "д", hour: "ч", minute: "м" };
    }
    return { day: "d", hour: "h", minute: "m" };
  }

  /**
   * Formats duration between two timestamps.
   * @param openDate Trade open date
   * @param closeDate Trade close date
   * @returns Formatted duration string
   */
  formatDuration(openDate: string, closeDate: string): string {
    const open = new Date(openDate);
    const close = new Date(closeDate);
    const diff = close.getTime() - open.getTime();

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const unit = this.durationUnits;

    if (days > 0) return `${days}${unit.day} ${hours}${unit.hour}`;
    if (hours > 0) return `${hours}${unit.hour} ${minutes}${unit.minute}`;
    return `${minutes}${unit.minute}`;
  }

  /**
   * Formats a timestamp into a readable locale string.
   * @param dateStr Date string
   * @returns Formatted date
   */
  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString(this.locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}
