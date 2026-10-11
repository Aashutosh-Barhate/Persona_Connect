# Persona-Connect

AI-based personality analysis and role-model recommendation system.

Analyzes user biodata/responses using OCEAN (Big Five) + MBTI, then recommends
relatable role models via hybrid similarity matching with explainable outputs.

## Tech Stack
- **Backend:** FastAPI + SQLAlchemy + SQLite
- **Frontend:** React + Vite + Tailwind CSS
- **ML:** scikit-learn (cosine similarity, PCA, MMR)

## Quick Start
```bash
# Backend
cd backend
pip install -r ../requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

## Phases
1. Data foundation (schema + seeded biographies)
2. Questionnaire & scoring (IPIP-50)
3. API & dashboard
4. Matching (trait-only baseline)
5. Explanations & diversity (MMR re-ranking)
6. Bayesian adaptive questioning
7. NLP, evaluation, deployment