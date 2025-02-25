// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";

// Use JSDoc annotations for type safety
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
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  // Filter cart lines where the product has a metafield and fullfilled the min quantity
  const eligibleLines = input.cart.lines.filter(
    (line) => line.merchandise.product.hasAnyTag != false && line.merchandise.product.metafield != null
  ).filter((line) => line.quantity >= line.merchandise.product.metafield.jsonValue.quantity);

  if (!eligibleLines.length) {
    console.error("No cart lines qualify for volume discount.");
    return EMPTY_DISCOUNT;
  }

  // Generate discount objects
  const discounts = eligibleLines.map((line) => {
    const discountValue = line.merchandise.product.metafield.jsonValue?.discount;
    
    if (!discountValue || isNaN(discountValue)) {
      console.warn(`Invalid discount value for product ${line.merchandise.product.id}`);
      return null; // Skip invalid entries
    }

    return {
      targets: [
        {
          cartLine: {
            id: line.id,
          },
        },
      ],
      value: {
        percentage: {
          value: discountValue.toString(), // Ensure it's a string
        },
      },
      message: line.merchandise.product.metafield.jsonValue?.message
    };
  }).filter(Boolean); // Remove null values

  return {
    discounts,
    discountApplicationStrategy: DiscountApplicationStrategy.All,
  };
}