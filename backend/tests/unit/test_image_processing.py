import io

import pytest
from PIL import Image

from app.core.exceptions import ImageValidationError
from app.utils.image_processing import validate_and_decode_image


def test_validate_and_decode_valid_image():
    # Create simple valid 100x100 RGB image
    img = Image.new("RGB", (100, 100), color=(34, 139, 34))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    data = buf.getvalue()

    decoded = validate_and_decode_image(data)
    assert decoded.size == (100, 100)
    assert decoded.mode == "RGB"

def test_validate_empty_image_raises_error():
    with pytest.raises(ImageValidationError) as exc:
        validate_and_decode_image(b"")
    assert "Empty image file" in str(exc.value)

def test_validate_corrupt_data_raises_error():
    with pytest.raises(ImageValidationError) as exc:
        validate_and_decode_image(b"CORRUPT_NOT_AN_IMAGE_HEADER")
    assert "Invalid or corrupted image format" in str(exc.value)

def test_validate_oversized_payload_raises_error():
    dummy_data = b"x" * 1024
    with pytest.raises(ImageValidationError) as exc:
        validate_and_decode_image(dummy_data, max_bytes=512)
    assert "exceeds maximum permitted limit" in str(exc.value)

def test_validate_degenerate_dimensions_raises_error():
    img = Image.new("RGB", (4, 4), color=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    data = buf.getvalue()

    with pytest.raises(ImageValidationError) as exc:
        validate_and_decode_image(data, min_dim=10)
    assert "dimensions" in str(exc.value) and "too small" in str(exc.value)
