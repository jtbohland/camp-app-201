import type { ApiRegistry } from "../../../server/apis/index.js";

type Output<K extends keyof ApiRegistry> = ApiRegistry[K] extends { outputSchema: { _output: infer O } } ? O : never;

/** Response of the GetCamperReportCard / GetManagerReportCard APIs (same shape). */
export type ReportCardData = Output<"GetCamperReportCard">;
