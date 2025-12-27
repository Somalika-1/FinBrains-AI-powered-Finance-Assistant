# Finance Insights Microservice (FastAPI)

Python FastAPI microservice for generating hybrid (rule-based + LLM) personal finance insights.

## Features
- POST /finance-insights accepts user financial data (JSON)
- Deterministic analysis (savings rate, expense ratio, DTI, emergency months)
- Risk flags (low savings, high DTI, low emergency fund, high lifestyle spending)
- Structured prompt for LLM, with OpenAI-compatible client
- Deterministic fallback if LLM not configured

## API
- POST /finance-insights
  - Request: FinanceInsightRequest (see below)
  - Response: FinanceInsightResponse
- GET /health

### Request schema (FinanceInsightRequest)
```
{
  "monthlyIncome": 85000,
  "monthlyExpensesByCategory": {"Housing": 25000, "Food": 10000, ...},
  "monthlySavings": 14000,
  "investments": [{"type": "Mutual Fund", "amount": 200000}],
  "liabilities": [{"name": "Home Loan", "monthlyEmi": 9000}],
  "goals": {"shortTerm": ["Vacation"], "longTerm": ["Retirement"]},
  "emergencyFundBalance": 60000
}
```

### Response schema (FinanceInsightResponse)
```
{
  "summary": "...",
  "insights": ["..."],
  "recommendations": ["..."],
  "impactScore": 0.8,
  "closing": "...",
  "metrics": {"savingsRatePct": 16.47, ...},
  "flags": ["Low savings rate (< 20%)"]
}
```

## Run locally
1. Python 3.10+
2. Install deps:
```
python -m venv .venv
. .venv/Scripts/activate  # Windows PowerShell: .venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
```
3. (Optional) Configure LLM:
```
setx OPENAI_API_KEY "YOUR_KEY"
setx OPENAI_MODEL "gpt-4o-mini"
# optionally: setx OPENAI_BASE_URL "https://api.openai.com/v1"
```
4. Start server:
```
uvicorn app.main:app --host 0.0.0.0 --port 8081 --reload
```

## Docker
```
docker build -t finance-insights:latest .
docker run -p 8081:8081 --env OPENAI_API_KEY=... finance-insights:latest
```

## Java integration (Spring Boot)
- Configure Python service URL, e.g., `FINANCE_INSIGHTS_URL=http://localhost:8081/finance-insights`
- From Java, POST the same request schema and forward the JSON response to the frontend.

Example using WebClient:
```java
WebClient client = WebClient.builder().baseUrl("http://localhost:8081").build();
Mono<Map> resp = client.post()
    .uri("/finance-insights")
    .contentType(MediaType.APPLICATION_JSON)
    .bodyValue(requestMap)
    .retrieve()
    .bodyToMono(Map.class);
```

## Notes
- No AI responses are hardcoded.
- If LLM is not configured, the service returns deterministic, rule-based insights.
