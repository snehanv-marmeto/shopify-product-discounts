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
  discountApplicationStrategy: DiscountApplicationStrategy.All, // Apply all valid discounts
  discounts: [],
};

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  // Validate the input structure
  if (!input || !input.cart || !Array.isArray(input.cart.lines)) {
    console.error("Invalid input structure");
    return EMPTY_DISCOUNT;
  }

  // Filter cart lines where the product has a metafield and is tagged
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

  // Generate discount objects
  const discounts = [];
  
  for (const line of eligibleLines) {
    try {
      const product = line.merchandise.product;
      const tiers = product.metafield.jsonValue;

      if (!Array.isArray(tiers) || tiers.length === 0) {
        console.warn(`Invalid discount tiers for product ${product.id}`);
        continue; // Skip invalid entries
      }

      // Find all applicable tiers first
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

      // Sort by discount value (descending) & take the highest
      if (applicableTiers.length === 0) {
        console.warn(`No applicable discount for product ${product.id}`);
        continue;
      }

      // Sort and get highest discount
      applicableTiers.sort((a, b) => b.discount - a.discount);
      const applicableTier = applicableTiers[0];

      console.log(`Applying ${applicableTier.discount}% discount to product ${product.id}`);

      discounts.push({
        targets: [{ cartLine: { id: line.id } }],
        value: { percentage: { value: applicableTier.discount.toString() } }, // Ensure it's a string
        message: applicableTier.message || `Discount applied: ${applicableTier.discount}%`,
      });
    } catch (error) {
      console.error(`Error processing line: ${error.message}`);
      // Continue processing other lines even if one fails
    }
  }

  console.log(`Total discounts being applied: ${discounts.length}`);

  return {
    discounts,
    discountApplicationStrategy: DiscountApplicationStrategy.All, // Apply all discounts
  };
}