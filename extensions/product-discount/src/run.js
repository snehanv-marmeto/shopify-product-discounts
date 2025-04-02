// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 * @typedef {import("../generated/api").Target} Target
 * @typedef {import("../generated/api").ProductVariant} ProductVariant
 */

/**
 * @type {FunctionRunResult}
 */
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.All, 
  discounts: [],
};

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  if (!input || !input.cart || !Array.isArray(input.cart.lines)) {
    console.error("Invalid input structure");
    return EMPTY_DISCOUNT;
  }

  const eligibleLines = input.cart.lines.filter((line) => {
    const product = line.merchandise?.product;
    return product && 
           Boolean(product.hasAnyTag) && 
           product.metafield && 
           product.metafield.jsonValue &&
           Array.isArray(product.metafield.jsonValue);
  });

  if (!eligibleLines.length) {
    console.error("No cart lines qualify for volume discount.");
    return EMPTY_DISCOUNT;
  }

  console.log(`Eligible products found: ${eligibleLines.length}`);

  const discounts = [];
  
  for (const line of eligibleLines) {
    try {
      const product = line.merchandise.product;
      const tiers = product.metafield.jsonValue;

      if (!Array.isArray(tiers) || tiers.length === 0) {
        console.warn(`Invalid discount tiers for product ${product.id}`);
        continue; 
      }

      const applicableTiers = [];
      for (const tier of tiers) {
        if (
          tier && 
          typeof tier === "object" && 
          tier.quantity && 
          typeof tier.quantity === "number" &&
          tier.discount && 
          typeof tier.discount === "number" &&
          line.quantity >= tier.quantity
        ) {
          applicableTiers.push(tier);
        }
      }

      if (applicableTiers.length === 0) {
        console.warn(`No applicable discount for product ${product.id}`);
        continue;
      }

      applicableTiers.sort((a, b) => b.discount - a.discount);
      const applicableTier = applicableTiers[0];

      console.log(`Applying ${applicableTier.discount}% discount to product ${product.id}`);

      discounts.push({
        targets: [{ cartLine: { id: line.id } }],
        value: { percentage: { value: applicableTier.discount.toString() } }, 
        message: applicableTier.message || `Discount applied: ${applicableTier.discount}%`,
      });
    } catch (error) {
      console.error(`Error processing line: ${error.message}`);
    }
  }

  console.log(`Total discounts being applied: ${discounts.length}`);

  return {
    discounts,
    discountApplicationStrategy: DiscountApplicationStrategy.All,
  };
}