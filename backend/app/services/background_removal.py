"""Background removal service — strips image backgrounds using rembg before AI analysis."""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def remove_background(image_path: str) -> str:
    """Remove the background from an image and save the result as a transparent PNG.

    Runs synchronously (rembg is CPU-bound); call via asyncio.to_thread in async contexts.

    Returns the path to the cleaned image, or the original path if removal fails.
    """
    try:
        import rembg

        src = Path(image_path)
        new_path = src.parent / (src.stem + "_nobg.png")

        # Pass raw bytes so rembg returns raw PNG bytes — this guarantees the alpha
        # channel is preserved. Passing a PIL Image can cause white compositing in
        # some rembg versions before the result is returned.
        output_bytes = rembg.remove(src.read_bytes())
        new_path.write_bytes(output_bytes)

        logger.info("Background removed for %s → %s", image_path, new_path)
        return str(new_path)

    except Exception:
        logger.warning(
            "Background removal failed for %s — using original image", image_path, exc_info=True
        )
        return image_path
