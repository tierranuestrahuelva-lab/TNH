"""
Tierra Nuestra Huelva - LO MÁS PRO
Backend FastAPI for wine catalog search, cart, AI sales assistant.
"""
import os
import re
import uuid
import math
import json
import logging
import unicodedata
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

import jwt
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from pydantic import BaseModel, Field, ConfigDict
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware

from emergentintegrations.llm.chat import LlmChat, UserMessage


# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]
JWT_SECRET = os.environ["JWT_SECRET"]
CATALOG_XLSX = os.environ.get("CATALOG_XLSX", "/app/data/catalog.xlsx")
JWT_ALG = "HS256"
JWT_EXP_HOURS = 24 * 30  # 30 días

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("tnh")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer(auto_error=False)

app = FastAPI(title="TNH - Lo Más Pro", version="1.0.0")
api = APIRouter(prefix="/api")

# --------------------------------------------------------------------------- #
# Users (seed on startup)
# --------------------------------------------------------------------------- #
USERS_SEED = [
    {"username": "fernando", "password": "fernando2026", "display_name": "Fernando", "role": "commercial"},
    {"username": "ernesto", "password": "ernesto2026", "display_name": "Ernesto", "role": "commercial"},
    {"username": "tienda", "password": "tienda2026", "display_name": "Tienda", "role": "shop"},
]


def normalize(s: Optional[str]) -> str:
    if not s:
        return ""
    s = str(s)
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower().strip()


def make_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(tok: str) -> Optional[str]:
    try:
        data = jwt.decode(tok, JWT_SECRET, algorithms=[JWT_ALG])
        return data.get("sub")
    except Exception:
        return None


async def current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> Dict[str, Any]:
    if not creds:
        raise HTTPException(status_code=401, detail="No auth token")
    username = decode_token(creds.credentials)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"username": username}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# --------------------------------------------------------------------------- #
# Models
# --------------------------------------------------------------------------- #
class LoginIn(BaseModel):
    username: str
    password: str


class LoginOut(BaseModel):
    token: str
    user: Dict[str, Any]


class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    codigo: str
    nombre: str
    volumen: Optional[str] = None
    iva: float = 0.21
    pvp_tienda: float = 0.0
    pvp_horeca: float = 0.0
    pvp_asociado: float = 0.0
    pvp_sin_iva: float = 0.0
    tipo: str = ""
    categoria: str = ""  # tinto, blanco, rosado, espumoso, generoso, licor, otros
    bodega: Optional[str] = None
    denominacion: Optional[str] = None
    distribuidor: Optional[str] = None
    zona: Optional[str] = None
    variedades: Optional[str] = None
    pais: Optional[str] = None
    descuento: float = 0.0
    localizacion: Optional[str] = None
    abreviatura: Optional[str] = None
    imagen: Optional[str] = None
    search_text: str = ""  # precomputed normalized searchable text


class OrderItemIn(BaseModel):
    codigo: str
    nombre: str
    cantidad: int = 1
    precio_unitario: float
    tarifa: str = "PVP 5 (HORECA)"


class OrderIn(BaseModel):
    comercial: str
    cliente: str
    observaciones: Optional[str] = ""
    tarifa: str = "PVP 5 (HORECA)"
    items: List[OrderItemIn]


class AIMessageIn(BaseModel):
    session_id: Optional[str] = None
    message: str
    context_codigos: Optional[List[str]] = None  # opcional: products en el contexto


# --------------------------------------------------------------------------- #
# Catalog loading & categorization
# --------------------------------------------------------------------------- #
TIPO_TO_CATEGORIA = {
    "tinto 0meses joven/mc": "tinto",
    "tinto 3-9meses roble/barrica": "tinto",
    "tinto =<12meses crianza (24m)": "tinto",
    "tinto >12meses reserva (36m)": "tinto",
    "tinto dulce": "tinto",
    "blanco crianza-fb": "blanco",
    "blanco dulce natural/v. tardía": "blanco",
    "blanco joven seco": "blanco",
    "rosado": "rosado",
    "espumoso": "espumoso",
    "generosos/encabezados": "generoso",
    "brandy": "licor",
    "cognac (francia)": "licor",
    "ginebras": "licor",
    "licor-spirits-alta graduación": "licor",
    "ron": "licor",
    "vodka": "licor",
    "whiskey bourbons/tennessee": "licor",
    "whisky blend/mezclado": "licor",
    "whisky blended reserva": "licor",
    "whisky malta puro": "licor",
    "sidras": "otros",
    "sin alcohol 0,0%": "otros",
}


def categorize(tipo: str) -> str:
    t = normalize(tipo)
    if t in TIPO_TO_CATEGORIA:
        return TIPO_TO_CATEGORIA[t]
    if "tinto" in t:
        return "tinto"
    if "blanco" in t:
        return "blanco"
    if "rosado" in t:
        return "rosado"
    if "espumo" in t or "cava" in t or "champagne" in t:
        return "espumoso"
    if "generoso" in t or "encabezado" in t or "jerez" in t:
        return "generoso"
    if any(k in t for k in ["brandy", "licor", "spirit", "cognac", "ginebra", "ron", "vodka", "whisky", "whiskey"]):
        return "licor"
    return "otros"


def safe_float(v) -> float:
    try:
        if v is None or (isinstance(v, float) and math.isnan(v)):
            return 0.0
        return float(v)
    except Exception:
        return 0.0


def safe_str(v) -> Optional[str]:
    if v is None:
        return None
    if isinstance(v, float) and math.isnan(v):
        return None
    s = str(v).strip()
    return s if s else None


def split_variedades(s: Optional[str]) -> List[str]:
    if not s:
        return []
    parts = re.split(r"[,/;]| y | e ", s, flags=re.IGNORECASE)
    return [p.strip() for p in parts if p.strip()]


async def load_catalog_if_needed():
    count = await db.products.count_documents({})
    if count > 0:
        logger.info(f"Catalog already loaded: {count} products")
        return
    if not os.path.exists(CATALOG_XLSX):
        logger.warning(f"No catalog file found at {CATALOG_XLSX}")
        return
    logger.info(f"Loading catalog from {CATALOG_XLSX}...")
    df = pd.read_excel(CATALOG_XLSX, sheet_name=0)
    df.columns = [c.strip() for c in df.columns]
    docs = []
    for _, row in df.iterrows():
        codigo = str(row.get("CÓDIGO", "")).strip()
        if not codigo:
            continue
        tipo = safe_str(row.get("TIPOS")) or ""
        nombre = safe_str(row.get("NOMBRE")) or ""
        bodega = safe_str(row.get("BODEGAS"))
        denominacion = safe_str(row.get("DENOMINACIONES"))
        distribuidor = safe_str(row.get("DISTRIBUIDOR"))
        zona = safe_str(row.get("ZONAS"))
        variedades = safe_str(row.get("VARIEDADES"))
        pais = safe_str(row.get("PAIS"))
        volumen_raw = row.get("VOLUMEN")
        if isinstance(volumen_raw, (int, float)) and not (isinstance(volumen_raw, float) and math.isnan(volumen_raw)):
            volumen = f"{float(volumen_raw):g}L"
        else:
            volumen = safe_str(volumen_raw)
        abreviatura = safe_str(row.get("ABREV."))
        imagen = safe_str(row.get("IMAGEN"))
        localizacion = safe_str(row.get("LOCALIZACION"))

        search_parts = [nombre, bodega, denominacion, zona, variedades, pais, tipo, codigo, abreviatura]
        search_text = normalize(" ".join([p for p in search_parts if p]))

        doc = {
            "codigo": codigo,
            "nombre": nombre,
            "volumen": volumen,
            "iva": safe_float(row.get("% IVA")),
            "pvp_tienda": safe_float(row.get("PVP 1 (TIENDA)")),
            "pvp_horeca": safe_float(row.get("PVP 5 (HORECA)")),
            "pvp_asociado": safe_float(row.get("PVP 4 (ASOCIADO)")),
            "pvp_sin_iva": safe_float(row.get("PVP 6 (SIN IVA)")),
            "tipo": tipo,
            "categoria": categorize(tipo),
            "bodega": bodega,
            "denominacion": denominacion,
            "distribuidor": distribuidor,
            "zona": zona,
            "variedades": variedades,
            "variedades_list": split_variedades(variedades),
            "pais": pais,
            "descuento": safe_float(row.get("DESCUENTO %")),
            "localizacion": localizacion,
            "abreviatura": abreviatura,
            "imagen": imagen,
            "search_text": search_text,
        }
        docs.append(doc)

    if docs:
        await db.products.insert_many(docs)
        await db.products.create_index("codigo", unique=True)
        await db.products.create_index("categoria")
        await db.products.create_index("tipo")
        await db.products.create_index("denominacion")
        await db.products.create_index("zona")
        await db.products.create_index("pais")
        await db.products.create_index("search_text")
        logger.info(f"Loaded {len(docs)} products")


async def seed_users():
    for u in USERS_SEED:
        existing = await db.users.find_one({"username": u["username"]})
        if existing:
            continue
        await db.users.insert_one(
            {
                "id": str(uuid.uuid4()),
                "username": u["username"],
                "display_name": u["display_name"],
                "role": u["role"],
                "password_hash": pwd_ctx.hash(u["password"]),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        logger.info(f"Seeded user {u['username']}")


@app.on_event("startup")
async def on_startup():
    await seed_users()
    await load_catalog_if_needed()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# --------------------------------------------------------------------------- #
# Auth
# --------------------------------------------------------------------------- #
@api.post("/auth/login", response_model=LoginOut)
async def login(body: LoginIn):
    user = await db.users.find_one({"username": body.username.lower().strip()})
    if not user or not pwd_ctx.verify(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    token = make_token(user["username"])
    return LoginOut(
        token=token,
        user={
            "id": user["id"],
            "username": user["username"],
            "display_name": user["display_name"],
            "role": user["role"],
        },
    )


@api.get("/auth/me")
async def me(user: Dict[str, Any] = Depends(current_user)):
    return user


# --------------------------------------------------------------------------- #
# Products
# --------------------------------------------------------------------------- #
PROJECTION = {"_id": 0, "search_text": 0}


def _distinct_pipeline(field: str):
    return [
        {"$match": {field: {"$nin": [None, ""]}}},
        {"$group": {"_id": f"${field}", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 200},
    ]


@api.get("/products/filters")
async def get_filters(user: Dict[str, Any] = Depends(current_user)):
    """Return distinct filter values + price range for UI selects."""
    out = {}
    for field in ["tipo", "denominacion", "zona", "pais", "bodega", "distribuidor", "categoria"]:
        rows = await db.products.aggregate(_distinct_pipeline(field)).to_list(500)
        out[field] = [{"value": r["_id"], "count": r["count"]} for r in rows]

    # variedades — from variedades_list array
    var_rows = await db.products.aggregate(
        [
            {"$unwind": "$variedades_list"},
            {"$group": {"_id": "$variedades_list", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 200},
        ]
    ).to_list(500)
    out["variedades"] = [{"value": r["_id"], "count": r["count"]} for r in var_rows]

    # price range
    mn = await db.products.find_one({"pvp_tienda": {"$gt": 0}}, {"pvp_tienda": 1, "_id": 0}, sort=[("pvp_tienda", 1)])
    mx = await db.products.find_one({"pvp_tienda": {"$gt": 0}}, {"pvp_tienda": 1, "_id": 0}, sort=[("pvp_tienda", -1)])
    out["price_min"] = float(mn["pvp_tienda"]) if mn else 0.0
    out["price_max"] = float(mx["pvp_tienda"]) if mx else 1000.0

    out["total"] = await db.products.count_documents({})
    return out


@api.get("/products")
async def list_products(
    q: Optional[str] = None,
    categoria: Optional[str] = None,  # comma-separated: tinto,blanco,...
    tipo: Optional[str] = None,
    denominacion: Optional[str] = None,
    zona: Optional[str] = None,
    pais: Optional[str] = None,
    bodega: Optional[str] = None,
    distribuidor: Optional[str] = None,
    variedad: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: str = "nombre",  # nombre | price_asc | price_desc
    page: int = 1,
    per_page: int = 30,
    user: Dict[str, Any] = Depends(current_user),
):
    flt: Dict[str, Any] = {}
    if q:
        norm = normalize(q)
        flt["search_text"] = {"$regex": re.escape(norm)}
    if categoria:
        cats = [c.strip() for c in categoria.split(",") if c.strip()]
        if cats:
            flt["categoria"] = {"$in": cats}
    if tipo:
        flt["tipo"] = tipo
    if denominacion:
        flt["denominacion"] = denominacion
    if zona:
        flt["zona"] = zona
    if pais:
        flt["pais"] = pais
    if bodega:
        flt["bodega"] = bodega
    if distribuidor:
        flt["distribuidor"] = distribuidor
    if variedad:
        flt["variedades_list"] = variedad
    if min_price is not None:
        flt.setdefault("pvp_tienda", {})["$gte"] = min_price
    if max_price is not None:
        flt.setdefault("pvp_tienda", {})["$lte"] = max_price

    sort_map = {
        "nombre": [("nombre", 1)],
        "price_asc": [("pvp_tienda", 1)],
        "price_desc": [("pvp_tienda", -1)],
        "bodega": [("bodega", 1)],
    }
    sort_list = sort_map.get(sort, [("nombre", 1)])
    skip = max(0, (page - 1) * per_page)
    per_page = max(1, min(per_page, 120))

    total = await db.products.count_documents(flt)
    cursor = db.products.find(flt, PROJECTION).sort(sort_list).skip(skip).limit(per_page)
    items = await cursor.to_list(per_page)
    return {"total": total, "page": page, "per_page": per_page, "items": items}


@api.get("/products/stats")
async def stats(user: Dict[str, Any] = Depends(current_user)):
    by_cat = await db.products.aggregate(
        [{"$group": {"_id": "$categoria", "count": {"$sum": 1}, "avg_price": {"$avg": "$pvp_tienda"}}}]
    ).to_list(50)
    by_denom = await db.products.aggregate(
        [
            {"$match": {"denominacion": {"$nin": [None, ""]}}},
            {"$group": {"_id": "$denominacion", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10},
        ]
    ).to_list(20)
    by_pais = await db.products.aggregate(
        [
            {"$match": {"pais": {"$nin": [None, ""]}}},
            {"$group": {"_id": "$pais", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10},
        ]
    ).to_list(20)
    price_buckets = await db.products.aggregate(
        [
            {"$match": {"pvp_tienda": {"$gt": 0}}},
            {
                "$bucket": {
                    "groupBy": "$pvp_tienda",
                    "boundaries": [0, 5, 10, 20, 30, 50, 100, 200, 10000],
                    "default": "other",
                    "output": {"count": {"$sum": 1}},
                }
            },
        ]
    ).to_list(20)
    total = await db.products.count_documents({})
    return {
        "total": total,
        "by_categoria": [{"categoria": r["_id"] or "sin categoría", "count": r["count"], "avg_price": round(r.get("avg_price") or 0, 2)} for r in by_cat],
        "by_denominacion": [{"denominacion": r["_id"], "count": r["count"]} for r in by_denom],
        "by_pais": [{"pais": r["_id"], "count": r["count"]} for r in by_pais],
        "price_buckets": [{"range": str(r["_id"]), "count": r["count"]} for r in price_buckets],
    }


@api.get("/products/barcode/{code}")
async def barcode(code: str, user: Dict[str, Any] = Depends(current_user)):
    """Find product by exact code then fuzzy search."""
    code = code.strip()
    exact = await db.products.find_one({"codigo": code}, PROJECTION)
    if exact:
        return {"match_type": "exact", "product": exact, "alternatives": []}
    norm = normalize(code)
    cursor = db.products.find({"search_text": {"$regex": re.escape(norm)}}, PROJECTION).limit(10)
    alts = await cursor.to_list(10)
    if alts:
        return {"match_type": "fuzzy", "product": alts[0], "alternatives": alts[1:]}
    return {"match_type": "none", "product": None, "alternatives": []}


@api.get("/products/{codigo}")
async def get_product(codigo: str, user: Dict[str, Any] = Depends(current_user)):
    p = await db.products.find_one({"codigo": codigo}, PROJECTION)
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return p


# --------------------------------------------------------------------------- #
# Orders
# --------------------------------------------------------------------------- #
@api.post("/orders")
async def create_order(body: OrderIn, user: Dict[str, Any] = Depends(current_user)):
    total = sum(i.cantidad * i.precio_unitario for i in body.items)
    order_id = str(uuid.uuid4())
    doc = {
        "id": order_id,
        "comercial": body.comercial,
        "cliente": body.cliente,
        "observaciones": body.observaciones or "",
        "tarifa": body.tarifa,
        "items": [i.model_dump() for i in body.items],
        "total": round(total, 2),
        "created_by": user["username"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/orders")
async def list_orders(
    mine: bool = True,
    limit: int = 50,
    user: Dict[str, Any] = Depends(current_user),
):
    flt: Dict[str, Any] = {}
    if mine:
        flt["created_by"] = user["username"]
    cursor = db.orders.find(flt, {"_id": 0}).sort("created_at", -1).limit(limit)
    items = await cursor.to_list(limit)
    return {"items": items, "total": len(items)}


@api.get("/orders/{order_id}")
async def get_order(order_id: str, user: Dict[str, Any] = Depends(current_user)):
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return o


# --------------------------------------------------------------------------- #
# AI Assistant (Claude Sonnet 4.5)
# --------------------------------------------------------------------------- #
AI_SYSTEM = """Eres "Sumiller IA", el asistente comercial de Tierra Nuestra Huelva (TNH), una distribuidora profesional de vinos y destilados en Huelva, Andalucía.

Tu misión: potenciar las ventas del equipo comercial (Fernando, Ernesto y la Tienda).

REGLAS:
1. Responde SIEMPRE en español (tono profesional, cercano y andaluz sin ser caricaturesco).
2. Cuando el comercial te dé un vino que NO está en nuestro catálogo, recomiéndale las 3-5 alternativas MÁS CERCANAS que SÍ tenemos (usando el contexto de catálogo que te paso).
3. Cuando te pregunten sobre un vino del catálogo, genera argumentos de venta potentes: maridajes concretos, notas de cata sugeridas, historia de la bodega, tipo de cliente ideal, ocasión de consumo.
4. Incluye SIEMPRE referencias cruzadas a vinos nuestros (por nombre y bodega).
5. Sé concreto y accionable: frases cortas, bullets, datos útiles. Evita la paja.
6. Si no tienes datos suficientes, pídelos al comercial en una sola pregunta.
7. Cuando propongas alternativas, indica código, nombre, bodega, denominación y precio HORECA.
8. Nunca inventes vinos: si no está en el contexto, dilo.
"""


async def build_catalog_context(codigos: Optional[List[str]], max_items: int = 25) -> str:
    """Build a textual snapshot of products to feed the LLM."""
    if codigos:
        cursor = db.products.find({"codigo": {"$in": codigos}}, PROJECTION).limit(max_items)
    else:
        # sample of bestsellers-ish: just sample across categories
        cursor = db.products.aggregate([{"$sample": {"size": max_items}}])
    items = await cursor.to_list(max_items)
    lines = []
    for p in items:
        lines.append(
            f"- [{p.get('codigo')}] {p.get('nombre')} | Bodega: {p.get('bodega') or '—'} | "
            f"DO: {p.get('denominacion') or '—'} | Zona: {p.get('zona') or '—'} | "
            f"Variedades: {p.get('variedades') or '—'} | Tipo: {p.get('tipo') or '—'} | "
            f"PVP HORECA: {p.get('pvp_horeca')}€"
        )
    return "\n".join(lines)


@api.post("/ai/chat")
async def ai_chat(body: AIMessageIn, user: Dict[str, Any] = Depends(current_user)):
    session_id = body.session_id or str(uuid.uuid4())

    # Build catalog context
    catalog_ctx = await build_catalog_context(body.context_codigos, max_items=25)

    # Load last turns of conversation history (bounded) and inline them in the system message
    # Avoids O(N) replay LLM calls and stays within token budget.
    history = await db.ai_messages.find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    last_turns = history[-12:]  # last 12 messages (~6 turns)
    history_block = ""
    if last_turns:
        lines = []
        for h in last_turns:
            role = "Comercial" if h["role"] == "user" else "Sumiller IA"
            lines.append(f"{role}: {h['content']}")
        history_block = "\n\n--- HISTORIAL RECIENTE DE LA CONVERSACIÓN ---\n" + "\n".join(lines)

    system_with_ctx = (
        AI_SYSTEM
        + "\n\n--- CONTEXTO DEL CATÁLOGO (muestra de productos de TNH) ---\n"
        + catalog_ctx
        + history_block
    )

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_with_ctx,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    try:
        reply = await chat.send_message(UserMessage(text=body.message))
    except Exception as e:
        logger.exception("AI error")
        # Sanitize error message for client
        detail = str(e)
        if "budget" in detail.lower():
            detail = "El servicio de IA está temporalmente saturado. Reintenta en unos segundos."
        else:
            detail = "No se pudo contactar con el Sumiller IA. Reintenta."
        raise HTTPException(status_code=503, detail=detail)

    now = datetime.now(timezone.utc).isoformat()
    await db.ai_messages.insert_many(
        [
            {
                "session_id": session_id,
                "role": "user",
                "content": body.message,
                "created_at": now,
                "username": user["username"],
            },
            {
                "session_id": session_id,
                "role": "assistant",
                "content": reply,
                "created_at": now,
                "username": user["username"],
            },
        ]
    )

    return {"session_id": session_id, "reply": reply}


@api.get("/ai/sessions/{session_id}")
async def ai_history(session_id: str, user: Dict[str, Any] = Depends(current_user)):
    msgs = await db.ai_messages.find(
        {"session_id": session_id, "username": user["username"]}, {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    return {"session_id": session_id, "messages": msgs}


@api.get("/ai/sessions")
async def ai_sessions(user: Dict[str, Any] = Depends(current_user)):
    rows = await db.ai_messages.aggregate(
        [
            {"$match": {"username": user["username"]}},
            {
                "$group": {
                    "_id": "$session_id",
                    "last": {"$max": "$created_at"},
                    "first_msg": {"$first": "$content"},
                }
            },
            {"$sort": {"last": -1}},
            {"$limit": 20},
        ]
    ).to_list(20)
    return {
        "sessions": [
            {"session_id": r["_id"], "last": r["last"], "preview": (r.get("first_msg") or "")[:80]} for r in rows
        ]
    }


# --------------------------------------------------------------------------- #
# Root
# --------------------------------------------------------------------------- #
@api.get("/")
async def root():
    return {"app": "TNH — Lo Más Pro", "version": "1.0.0"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
