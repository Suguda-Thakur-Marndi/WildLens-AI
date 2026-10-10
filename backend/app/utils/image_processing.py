import io

from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import settings
from app.core.exceptions import ImageValidationError


def validate_and_decode_image(
    image_bytes: bytes,
    max_bytes: int = settings.max_upload_size_bytes,
    min_dim: int = settings.min_image_dimension,
    max_dim: int = settings.max_image_dimension,
    thumbnail_max: int = settings.thumbnail_max_dimension
) -> Image.Image:
    """
    Validates and decodes raw image bytes into an RGB PIL Image.
    Protects against decompression bombs, truncated buffers, and malicious payloads.
    Normalizes EXIF orientation and ensures standard 3-channel RGB.
    """
    if not image_bytes:
        raise ImageValidationError("Empty image file provided.")

    if len(image_bytes) > max_bytes:
        size_mb = round(len(image_bytes) / (1024 * 1024), 2)
        limit_mb = round(max_bytes / (1024 * 1024), 2)
        raise ImageValidationError(
            f"Image file size ({size_mb} MB) exceeds maximum permitted limit of {limit_mb} MB."
        )

    try:
        # Pass 1: Verify header integrity without decoding pixel arrays
        stream = io.BytesIO(image_bytes)
        with Image.open(stream) as img:
            img.verify()

        # Pass 2: Re-open stream to unpack pixel buffer safely
        stream.seek(0)
        image = Image.open(stream)
        image.load()

        # Transpose based on EXIF orientation tag if present
        try:
            image = ImageOps.exif_transpose(image)
        except Exception:
            pass

        # Normalize to standard 3-channel RGB (handles RGBA, Palette, Grayscale)
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Validate bounding dimensions
        width, height = image.size
        if width < min_dim or height < min_dim:
            raise ImageValidationError(
                f"Image dimensions ({width}x{height}) are too small for biological feature identification."
            )

        if width > max_dim or height > max_dim:
            # Downsample excessive resolution to protect working memory
            image.thumbnail((thumbnail_max, thumbnail_max), Image.Resampling.LANCZOS)

        return image

    except (UnidentifiedImageError, OSError, SyntaxError) as e:
        raise ImageValidationError(f"Invalid or corrupted image format: {e}") from e
