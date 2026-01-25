/**
 * Класс для форматирования дат и временных интервалов
 * Следует принципу Single Responsibility - отвечает только за форматирование дат
 */
export class DateFormatter {
  /**
   * Форматирует длительность между двумя датами
   * @param openDate Дата открытия сделки
   * @param closeDate Дата закрытия сделки
   * @returns Форматированная строка длительности
   */
  formatDuration(openDate: string, closeDate: string): string {
    const open = new Date(openDate);
    const close = new Date(closeDate);
    const diff = close.getTime() - open.getTime();

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}д ${hours}ч`;
    if (hours > 0) return `${hours}ч ${minutes}м`;
    return `${minutes}м`;
  }

  /**
   * Форматирует дату в читаемый формат
   * @param dateStr Строка с датой
   * @returns Форматированная дата
   */
  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
