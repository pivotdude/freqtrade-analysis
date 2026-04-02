import type { ReportDeliveryChannel } from "../types/report.types";

export class ResultWriter {
  async write(
    delivery: ReportDeliveryChannel,
    content: string,
    reportPath: string,
  ): Promise<void> {
    if (delivery === "file") {
      await Bun.write(reportPath, content);
      return;
    }

    const finalContent = content.endsWith("\n") ? content : `${content}\n`;
    process.stdout.write(finalContent);
  }
}

