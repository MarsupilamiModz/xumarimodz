import { z } from "zod";
import { optionalTrim, safeStripePriceId, safeTrim } from "@/lib/text";

export {
  safeTrim,
  optionalTrim,
  nullableTrim,
  safeFormString,
  safeFormOptional,
  parseTags,
  parseLines,
  safeStripePriceId,
} from "@/lib/text";

export const zTrimmedString = z.preprocess(
  (v) => safeTrim(v),
  z.string()
);

export const zOptionalTrimmedString = z.preprocess(
  (v) => optionalTrim(v),
  z.string().optional()
);

export const zNullableStripePriceId = z.preprocess(
  (v) => safeStripePriceId(v),
  z
    .string()
    .regex(/^price_[a-zA-Z0-9]+$/, "Invalid Stripe Price ID (expected price_…)")
    .nullable()
);

export const zOptionalStripePriceId = z.preprocess(
  (v) => safeStripePriceId(v) ?? undefined,
  z
    .string()
    .regex(/^price_[a-zA-Z0-9]+$/, "Invalid Stripe Price ID (expected price_…)")
    .optional()
);
