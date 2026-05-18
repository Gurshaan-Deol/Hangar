"""Prompt templates for AI clothing analysis and outfit recommendations."""

CLOTHING_ANALYSIS_SYSTEM = (
    "You are a fashion expert AI. Analyze clothing images and extract "
    "structured data. Always respond with valid JSON only, no markdown, no explanation."
)

CLOTHING_ANALYSIS_USER = """\
Analyze this clothing item and return a JSON object with exactly these fields:
{
  "name": "descriptive name of the item",
  "category": "shirt, t-shirt, top, pants, jeans, shorts, dress, skirt, \
blazer, suit, jacket, coat, sweater, cardigan, hoodie, \
activewear, shoes, boots, heels, sneakers, sandals, \
hat, bag, accessory, other",
  "color": "primary color description",
  "style": "one of: casual, smart-casual, formal, workwear, athletic, loungewear",
  "season": ["array of applicable seasons from: spring, summer, fall, winter"],
  "tags": ["beach", "vacation", "relaxed", "street-style"],
  "confidence": 0.95
}
Each tag must be a single word or short hyphenated phrase — no commas inside a tag.
Return only the JSON object, nothing else."""

OLLAMA_ANALYSIS_SYSTEM = (
    "You are a clothing analyzer. Look at the image and identify the clothing item. "
    "Respond with a JSON object only. No explanation. No markdown."
)

OLLAMA_ANALYSIS_USER = """\
Analyze this clothing item. Return this exact JSON structure with no other text:
{
  "name": "item name here",
  "category": "shirt or pants or shorts or dress or skirt or jacket or coat or sweater or hoodie or shoes or boots or sneakers or sandals or bag or accessory or other",
  "color": "main color here",
  "style": "casual or formal or business or athletic or outdoor or streetwear or other",
  "season": ["spring", "summer", "fall", "winter"],
  "tags": ["tag1", "tag2"],
  "confidence": 0.8
}
Only return the JSON. Start your response with {\
"""

OUTFIT_RECOMMENDATION_SYSTEM = (
    "You are a personal stylist AI. Select clothing items that work well together "
    "for the given weather and occasion. Always respond with valid JSON only."
)

DUPLICATE_CHECK_SYSTEM = (
    "You are a wardrobe assistant. Identify duplicate or near-duplicate "
    "clothing items. Always respond with valid JSON only, no markdown."
)
