from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse


class WildLensError(Exception):
    """Base domain exception for WildLens AI."""
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message

class ImageValidationError(WildLensError):
    """Raised when an uploaded image fails validation (corrupt, oversized, invalid format)."""
    pass

class ModelNotReadyError(WildLensError):
    """Raised when an inference request is received before the model is loaded."""
    pass

class InferenceExecutionError(WildLensError):
    """Raised when an unexpected error occurs during tensor forward pass."""
    pass

def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ImageValidationError)
    async def image_validation_handler(request: Request, exc: ImageValidationError):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": exc.message, "error_type": "ImageValidationError"}
        )

    @app.exception_handler(ModelNotReadyError)
    async def model_not_ready_handler(request: Request, exc: ModelNotReadyError):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": exc.message, "error_type": "ModelNotReadyError"}
        )

    @app.exception_handler(InferenceExecutionError)
    async def inference_error_handler(request: Request, exc: InferenceExecutionError):
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": exc.message, "error_type": "InferenceExecutionError"}
        )
