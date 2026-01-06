from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import auth, admin, projects, stands, reservations, sales, payments

app = FastAPI(title="Stands Portfolio Administration API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(stands.router, prefix="/api")
app.include_router(reservations.router, prefix="/api")
app.include_router(sales.router, prefix="/api")
app.include_router(payments.router, prefix="/api")


@app.get("/health")
async def healthcheck():
    return {"status": "ok"}
