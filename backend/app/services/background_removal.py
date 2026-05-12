"""Background removal service — strips image backgrounds using rembg before AI analysis."""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def remove_background(image_path: str) -> str:
    """Remove the background from an image and save the result as a PNG.

    Runs synchronously (rembg is CPU-bound); call via asyncio.to_thread in async contexts.

    Returns the path to the cleaned image, or the original path if removal fails.
    """
    try:
        import rembg
        from PIL import Image

        src = Path(image_path)
        new_path = src.parent / (src.stem + "_nobg.png")

        with Image.open(src) as img:
            result_image = rembg.remove(img)

        result_image.save(new_path, format="PNG")
        logger.info("Background removed for %s → %s", image_path, new_path)
        return str(new_path)

    except Exception:
        logger.warning(
            "Background removal failed for %s — using original image", image_path, exc_info=True
        )
        return image_path
