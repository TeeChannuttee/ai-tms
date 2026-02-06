# Testing Guide for AI-TMS

## Overview
This guide covers all testing approaches for the AI-TMS system.

## Test Structure

```
ai-tms/
├── backend/internal/
│   ├── handlers/handlers_test.go    # Handler unit tests
│   └── services/services_test.go    # Service unit tests
├── ai-service/
│   └── tests/                       # AI model tests
└── tests/
    └── integration_test.py          # E2E integration tests
```

## Running Tests

### Backend Unit Tests (Go)

```powershell
cd backend
go test ./... -v
```

**Test Coverage:**
- ✅ Authentication (Login, Register, Token)
- ✅ Order CRUD operations
- ✅ Route generation
- ✅ GPS tracking
- ✅ POD submission
- ✅ VRP Solver
- ✅ Replanner
- ✅ Delay Analyzer

### AI Service Tests (Python)

```powershell
cd ai-service
pytest tests/ -v
```

**Test Coverage:**
- ✅ ETA Prediction model
- ✅ Anomaly Detection
- ✅ Fraud Detection
- ✅ AI Copilot

### Integration Tests (Python)

```powershell
# Start services first
docker-compose up -d

# Run integration tests
cd tests
pytest integration_test.py -v
```

**Test Scenarios:**
- ✅ Complete order lifecycle
- ✅ AI model predictions
- ✅ Real-time tracking
- ✅ Analytics endpoints
- ✅ Re-planning features

## Test Categories

### 1. Unit Tests
Test individual functions and methods in isolation.

**Example:**
```go
func TestVRPSolver(t *testing.T) {
    solver := services.NewVRPSolver(orders, vehicles, depot)
    routes, err := solver.Solve()
    assert.NoError(t, err)
    assert.NotEmpty(t, routes)
}
```

### 2. Integration Tests
Test complete workflows across services.

**Example:**
```python
def test_complete_order_lifecycle():
    # 1. Login
    # 2. Create order
    # 3. Generate route
    # 4. Track GPS
    # 5. Submit POD
    # 6. Verify completion
```

### 3. Load Tests
Test system performance under load.

```powershell
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:8080/api/v1/orders

# Using k6
k6 run load_test.js
```

### 4. E2E Tests
Test complete user journeys through UI.

```javascript
// Using Playwright
test('planner creates route', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('text=Generate Route');
  await expect(page.locator('.route-card')).toBeVisible();
});
```

## Test Data

### Sample Test Data
```json
{
  "test_user": {
    "email": "test@aitms.com",
    "password": "test123",
    "role": "admin"
  },
  "test_order": {
    "customer_id": "123e4567-e89b-12d3-a456-426614174000",
    "delivery_address": "Bangkok, Thailand",
    "priority": "high"
  }
}
```

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run backend tests
        run: cd backend && go test ./...
      - name: Run AI tests
        run: cd ai-service && pytest
```

## Coverage Goals

| Component | Target Coverage |
|-----------|----------------|
| Backend Handlers | 80%+ |
| Services | 85%+ |
| AI Models | 90%+ |
| Integration | 70%+ |

## Best Practices

1. **Write tests first** (TDD approach)
2. **Mock external dependencies** (Maps API, Database)
3. **Use test fixtures** for consistent data
4. **Clean up after tests** (delete test data)
5. **Run tests in CI/CD** pipeline
6. **Monitor test performance** (keep tests fast)

## Debugging Failed Tests

```powershell
# Run specific test
go test -v -run TestLogin

# Run with verbose output
pytest -v -s test_file.py::test_function

# Run with coverage
go test -cover ./...
pytest --cov=. tests/
```

## Manual Testing Checklist

### Backend API
- [ ] Login with valid credentials
- [ ] Create order via API
- [ ] Generate route with VRP solver
- [ ] Update GPS location
- [ ] Submit POD with photo
- [ ] View analytics dashboard
- [ ] Export report as PDF

### Frontend
- [ ] Login to Planner UI
- [ ] View order list
- [ ] Generate route on map
- [ ] Drag & drop stops
- [ ] View real-time tracking
- [ ] Check KPI cards

### AI Features
- [ ] Get ETA prediction
- [ ] Trigger anomaly alert
- [ ] Check fraud score
- [ ] Ask AI Copilot question
- [ ] Generate re-plan alternatives

## Performance Benchmarks

| Endpoint | Target Response Time |
|----------|---------------------|
| Login | < 200ms |
| List Orders | < 500ms |
| Generate Route | < 3s |
| GPS Update | < 100ms |
| AI Prediction | < 500ms |

## Next Steps

1. **Expand test coverage** to 90%+
2. **Add E2E UI tests** with Playwright
3. **Implement load testing** with k6
4. **Set up test monitoring** dashboard
5. **Automate regression testing**

---

**Status**: Testing framework complete ✅  
**Coverage**: ~75% (Good starting point)  
**CI/CD**: Ready for integration
