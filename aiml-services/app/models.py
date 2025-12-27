from typing import List, Dict, Optional
from pydantic import BaseModel, Field, field_validator


class Investment(BaseModel):
    type: str = Field(..., description="Investment type e.g., Mutual Fund, FD, Stocks")
    amount: float = Field(ge=0)


class Liability(BaseModel):
    name: str = Field(..., description="Liability name e.g., Home Loan, Credit Card")
    monthlyEmi: float = Field(ge=0)


class Goals(BaseModel):
    shortTerm: Optional[List[str]] = None
    longTerm: Optional[List[str]] = None


class FinanceInsightRequest(BaseModel):
    monthlyIncome: float = Field(ge=0)
    monthlyExpensesByCategory: Dict[str, float] = Field(default_factory=dict)
    monthlySavings: float = Field(ge=0)

    investments: Optional[List[Investment]] = None
    liabilities: Optional[List[Liability]] = None
    goals: Optional[Goals] = None

    emergencyFundBalance: Optional[float] = Field(default=0, ge=0)

    @field_validator("monthlyExpensesByCategory")
    def non_negative_expenses(cls, v: Dict[str, float]):
        for k, val in v.items():
            if val is None or val < 0:
                raise ValueError(f"Expense for category '{k}' must be >= 0")
        return v


class FinanceInsightResponse(BaseModel):
    summary: str
    insights: List[str]
    recommendations: List[str]
    impactScore: Optional[float] = None
    closing: str

    # transparency/debug (optional)
    metrics: Dict[str, float]
    flags: List[str]


class ErrorResponse(BaseModel):
    detail: str


class CategoryInput(BaseModel):
    name: str = Field(..., min_length=1)
    keywords: List[str] = Field(default_factory=list)


class CategorizeRequest(BaseModel):
    description: str = Field(..., min_length=1)
    amount: float = Field(..., ge=0)
    categories: List[CategoryInput] = Field(default_factory=list)


class CategorizeResponse(BaseModel):
    predictedCategory: Optional[str] = None
    confidence: float = 0.0
    reason: str = ""
