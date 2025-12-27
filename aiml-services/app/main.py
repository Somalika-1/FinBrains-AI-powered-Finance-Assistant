from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

from .models import FinanceInsightRequest, FinanceInsightResponse, ErrorResponse, CategorizeRequest, CategorizeResponse
from .service import InsightService
from .categorizer import predict_category

app = FastAPI(title="Finance Insights Service", version="1.0.0")

# CORS (adjust origins in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_service = InsightService()


@app.post("/finance-insights", response_model=FinanceInsightResponse, responses={
    400: {"model": ErrorResponse},
    503: {"model": ErrorResponse}
})
async def finance_insights(req: FinanceInsightRequest):
    try:
        result = _service.generate(req.model_dump())
        return JSONResponse(content=result)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/categorize-expense", response_model=CategorizeResponse, responses={
    400: {"model": ErrorResponse}
})
async def categorize_expense(req: CategorizeRequest):
    try:
        name, conf, reason = predict_category(req.description, [
            {"name": c.name, "keywords": c.keywords} for c in (req.categories or [])
        ])
        if conf < 0.5 or not name:
            return JSONResponse(content={"predictedCategory": None, "confidence": 0.0, "reason": reason})
        return JSONResponse(content={"predictedCategory": name, "confidence": conf, "reason": reason})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
