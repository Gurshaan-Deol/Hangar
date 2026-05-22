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
    "You are a professional personal stylist. Select clothing items that work together "
    "cohesively for the given weather and occasion. Always respond with valid JSON only, "
    "no markdown, no explanation outside the JSON."
)


def occasion_guidance(occasion: str) -> str:
    guides = {
        "casual": (
            "Casual means relaxed and comfortable. Prioritise items tagged: "
            "casual, weekend, everyday, relaxed, comfortable. "
            "Avoid anything formal, business, or dressy. "
            "Jeans, t-shirts, hoodies, sneakers are ideal."
        ),
        "work": (
            "Work means office-appropriate and polished. Prioritise items tagged: "
            "office, business, smart, professional, work. "
            "Avoid overly casual items like hoodies, ripped jeans, or athletic wear. "
            "Blazers, dress shirts, trousers, smart shoes are ideal."
        ),
        "formal": (
            "Formal means dressed up for a special occasion. Prioritise items tagged: "
            "formal, elegant, dressy, evening, special. "
            "Only include the most elevated items in the wardrobe. "
            "Suits, dresses, dress shoes are ideal. No sneakers, no casualwear."
        ),
        "outdoor": (
            "Outdoor means practical and weather-resistant. Prioritise items tagged: "
            "outdoor, hiking, sport, athletic, functional. "
            "Prioritise layering, comfort, and weather protection. "
            "Avoid anything delicate, formal, or impractical for movement."
        ),
        "date": (
            "Date night means stylish but not overdressed. Prioritise items tagged: "
            "date, evening, smart-casual, going-out. "
            "Aim for put-together and intentional — more effort than casual "
            "but not as stiff as formal. Dark jeans, nice tops, boots or clean sneakers work well."
        ),
    }
    return guides.get(occasion.lower(), "")


def build_recommendation_prompt(
    weather: dict,
    occasion: str,
    wardrobe_items: list[dict],
    recent_outfits: list[dict],
    locked_item_ids: list[str],
    user_instruction: str | None,
) -> str:
    """Build the user-turn prompt for outfit recommendation.

    Annotates each wardrobe item as LOCKED (must include) or recently worn
    (avoid if possible) based on the supplied lists, then instructs the AI
    to return a JSON object with item_ids, reasoning, and a style_tip.
    """
    recently_worn_ids = {
        item_id
        for outfit in recent_outfits
        for item_id in outfit["item_ids"]
    }

    items_text = "\n".join([
        "- ID:{id} | {name} | {category} | {color} | {style} | seasons:{seasons} | tags:{tags}{locked}{worn}".format(
            id=item["id"],
            name=item["name"],
            category=item["category"],
            color=item["color"],
            style=item["style"],
            seasons=",".join(item["season"]),
            tags=",".join(item["tags"]),
            locked=" [LOCKED - must include]" if item["id"] in locked_item_ids else "",
            worn=" [worn recently - avoid if possible]" if item["id"] in recently_worn_ids else "",
        )
        for item in wardrobe_items
    ])

    locked_note = (
        f"The user has locked these item IDs and they MUST appear in the outfit: {locked_item_ids}."
        if locked_item_ids else ""
    )

    instruction_note = (
        f'The user has a specific instruction for today: "{user_instruction}". Follow it.'
        if user_instruction else ""
    )

    return f"""You are a professional stylist. Select a complete, cohesive outfit from the wardrobe below.

WEATHER: {weather["temperature"]}°C, feels like {weather["feels_like"]}°C, condition: {weather["condition"]}, humidity: {weather["humidity"]}%
OCCASION: {occasion}
{occasion_guidance(occasion)}
{locked_note}
{instruction_note}

RULES:
1. Select exactly one item per category needed for a complete outfit (top, bottom or dress, shoes, and optionally outerwear/accessory)
2. Items must work together in color, style, and formality — no clashing combinations
3. Choose weather-appropriate items (temperature, rain, etc.)
4. Avoid items marked [worn recently] unless there is no suitable alternative
5. LOCKED items must be included — build the rest of the outfit around them
6. Follow any user instruction above strictly

WARDROBE:
{items_text}

Respond ONLY with this JSON:
{{
  "item_ids": ["id1", "id2", "id3"],
  "reasoning": "2-3 sentences explaining why this outfit works: the color story, why it suits the weather and occasion, and any specific styling note",
  "style_tip": "One concrete tip on how to wear or accessorize this outfit"
}}"""

DUPLICATE_CHECK_SYSTEM = (
    "You are a wardrobe assistant. Identify duplicate or near-duplicate "
    "clothing items. Always respond with valid JSON only, no markdown."
)
