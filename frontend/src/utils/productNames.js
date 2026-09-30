/**
 * Central Product Name catalog mapping and helper functions.
 * Ensures non-technical store managers and business users always see
 * human-readable item names (e.g. "Tata Salt 1kg") instead of raw SKU IDs (e.g. "12872").
 */

export const PRODUCT_NAME_MAP = {
  '12872': 'Tata Salt Vacuum Evaporated 1kg',
  '19512': 'Fortune Sunlite Refined Sunflower Oil 1L',
  '391306': 'Aashirvaad Superior MP Sharbati Atta 5kg',
  '3881': 'Amul Butter Pasteurised 500g',
  '445675': 'Maggi 2-Minute Instant Noodles 280g',
  '1': 'Dettol Original Liquid Handwash Refill 750ml',
  '476763': 'Surf Excel Easy Wash Detergent Powder 1kg',
  '483436': 'Colgate Strong Teeth Dental Cream 500g',
  '476825': 'Taj Mahal Tea 500g',
  '483438': 'Parle-G Gold Biscuits 1kg',
  'PROD-SMARTWATCH-ULTRA': 'Smartwatch Ultra (Fitness & Call)',
  'PROD-NOISE-ANC-HEADPHONES': 'Noise-Cancelling Wireless Headphones',
  'PROD-USB-C-FAST-CHARGER-65W': '65W Fast USB-C GaN Wall Charger',
  'PROD-WEBCAM-1080P-HD': '1080p HD Streaming Webcam with Mic',
  'PROD-WIRELESS-GAMING-MOUSE': 'Wireless Ergonomic Gaming Mouse',
  'PROD-MECHANICAL-KEYBOARD-RGB': 'RGB Mechanical Gaming Keyboard',
  'PROD-LAPTOP-STAND-ALUMINUM': 'Aluminum Ergonomic Laptop Stand',
  'PROD-PORTABLE-BLUETOOTH-SPKR': 'Portable Waterproof Bluetooth Speaker'
};

export function getProductName(productId, fallbackName = null) {
  if (!productId) return fallbackName || 'Unknown Product';
  const pid = String(productId).trim();
  
  // If a valid descriptive name is already provided (and not just equal to the id or placeholder)
  if (fallbackName && fallbackName !== pid && !fallbackName.startsWith('Product #')) {
    return fallbackName;
  }
  
  if (PRODUCT_NAME_MAP[pid]) {
    return PRODUCT_NAME_MAP[pid];
  }
  
  return fallbackName || `Product #${pid}`;
}
