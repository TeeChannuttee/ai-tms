# AI-TMS Development Guide

## Getting Started

### Prerequisites
- Docker Desktop 20.10+
- Node.js 20+
- Go 1.21+
- Python 3.11+
- Git

### Initial Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd ai-tms
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. **Start services**
```bash
docker-compose up -d
```

## Development Workflow

### Backend (Go)

**Run locally:**
```bash
cd backend
go mod download
go run cmd/server/main.go
```

**Run tests:**
```bash
go test ./...
```

**Add new endpoint:**
1. Define handler in `internal/handlers/`
2. Register route in `internal/routes/routes.go`
3. Add middleware if needed
4. Update API documentation

### AI Service (Python)

**Run locally:**
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload
```

**Train models:**
```bash
python scripts/train_all_models.py
```

**Add new model:**
1. Create model class in `models/`
2. Add endpoint in `main.py`
3. Update Pydantic models
4. Train and save model

### Frontend (Next.js)

**Run Planner UI:**
```bash
cd planner-ui
npm install
npm run dev
```

**Run Driver App:**
```bash
cd driver-app
npm install
npm run dev
```

**Build for production:**
```bash
npm run build
npm start
```

## Code Style

### Go
- Follow [Effective Go](https://golang.org/doc/effective_go.html)
- Use `gofmt` for formatting
- Run `golint` before committing

### Python
- Follow PEP 8
- Use `black` for formatting
- Type hints required
- Docstrings for all functions

### TypeScript/React
- Use functional components
- TypeScript strict mode
- ESLint + Prettier
- Meaningful component names

## Testing

### Backend Tests
```bash
cd backend
go test ./... -v -cover
```

### AI Service Tests
```bash
cd ai-service
pytest tests/ -v --cov
```

### Frontend Tests
```bash
cd planner-ui
npm test
```

## Database

### Migrations

**Create migration:**
```bash
# Migrations are auto-generated from models
# Edit backend/internal/models/models.go
# Run: go run cmd/server/main.go
```

**Reset database:**
```bash
docker-compose down -v
docker-compose up -d postgres
```

### Seed Data
```bash
cd backend
go run cmd/seed/main.go
```

## API Development

### Adding New Endpoint

1. **Define model** (if needed)
```go
// backend/internal/models/mymodel.go
type MyModel struct {
    ID   uuid.UUID `gorm:"type:uuid;primary_key"`
    Name string    `gorm:"not null"`
}
```

2. **Create handler**
```go
// backend/internal/handlers/myhandler.go
func GetMyModel(c *gin.Context) {
    // Implementation
}
```

3. **Register route**
```go
// backend/internal/routes/routes.go
router.GET("/mymodel/:id", handlers.GetMyModel)
```

4. **Update docs**
```markdown
// docs/API.md
#### GET /api/v1/mymodel/:id
...
```

## ML Model Development

### Training New Model

1. **Prepare data**
```python
# Load historical data
df = pd.read_csv('data/historical/deliveries.csv')
```

2. **Feature engineering**
```python
# Create features
X = create_features(df)
y = df['target']
```

3. **Train model**
```python
model = LGBMRegressor()
model.fit(X_train, y_train)
```

4. **Save model**
```python
joblib.dump(model, 'models/saved/my_model.pkl')
```

5. **Create predictor class**
```python
# ai-service/models/my_predictor.py
class MyPredictor:
    def __init__(self):
        self.model = joblib.load('models/saved/my_model.pkl')
    
    def predict(self, features):
        return self.model.predict(features)
```

6. **Add endpoint**
```python
# ai-service/main.py
@app.post("/api/v1/my-prediction")
async def my_prediction(request: MyRequest):
    result = my_predictor.predict(request.dict())
    return {"prediction": result}
```

## Debugging

### Backend Debugging
```bash
# Enable debug mode
export GIN_MODE=debug
go run cmd/server/main.go
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f ai-service
```

### Database Debugging
```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U aitms -d aitms

# Common queries
SELECT * FROM users;
SELECT * FROM routes WHERE status = 'active';
```

### Redis Debugging
```bash
# Connect to Redis
docker-compose exec redis redis-cli

# Common commands
KEYS *
GET gps:VEH_001
SUBSCRIBE gps_updates
```

## Performance Optimization

### Backend
- Use database indexes
- Implement caching with Redis
- Use connection pooling
- Optimize queries (avoid N+1)

### Frontend
- Lazy load components
- Optimize images
- Use React.memo for expensive components
- Implement virtual scrolling for long lists

### AI Service
- Batch predictions
- Model caching
- Use async endpoints
- Optimize feature computation

## Deployment

### Build Docker Images
```bash
docker-compose build
```

### Deploy to Production
```bash
# Using deployment script
./scripts/deploy.sh

# Or manually
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables

**Required:**
- `DATABASE_URL`
- `REDIS_HOST`
- `JWT_SECRET`
- `GOOGLE_MAPS_API_KEY`

**Optional:**
- `OPENAI_API_KEY` (for AI Copilot)
- `SENTRY_DSN` (for error tracking)

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Find process using port
lsof -i :8080
# Kill process
kill -9 <PID>
```

**Database connection error:**
```bash
# Check if PostgreSQL is running
docker-compose ps postgres
# Restart PostgreSQL
docker-compose restart postgres
```

**Module not found (Go):**
```bash
cd backend
go mod tidy
go mod download
```

**Package not found (Python):**
```bash
cd ai-service
pip install -r requirements.txt --force-reinstall
```

## Best Practices

### Git Workflow
1. Create feature branch from `develop`
2. Make changes
3. Write tests
4. Run linters
5. Create pull request
6. Code review
7. Merge to `develop`

### Commit Messages
```
feat: Add ETA prediction endpoint
fix: Fix GPS tracking bug
docs: Update API documentation
test: Add unit tests for route planning
refactor: Optimize database queries
```

### Code Review Checklist
- [ ] Tests pass
- [ ] Code follows style guide
- [ ] Documentation updated
- [ ] No console.log or debug prints
- [ ] Error handling implemented
- [ ] Security considerations addressed

## Resources

- [Go Documentation](https://golang.org/doc/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Documentation](https://docs.docker.com/)
